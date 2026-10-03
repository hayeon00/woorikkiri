"use client";

import { useState } from "react";

import { CommentList } from "@/components/comment-list";
import { CommentForm } from "@/components/comment-form";

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

type CommentSectionProps = {
    postId: number;

    comments: Comment[];

    currentUserId: string;

    avatarUrl: string | null;

    members: Member[];

    createAction: (
        formData: FormData
    ) => void | Promise<void>;

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
    ] = useState<ReplyTarget>(
        null
    );

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

    return (
        <>
            <CommentList
                comments={
                    comments
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
                onSubmitted={() =>
                    setReplyTarget(
                        null
                    )
                }
            />
        </>
    );
}