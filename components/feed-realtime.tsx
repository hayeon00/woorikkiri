"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type FeedRealtimeProps = {
    groupId: number;
};

export function FeedRealtime({
                                 groupId,
                             }: FeedRealtimeProps) {
    const router = useRouter();

    useEffect(() => {
        const supabase =
            createClient();

        let channel:
            | ReturnType<
            typeof supabase.channel
        >
            | null = null;

        let refreshTimer:
            | ReturnType<
            typeof setTimeout
        >
            | null = null;

        let cancelled = false;

        // ========================================
        // 피드 새로고침
        //
        // 짧은 시간에 여러 Realtime 이벤트가 와도
        // 한 번만 refresh
        // ========================================

        const refreshFeed = () => {
            if (refreshTimer) {
                clearTimeout(
                    refreshTimer
                );
            }

            refreshTimer =
                setTimeout(() => {
                    if (
                        !cancelled
                    ) {
                        router.refresh();
                    }
                }, 80);
        };

        async function startRealtime() {
            const {
                data: {
                    session,
                },
                error,
            } =
                await supabase.auth.getSession();

            if (
                cancelled ||
                error ||
                !session?.access_token
            ) {
                return;
            }

            await supabase.realtime.setAuth(
                session.access_token
            );

            if (cancelled) {
                return;
            }

            channel =
                supabase
                    .channel(
                        `feed-realtime-${groupId}`
                    )

                    // ========================================
                    // 현재 그룹 게시물
                    // ========================================

                    .on(
                        "postgres_changes",
                        {
                            event: "*",
                            schema:
                                "public",
                            table:
                                "posts",
                            filter:
                                `group_id=eq.${groupId}`,
                        },
                        refreshFeed
                    )

                    // ========================================
                    // 댓글
                    // ========================================

                    .on(
                        "postgres_changes",
                        {
                            event: "*",
                            schema:
                                "public",
                            table:
                                "comments",
                        },
                        refreshFeed
                    )

                    // ========================================
                    // 좋아요
                    // ========================================

                    .on(
                        "postgres_changes",
                        {
                            event: "*",
                            schema:
                                "public",
                            table:
                                "likes",
                        },
                        refreshFeed
                    )

                    // notifications는 제거
                    //
                    // 알림 생성/삭제 때문에
                    // 현재 피드 전체를 다시
                    // 가져올 필요가 없음

                    .subscribe(
                        (
                            status
                        ) => {
                            if (
                                status ===
                                "CHANNEL_ERROR"
                            ) {
                                console.error(
                                    "[Realtime] 채널 연결 오류"
                                );
                            }
                        }
                    );
        }

        void startRealtime();

        return () => {
            cancelled =
                true;

            if (
                refreshTimer
            ) {
                clearTimeout(
                    refreshTimer
                );
            }

            if (channel) {
                void supabase.removeChannel(
                    channel
                );
            }
        };
    }, [
        groupId,
        router,
    ]);

    return null;
}