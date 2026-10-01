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

        let cancelled = false;

        const refreshFeed = () => {
            if (refreshTimer) {
                clearTimeout(refreshTimer);
            }

            refreshTimer = setTimeout(() => {
                if (!cancelled) {
                    router.refresh();
                }
            }, 200);
        };

        async function startRealtime() {
            const {
                data: { session },
                error,
            } = await supabase.auth.getSession();

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

            channel = supabase
                .channel(
                    `feed-realtime-${groupId}`
                )

                // 현재 그룹의 게시물만
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "posts",
                        filter: `group_id=eq.${groupId}`,
                    },
                    refreshFeed
                )

                // comments / likes는 post_id만 있어서
                // RLS가 허용한 변경을 받은 뒤 갱신
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "comments",
                    },
                    refreshFeed
                )

                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "likes",
                    },
                    refreshFeed
                )

                // 로그인 사용자에게 허용된 알림 변경
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
                    if (status === "CHANNEL_ERROR") {
                        console.error(
                            "[Realtime] 채널 연결 오류"
                        );
                    }
                });
        }

        startRealtime();

        return () => {
            cancelled = true;

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