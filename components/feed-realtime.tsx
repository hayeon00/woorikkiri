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
        const supabase = createClient();

        let channel: ReturnType<
            typeof supabase.channel
        > | null = null;

        let refreshTimer:
            | ReturnType<typeof setTimeout>
            | null = null;

        const refreshFeed = () => {
            if (refreshTimer) {
                clearTimeout(refreshTimer);
            }

            refreshTimer = setTimeout(() => {
                router.refresh();
            }, 150);
        };

        async function startRealtime() {
            const {
                data: { session },
                error,
            } = await supabase.auth.getSession();

            if (error || !session?.access_token) {
                console.error(
                    "[Realtime] 세션을 가져오지 못했습니다.",
                    error
                );
                return;
            }

            await supabase.realtime.setAuth(
                session.access_token
            );

            channel = supabase
                .channel(
                    `feed-realtime-${groupId}`
                )

                // 게시글
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "posts",
                    },
                    refreshFeed
                )

                // 댓글
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "comments",
                    },
                    refreshFeed
                )

                // 좋아요
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "likes",
                    },
                    refreshFeed
                )

                // 알림
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "notifications",
                    },
                    refreshFeed
                )

                .subscribe((status) => {
                    if (
                        status ===
                        "CHANNEL_ERROR"
                    ) {
                        console.error(
                            "[Realtime] 채널 연결 오류"
                        );
                    }
                });
        }

        startRealtime();

        return () => {
            if (refreshTimer) {
                clearTimeout(refreshTimer);
            }

            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [groupId, router]);

    return null;
}