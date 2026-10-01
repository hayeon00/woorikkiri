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

        console.log(
            "[Realtime] 시작",
            groupId
        );

        const channel = supabase
            .channel(
                `feed-realtime-${groupId}`
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "posts",
                },
                (payload) => {
                    console.log(
                        "[Realtime] 게시글 변경 감지",
                        payload
                    );

                    router.refresh();
                }
            )
            .subscribe((status) => {
                console.log(
                    "[Realtime] 상태:",
                    status
                );
            });

        return () => {
            console.log(
                "[Realtime] 종료"
            );

            supabase.removeChannel(
                channel
            );
        };
    }, [groupId, router]);

    return null;
}