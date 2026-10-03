"use client";

import Link from "next/link";
import {
    ReactNode,
    useEffect,
    useState,
} from "react";
import { useSearchParams } from "next/navigation";

import { CommentDeleteButton } from "@/components/comment-delete-button";
import { ProfileImageViewer } from "@/components/profile-image-viewer";

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

type OptimisticComment = {
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

type CommentListProps = {
    comments: Comment[];

    optimisticComments:
        OptimisticComment[];

    currentUserId: string;

    deleteAction: (
        formData: FormData
    ) => void | Promise<void>;

    onReply: (
        comment: Comment
    ) => void;
};

const INITIAL_THREAD_COUNT =
    3;

export function CommentList({
                                comments,
                                optimisticComments,
                                currentUserId,
                                deleteAction,
                                onReply,
                            }: CommentListProps) {
    const searchParams =
        useSearchParams();

    const targetCommentId =
        Number(
            searchParams.get(
                "comment"
            )
        );

    const [
        isExpanded,
        setIsExpanded,
    ] =
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

    const rootComments =
        sortedComments.filter(
            (comment) =>
                comment.parent_id ===
                null
        );

    const optimisticRootComments =
        optimisticComments.filter(
            (comment) =>
                comment.parent_id ===
                null
        );

    // ========================================
    // 알림 대상 댓글 자동 펼치기
    // ========================================

    useEffect(() => {
        if (
            !Number.isInteger(
                targetCommentId
            ) ||
            targetCommentId <= 0
        ) {
            return;
        }

        const targetComment =
            sortedComments.find(
                (comment) =>
                    comment.id ===
                    targetCommentId
            );

        if (!targetComment) {
            return;
        }

        const targetRootId =
            targetComment.parent_id ??
            targetComment.id;

        const targetRootIndex =
            rootComments.findIndex(
                (comment) =>
                    comment.id ===
                    targetRootId
            );

        if (
            targetRootIndex >=
            INITIAL_THREAD_COUNT
        ) {
            setIsExpanded(
                true
            );
        }
    }, [
        targetCommentId,
        sortedComments,
        rootComments,
    ]);

    const visibleRoots =
        isExpanded
            ? rootComments
            : rootComments.slice(
                0,
                INITIAL_THREAD_COUNT
            );

    const hiddenCount =
        Math.max(
            rootComments.length -
            INITIAL_THREAD_COUNT,
            0
        );

    if (
        sortedComments.length ===
        0 &&
        optimisticComments.length ===
        0
    ) {
        return null;
    }

    return (
        <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="space-y-4">
                {visibleRoots.map(
                    (comment) => {
                        const replies =
                            sortedComments.filter(
                                (
                                    reply
                                ) =>
                                    reply.parent_id ===
                                    comment.id
                            );

                        const optimisticReplies =
                            optimisticComments.filter(
                                (
                                    reply
                                ) =>
                                    reply.parent_id ===
                                    comment.id
                            );

                        return (
                            <div
                                key={
                                    comment.id
                                }
                            >
                                <CommentItem
                                    comment={
                                        comment
                                    }
                                    currentUserId={
                                        currentUserId
                                    }
                                    deleteAction={
                                        deleteAction
                                    }
                                    onReply={
                                        onReply
                                    }
                                />

                                {(replies.length >
                                    0 ||
                                    optimisticReplies.length >
                                    0) && (
                                    <div className="ml-8 mt-3 space-y-3 border-l border-gray-100 pl-3">
                                        {replies.map(
                                            (
                                                reply
                                            ) => (
                                                <CommentItem
                                                    key={
                                                        reply.id
                                                    }
                                                    comment={
                                                        reply
                                                    }
                                                    currentUserId={
                                                        currentUserId
                                                    }
                                                    deleteAction={
                                                        deleteAction
                                                    }
                                                    onReply={
                                                        onReply
                                                    }
                                                    isReply
                                                />
                                            )
                                        )}

                                        {optimisticReplies.map(
                                            (
                                                reply
                                            ) => (
                                                <OptimisticCommentItem
                                                    key={
                                                        reply.tempId
                                                    }
                                                    comment={
                                                        reply
                                                    }
                                                    isReply
                                                />
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    }
                )}

                {optimisticRootComments.map(
                    (comment) => (
                        <OptimisticCommentItem
                            key={
                                comment.tempId
                            }
                            comment={
                                comment
                            }
                        />
                    )
                )}
            </div>

            {rootComments.length >
                INITIAL_THREAD_COUNT && (
                    <button
                        type="button"
                        onClick={() =>
                            setIsExpanded(
                                (
                                    value
                                ) =>
                                    !value
                            )
                        }
                        className="mt-4 text-[11px] font-bold text-gray-400 transition hover:text-gray-700"
                    >
                        {isExpanded
                            ? "댓글 접기"
                            : `댓글 ${hiddenCount}개 더 보기`}
                    </button>
                )}
        </div>
    );
}

// ========================================
// 서버 저장 전 임시 댓글
// ========================================

function OptimisticCommentItem({
                                   comment,
                                   isReply = false,
                               }: {
    comment: OptimisticComment;
    isReply?: boolean;
}) {
    return (
        <div className="rounded-xl opacity-70">
            <div className="flex items-start gap-2.5">
                {comment.avatar_url ? (
                    <ProfileImageViewer
                        src={
                            comment.avatar_url
                        }
                        alt={`${
                            comment.profiles
                                ?.nickname ??
                            "사용자"
                        } 프로필 사진`}
                        className={
                            isReply
                                ? "h-6 w-6 rounded-full object-cover"
                                : "h-7 w-7 rounded-full object-cover"
                        }
                    />
                ) : (
                    <div
                        className={
                            isReply
                                ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400"
                                : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400"
                        }
                    >
                        <UserIcon />
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <div className="text-[12px] leading-5">
                        <span className="mr-2 font-black">
                            {comment
                                    .profiles
                                    .nickname ??
                                "사용자"}
                        </span>

                        <span className="break-words text-gray-700">
                            {renderCommentContent(
                                comment.content,
                                comment.mentions ??
                                [],
                                comment.replyToUser ??
                                null
                            )}
                        </span>
                    </div>

                    <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-[9px] font-medium text-gray-400">
                            방금
                        </span>

                        <span className="flex items-center gap-1 text-[9px] font-bold text-gray-400">
                            <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-gray-300 border-t-gray-600" />

                            전송 중...
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ========================================
// 실제 서버 댓글
// ========================================

function CommentItem({
                         comment,
                         currentUserId,
                         deleteAction,
                         onReply,
                         isReply = false,
                     }: {
    comment: Comment;

    currentUserId: string;

    deleteAction: (
        formData: FormData
    ) => void | Promise<void>;

    onReply: (
        comment: Comment
    ) => void;

    isReply?: boolean;
}) {
    return (
        <div
            id={`comment-${comment.id}`}
            className="scroll-mt-28 rounded-xl transition"
        >
            <div className="flex items-start gap-2.5">
                {comment.avatar_url ? (
                    <ProfileImageViewer
                        src={
                            comment.avatar_url
                        }
                        alt={`${
                            comment.profiles
                                ?.nickname ??
                            "친구"
                        } 프로필 사진`}
                        className={
                            isReply
                                ? "h-6 w-6 rounded-full object-cover"
                                : "h-7 w-7 rounded-full object-cover"
                        }
                    />
                ) : (
                    <div
                        className={
                            isReply
                                ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400"
                                : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400"
                        }
                    >
                        <UserIcon />
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <div className="text-[12px] leading-5">
                        {comment.user_id ? (
                            <Link
                                href={`/profile/${comment.user_id}`}
                                className="mr-2 font-black transition hover:text-gray-500"
                            >
                                {comment
                                        .profiles
                                        ?.nickname ??
                                    "사용자"}
                            </Link>
                        ) : (
                            <span className="mr-2 font-black text-gray-500">
                                탈퇴한 사용자
                            </span>
                        )}

                        <span className="break-words text-gray-700">
                            {renderCommentContent(
                                comment.content,
                                comment.mentions ??
                                [],
                                comment.replyToUser ??
                                null
                            )}
                        </span>
                    </div>

                    <div className="mt-0.5 flex items-center gap-2.5">
                        <time
                            className="text-[9px] font-medium text-gray-400"
                            dateTime={
                                comment.created_at
                            }
                        >
                            {formatCommentDate(
                                comment.created_at
                            )}
                        </time>

                        {comment.user_id && (
                            <button
                                type="button"
                                onClick={() =>
                                    onReply(
                                        comment
                                    )
                                }
                                className="text-[9px] font-bold text-gray-400 transition hover:text-gray-700"
                            >
                                답글
                            </button>
                        )}
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
        </div>
    );
}

// ========================================
// 댓글 내용
// ========================================

function renderCommentContent(
    content: string,
    mentions: LinkedUser[],
    replyToUser: LinkedUser | null
): ReactNode {
    const linkedUsers = [
        ...mentions,
    ];

    if (
        replyToUser &&
        !linkedUsers.some(
            (user) =>
                user.userId ===
                replyToUser.userId
        )
    ) {
        linkedUsers.push(
            replyToUser
        );
    }

    if (
        linkedUsers.length === 0
    ) {
        return content;
    }

    const sortedUsers = [
        ...linkedUsers,
    ].sort(
        (a, b) =>
            b.nickname.length -
            a.nickname.length
    );

    const result:
        ReactNode[] = [];

    let remaining =
        content;

    let keyIndex =
        0;

    while (
        remaining.length > 0
        ) {
        let earliestIndex =
            -1;

        let matchedUser:
            | LinkedUser
            | null = null;

        for (
            const user of
            sortedUsers
            ) {
            const token =
                `@${user.nickname}`;

            const index =
                remaining.indexOf(
                    token
                );

            if (
                index !== -1 &&
                (earliestIndex ===
                    -1 ||
                    index <
                    earliestIndex)
            ) {
                earliestIndex =
                    index;

                matchedUser =
                    user;
            }
        }

        if (
            earliestIndex ===
            -1 ||
            !matchedUser
        ) {
            result.push(
                <span
                    key={`text-${keyIndex++}`}
                >
                    {remaining}
                </span>
            );

            break;
        }

        if (
            earliestIndex > 0
        ) {
            result.push(
                <span
                    key={`text-${keyIndex++}`}
                >
                    {remaining.slice(
                        0,
                        earliestIndex
                    )}
                </span>
            );
        }

        const mentionText =
            `@${matchedUser.nickname}`;

        result.push(
            <Link
                key={`mention-${matchedUser.userId}-${keyIndex++}`}
                href={`/profile/${matchedUser.userId}`}
                className="font-bold text-blue-500 transition hover:text-blue-600"
                onClick={(
                    event
                ) => {
                    event.stopPropagation();
                }}
            >
                {mentionText}
            </Link>
        );

        remaining =
            remaining.slice(
                earliestIndex +
                mentionText.length
            );
    }

    return result;
}

// ========================================
// 날짜
// ========================================

function formatCommentDate(
    dateString: string
) {
    const date =
        new Date(
            dateString
        );

    const parts =
        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone:
                    "Asia/Seoul",

                month:
                    "numeric",

                day:
                    "numeric",

                hour:
                    "numeric",

                minute:
                    "2-digit",

                hour12:
                    false,
            }
        ).formatToParts(
            date
        );

    const getPart = (
        type: Intl.DateTimeFormatPartTypes
    ) =>
        parts.find(
            (part) =>
                part.type ===
                type
        )?.value ?? "";

    const month =
        getPart(
            "month"
        );

    const day =
        getPart(
            "day"
        );

    const hour =
        getPart(
            "hour"
        );

    const minute =
        getPart(
            "minute"
        );

    return `${month}. ${day}. ${hour}:${minute}`;
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