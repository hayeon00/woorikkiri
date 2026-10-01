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
                    filter: `group_id=eq.${groupId}`,
                },
                () => {
                    router.refresh();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(
                channel
            );
        };
    }, [groupId, router]);

    return null;
}