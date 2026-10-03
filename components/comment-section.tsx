"use client";

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
    ) =>
        | void
        | Promise<
        | {
        commentId: number;
    }
        | undefined
    >;

    deleteAction: (
        formData: FormData
    ) => void | Promise<void>;
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
    // 서버의 실제 댓글이 들어오면
    // 해당 임시 댓글 제거
    // ========================================

    useEffect(() => {
        setOptimisticComments(
            (current) =>
                current.filter(
                    (
                        optimistic
                    ) => {
                        const exists =
                            comments.some(
                                (
                                    comment
                                ) => {
                                    if (
                                        comment.user_id !==
                                        currentUserId
                                    ) {
                                        return false;
                                    }

                                    if (
                                        comment.content !==
                                        optimistic.content
                                    ) {
                                        return false;
                                    }

                                    if (
                                        comment.parent_id !==
                                        optimistic.parent_id
                                    ) {
                                        return false;
                                    }

                                    const serverTime =
                                        new Date(
                                            comment.created_at
                                        ).getTime();

                                    const optimisticTime =
                                        new Date(
                                            optimistic.created_at
                                        ).getTime();

                                    return (
                                        Math.abs(
                                            serverTime -
                                            optimisticTime
                                        ) <
                                        30_000
                                    );
                                }
                            );

                        return !exists;
                    }
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
    // 등록 실패 시 임시 댓글 제거
    // ========================================

    function handleSubmitFailed(
        tempId: string
    ) {
        setOptimisticComments(
            (current) =>
                current.filter(
                    (comment) =>
                        comment.tempId !==
                        tempId
                )
        );
    }

    return (
        <>
            <CommentList
                comments={
                    comments
                }
                optimisticComments={
                    optimisticComments
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