"use client";

import { useState } from "react";

import { CommentDeleteButton } from "@/components/comment-delete-button";

type Comment = {
    id: number;
    content: string;
    created_at: string;
    user_id: string | null;

    profiles: {
        nickname: string | null;
    } | null;

    avatar_url: string | null;
};

type CommentListProps = {
    comments: Comment[];
    currentUserId: string;
    deleteAction: (
        formData: FormData
    ) => void | Promise<void>;
};

const INITIAL_COMMENT_COUNT = 3;

export function CommentList({
                                comments,
                                currentUserId,
                                deleteAction,
                            }: CommentListProps) {
    const [isExpanded, setIsExpanded] =
        useState(false);

    const sortedComments = [
        ...comments,
    ].sort(
        (a, b) =>
            new Date(
                a.created_at
            ).getTime() -
            new Date(
                b.created_at
            ).getTime()
    );

    const visibleComments = isExpanded
        ? sortedComments
        : sortedComments.slice(
            0,
            INITIAL_COMMENT_COUNT
        );

    const hiddenCount =
        sortedComments.length -
        INITIAL_COMMENT_COUNT;

    if (sortedComments.length === 0) {
        return null;
    }

    return (
        <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="space-y-3">
                {visibleComments.map(
                    (comment) => (
                        <div
                            key={comment.id}
                            className="flex items-start gap-2.5"
                        >
                            {comment.avatar_url ? (
                                <img
                                    src={
                                        comment.avatar_url
                                    }
                                    alt="댓글 작성자"
                                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                    <UserIcon />
                                </div>
                            )}

                            <div className="min-w-0 flex-1">
                                <div>
                                    <div className="text-[12px] leading-5">
                                        <span className="mr-2 font-black">
                                            {comment
                                                    .profiles
                                                    ?.nickname ??
                                                "탈퇴한 사용자"}
                                        </span>

                                        <span className="break-words text-gray-700">
                                            {
                                                comment.content
                                            }
                                        </span>
                                    </div>

                                    <time className="mt-0.5 block text-[9px] font-medium text-gray-400">
                                        {new Date(
                                            comment.created_at
                                        ).toLocaleString(
                                            "ko-KR",
                                            {
                                                month: "numeric",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            }
                                        )}
                                    </time>
                                </div>

                                {comment.user_id ===
                                    currentUserId && (
                                        <CommentDeleteButton
                                            commentId={
                                                comment.id
                                            }
                                            deleteAction={
                                                deleteAction
                                            }
                                        />
                                    )}
                            </div>
                        </div>
                    )
                )}
            </div>

            {sortedComments.length >
                INITIAL_COMMENT_COUNT && (
                    <button
                        type="button"
                        onClick={() =>
                            setIsExpanded(
                                (value) => !value
                            )
                        }
                        className="mt-3 text-[11px] font-bold text-gray-400 transition hover:text-gray-700"
                    >
                        {isExpanded
                            ? "댓글 접기"
                            : `댓글 ${hiddenCount}개 더 보기`}
                    </button>
                )}
        </div>
    );
}

function UserIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <circle
                cx="12"
                cy="8"
                r="4"
                stroke="currentColor"
                strokeWidth="1.8"
            />

            <path
                d="M4 21a8 8 0 0 1 16 0"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}