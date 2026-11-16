"use client";

import type { FormState } from "@/lib/form-state";
import {
    useEffect,
    useState,
} from "react";

import { CommentList } from "@/components/comment-list";
import {
    CommentForm,
    OptimisticCommentInput,
} from "@/components/comment-form";

type LinkedUser = {
    userId: string;
    nickname: string;
};

type Comment = {
    id: number;
    content: string;
    created_at: string;

    user_id: string | null;
    parent_id: number | null;
    reply_to_user_id: string | null;

    profiles: {
        nickname: string | null;
    } | null;

    avatar_url: string | null;

    mentions?: LinkedUser[];

    replyToUser?: LinkedUser | null;
};

type Member = {
    userId: string;
    nickname: string;
    avatarUrl: string | null;
};

type ReplyTarget = {
    commentId: number;
    userId: string;
    nickname: string;
} | null;

export type OptimisticComment = {
    tempId: string;

    content: string;
    created_at: string;

    user_id: string;

    parent_id: number | null;
    reply_to_user_id: string | null;

    profiles: {
        nickname: string | null;
    };

    avatar_url: string | null;

    mentions: LinkedUser[];

    replyToUser: LinkedUser | null;

    pending: true;
};

type CommentSectionProps = {
    postId: number;

    comments: Comment[];

    currentUserId: string;

    avatarUrl: string | null;

    members: Member[];

    createAction: (
        formData: FormData
    ) => Promise<FormState>;

    deleteAction: (
        formData: FormData
    ) => Promise<FormState>;
};

export function CommentSection({
                                   postId,
                                   comments,
                                   currentUserId,
                                   avatarUrl,
                                   members,
                                   createAction,
                                   deleteAction,
                               }: CommentSectionProps) {
    const [
        replyTarget,
        setReplyTarget,
    ] =
        useState<ReplyTarget>(
            null
        );

    const [
        optimisticComments,
        setOptimisticComments,
    ] = useState<
        OptimisticComment[]
    >([]);

    const currentMember =
        members.find(
            (member) =>
                member.userId ===
                currentUserId
        );

    const currentNickname =
        currentMember?.nickname ??
        "사용자";

    // ========================================
    // 서버의 실제 댓글이 들어오면 해당 임시 댓글 제거
    //
    // 화면에서는 같은 렌더에서 바로 빼서, 진짜 댓글과 임시 댓글이
    // 잠깐 두 개로 보이며 화면이 늘었다 줄어드는 일을 막는다.
    // 상태 정리는 그 뒤 효과에서 한다.
    // ========================================

    const pendingComments =
        optimisticComments.filter(
            (optimistic) =>
                !isConfirmedByServer(
                    optimistic,
                    comments,
                    currentUserId
                )
        );

    useEffect(() => {
        setOptimisticComments(
            (current) =>
                current.filter(
                    (optimistic) =>
                        !isConfirmedByServer(
                            optimistic,
                            comments,
                            currentUserId
                        )
                )
        );
    }, [
        comments,
        currentUserId,
    ]);

    // ========================================
    // 답글 선택
    // ========================================

    function handleReply(
        comment: Comment
    ) {
        if (!comment.user_id) {
            return;
        }

        setReplyTarget({
            commentId:
            comment.id,

            userId:
            comment.user_id,

            nickname:
                comment.profiles
                    ?.nickname ??
                "사용자",
        });
    }

    // ========================================
    // 임시 댓글 즉시 추가
    // ========================================

    function handleOptimisticSubmit(
        input: OptimisticCommentInput
    ) {
        const optimisticComment:
            OptimisticComment = {
            tempId:
            input.tempId,

            content:
            input.content,

            created_at:
            input.createdAt,

            user_id:
            currentUserId,

            parent_id:
            input.parentId,

            reply_to_user_id:
                input.replyToUser
                    ?.userId ??
                null,

            profiles: {
                nickname:
                currentNickname,
            },

            avatar_url:
            avatarUrl,

            mentions:
            input.mentions,

            replyToUser:
            input.replyToUser,

            pending:
                true,
        };

        setOptimisticComments(
            (current) => [
                ...current,
                optimisticComment,
            ]
        );

        setReplyTarget(
            null
        );
    }

    // ========================================
    // 등록 실패 시 임시 댓글 제거 + 답글 대상 복구
    // ========================================

    function handleSubmitFailed(
        tempId: string,
        submittedReplyTarget: ReplyTarget
    ) {
        setOptimisticComments(
            (current) =>
                current.filter(
                    (comment) =>
                        comment.tempId !==
                        tempId
                )
        );

        // 다시 보내면 원래대로 답글로 저장되도록
        if (submittedReplyTarget) {
            setReplyTarget(
                submittedReplyTarget
            );
        }
    }

    return (
        <>
            <CommentList
                comments={
                    comments
                }
                optimisticComments={
                    pendingComments
                }
                currentUserId={
                    currentUserId
                }
                deleteAction={
                    deleteAction
                }
                onReply={
                    handleReply
                }
            />

            <CommentForm
                postId={
                    postId
                }
                avatarUrl={
                    avatarUrl
                }
                currentUserId={
                    currentUserId
                }
                members={
                    members
                }
                createAction={
                    createAction
                }
                replyTarget={
                    replyTarget
                }
                onCancelReply={() =>
                    setReplyTarget(
                        null
                    )
                }
                onSubmitted={
                    handleOptimisticSubmit
                }
                onSubmitFailed={
                    handleSubmitFailed
                }
            />
        </>
    );
}

/** 임시 댓글과 같은 댓글(내 것, 같은 내용·답글 대상, 30초 이내)이 서버 목록에 있는지 */
function isConfirmedByServer(
    optimistic: OptimisticComment,
    comments: Comment[],
    currentUserId: string
): boolean {
    const optimisticTime =
        new Date(optimistic.created_at).getTime();

    return comments.some(
        (comment) =>
            comment.user_id === currentUserId &&
            comment.content === optimistic.content &&
            comment.parent_id === optimistic.parent_id &&
            Math.abs(
                new Date(comment.created_at).getTime() -
                optimisticTime
            ) < 30_000
    );
}
