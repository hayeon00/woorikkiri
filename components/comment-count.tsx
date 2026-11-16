"use client";

import { useCallback, useSyncExternalStore } from "react";

import { pendingComments } from "@/lib/pending-comments";

/**
 * 게시물 댓글 수 (A7)
 *
 * 서버가 보낸 댓글 수에 "보내는 중인 내 댓글 수"를 더해 보여준다.
 * 서버 렌더와 브라우저 첫 렌더는 보내는 중인 댓글이 없으므로 같다.
 */
export function CommentCount({
    postId,
    serverCount,
}: {
    postId: number;
    serverCount: number;
}) {
    const getPending = useCallback(
        () => pendingComments.get(postId),
        [postId]
    );

    const pending = useSyncExternalStore(
        pendingComments.subscribe,
        getPending,
        () => 0
    );

    return <>{serverCount + pending}</>;
}
