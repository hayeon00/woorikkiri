"use client";

import type { FormState } from "@/lib/form-state";
import Link from "next/link";
import {
    ReactNode,
    useEffect,
    useRef,
    useState,
} from "react";
import { useSearchParams } from "next/navigation";

import { CommentDeleteButton } from "@/components/comment-delete-button";
import { ProfileImageViewer } from "@/components/profile-image-viewer";
import {
    hiddenRootCount,
    shouldExpandForTarget,
} from "@/lib/comment-visibility";

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
    ) => Promise<FormState>;

    onReply: (
        comment: Comment
    ) => void;
};


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

    // 알림 딥링크로 이미 펼친 대상 댓글 id
    const expandedForTargetRef =
        useRef<number | null>(null);

    // 화면을 처음 그릴 때 접은 개수. 이후 새 댓글은 아래에 더해지기만 한다.
    const [baselineHidden] =
        useState(() =>
            hiddenRootCount(
                comments.filter(
                    (comment) =>
                        comment.parent_id ===
                        null
                ).length,
                false
            )
        );

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

        // 같은 대상은 한 번만 펼친다. (예전에는 매 렌더마다 다시 펼쳐서
        // 딥링크로 들어온 동안 "접기"를 눌러도 접히지 않았다.)
        if (
            expandedForTargetRef.current ===
            targetCommentId
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

        expandedForTargetRef.current =
            targetCommentId;

        if (
            shouldExpandForTarget(
                targetRootIndex,
                hiddenRootCount(
                    rootComments.length,
                    false,
                    baselineHidden
                )
            )
        ) {
            setIsExpanded(
                true
            );
        }
    }, [
        targetCommentId,
        sortedComments,
        rootComments,
        baselineHidden,
    ]);

    // 가장 최근 댓글 3개를 보여주고 오래된 댓글을 접는다.
    // 새 댓글(내 것·친구 것)이 항상 보이는 자리에 남는다.
    const collapsedHiddenCount =
        hiddenRootCount(
            rootComments.length,
            false,
            baselineHidden
        );

    const visibleRoots =
        rootComments.slice(
            isExpanded
                ? 0
                : collapsedHiddenCount
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
            {/* 오래된 댓글 펼치기 (최근 댓글 위에 둔다) */}
            {collapsedHiddenCount > 0 && (
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
                    aria-expanded={isExpanded}
                    className="mb-4 text-[11px] font-bold text-gray-400 transition hover:text-gray-700"
                >
                    {isExpanded
                        ? "이전 댓글 접기"
                        : `이전 댓글 ${collapsedHiddenCount}개 보기`}
                </button>
            )}

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
                        <span className="text-[11px] font-medium text-gray-400">
                            방금
                        </span>

                        <span className="flex items-center gap-1 text-[11px] font-bold text-gray-400">
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
    ) => Promise<FormState>;

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

                    {/* D2: 시간 · 답글 · 삭제를 한 줄에 둔다.
                        버튼은 보이는 크기는 그대로, 누르는 영역만 넓힌다
                        (px/py로 넓히고 같은 만큼 -m으로 배치를 되돌림, 약 30×29px).
                        gap-x-3이라 이웃 버튼의 누르는 영역과 겹치지 않는다. */}
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <time
                            className="text-[11px] font-medium text-gray-400"
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
                                className="-mx-1.5 -my-1.5 px-1.5 py-1.5 text-[11px] font-bold text-gray-500 transition hover:text-gray-800"
                            >
                                답글
                            </button>
                        )}

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