"use client";

import {
    useEffect,
    useRef,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import {
    postIdInFilter,
    shouldRefreshFeed,
    type FeedRealtimeEvent,
    type FeedTable,
} from "@/lib/realtime-refresh";

type FeedRealtimeProps = {
    groupId: number;
    currentUserId: string;
    /** 지금 피드에 보이는 게시물 id (최신순) */
    postIds: number[];
    /** 지금 피드에 보이는 댓글 id */
    commentIds: number[];
};

/**
 * 피드 실시간 갱신 (F1·F2)
 *
 * - 게시물: 현재 공간만 구독
 * - 댓글·좋아요 추가: 화면에 있는 최근 게시물(최대 100개)만 구독
 * - 댓글 삭제: 필터를 걸 수 없어 받은 뒤 화면에 있는 댓글인지 확인
 * - 좋아요 취소: 구독하지 않는다 (다음 갱신 때 반영)
 * - 내가 만든 변경은 서버 응답으로 이미 반영되므로 새로고침하지 않는다
 */
export function FeedRealtime({
                                 groupId,
                                 currentUserId,
                                 postIds = [],
                                 commentIds = [],
                             }: FeedRealtimeProps) {
    const router = useRouter();

    // 이벤트 판단에 쓰는 화면 정보. 바뀌어도 다시 구독할 필요가 없도록 ref로 둔다.
    const viewRef = useRef({
        currentUserId,
        postIds: new Set(postIds),
        commentIds: new Set(commentIds),
    });

    viewRef.current = {
        currentUserId,
        postIds: new Set(postIds),
        commentIds: new Set(commentIds),
    };

    // 구독 필터는 화면의 게시물 목록이 바뀔 때만 달라진다.
    const postFilter =
        postIdInFilter(postIds);

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

        const handle =
            (table: FeedTable) =>
                (payload: {
                    eventType: string;
                    new: Record<string, unknown> | null;
                    old: Record<string, unknown> | null;
                }) => {
                    const event: FeedRealtimeEvent = {
                        table,
                        eventType:
                            payload.eventType as FeedRealtimeEvent["eventType"],
                        new: payload.new ?? {},
                        old: payload.old ?? {},
                    };

                    if (
                        shouldRefreshFeed(
                            event,
                            viewRef.current
                        )
                    ) {
                        refreshFeed();
                    }
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

            let next =
                supabase
                    .channel(
                        `feed-realtime-${groupId}`
                    )

                    // ========================================
                    // 현재 그룹 게시물
                    // (삭제 이벤트는 필터가 적용되지 않아
                    //  화면에 있는 게시물인지 따로 확인)
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
                        handle("posts")
                    )

                    // ========================================
                    // 댓글 삭제
                    // (필터 불가, 화면에 있는 댓글인지 확인)
                    // ========================================

                    .on(
                        "postgres_changes",
                        {
                            event: "DELETE",
                            schema:
                                "public",
                            table:
                                "comments",
                        },
                        handle("comments")
                    );

            // ========================================
            // 화면에 있는 게시물의 댓글·좋아요 추가
            // ========================================

            if (postFilter) {
                next = next
                    .on(
                        "postgres_changes",
                        {
                            event: "INSERT",
                            schema:
                                "public",
                            table:
                                "comments",
                            filter:
                                postFilter,
                        },
                        handle("comments")
                    )
                    .on(
                        "postgres_changes",
                        {
                            event: "INSERT",
                            schema:
                                "public",
                            table:
                                "likes",
                            filter:
                                postFilter,
                        },
                        handle("likes")
                    );
            }

            channel =
                next.subscribe(
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
        postFilter,
        router,
    ]);

    return null;
}
