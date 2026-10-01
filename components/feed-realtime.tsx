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

        let channel: ReturnType<typeof supabase.channel> | null = null;

        async function startRealtime() {
            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession();

            console.log(
                "[Realtime] 세션:",
                !!session,
                sessionError
            );

            if (!session?.access_token) {
                console.log("[Realtime] access token 없음");
                return;
            }

            await supabase.realtime.setAuth(session.access_token);

            console.log("[Realtime] 인증 토큰 적용 완료");

            channel = supabase
                .channel(`feed-realtime-${groupId}`)
                .on(
                    "system",
                    "*",
                    (payload) => {
                        console.log("[Realtime] SYSTEM:", payload);
                    }
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
                .subscribe((status, error) => {
                    console.log(
                        "[Realtime] 상태:",
                        status,
                        error
                    );
                });
        }

        startRealtime();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [groupId, router]);

    return null;
}