"use client";

import {
    useEffect,
} from "react";

import {
    PostImageSlider,
} from "@/components/post-image-slider";

import {
    LikeButton,
} from "@/components/like-button";

import {
    CommentSection,
} from "@/components/comment-section";

type PostImage = {
    id: number;
    image_path: string;
    sort_order: number;
    image_url: string;
};

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

type Post = {
    id: number;
    content: string | null;
    created_at: string;
    group_id: number;

    image_urls: PostImage[];

    liked_by_me: boolean;
    like_count: number;

    comments: Comment[];

    members: Member[];
};

type ProfilePostDetailProps = {
    post: Post;

    groupName: string;

    currentUserId: string;

    currentUserAvatarUrl:
        | string
        | null;

    onClose: () => void;

    toggleLikeAction: (
        postId: number
    ) => Promise<void>;

    createCommentAction: (
        formData: FormData
    ) =>
        | void
        | Promise<
        | {
        commentId: number;
    }
        | undefined
    >;

    deleteCommentAction: (
        formData: FormData
    ) => void | Promise<void>;
};

export function ProfilePostDetail({
                                      post,
                                      groupName,
                                      currentUserId,
                                      currentUserAvatarUrl,
                                      onClose,
                                      toggleLikeAction,
                                      createCommentAction,
                                      deleteCommentAction,
                                  }: ProfilePostDetailProps) {
    useEffect(() => {
        const previousOverflow =
            document.body.style
                .overflow;

        document.body.style
            .overflow =
            "hidden";

        function handleKeyDown(
            event: KeyboardEvent
        ) {
            if (
                event.key ===
                "Escape"
            ) {
                onClose();
            }
        }

        window.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            document.body.style
                .overflow =
                previousOverflow;

            window.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-[2px] sm:items-center sm:p-5"
            onMouseDown={(
                event
            ) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <article className="flex max-h-[92dvh] w-full max-w-[680px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-[28px]">

                {/* ========================================
                    상단 헤더
                ======================================== */}

                <header className="flex h-14 shrink-0 items-center justify-between border-b border-black/[0.05] bg-white px-4 sm:px-5">
                    <div className="min-w-0">
                        <p className="truncate text-[12px] font-black text-gray-900">
                            {
                                groupName
                            }
                        </p>

                        <time
                            dateTime={
                                post.created_at
                            }
                            className="mt-0.5 block text-[9px] font-medium text-gray-400"
                        >
                            {formatPostDate(
                                post.created_at
                            )}
                        </time>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200"
                        aria-label="게시물 닫기"
                    >
                        <CloseIcon />
                    </button>
                </header>

                {/* ========================================
                    스크롤 영역

                    min-h-0 + flex-1을 사용해서
                    모바일/PWA에서도 article 내부에서만
                    정상적으로 스크롤되도록 함.
                ======================================== */}

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">

                    {/* ========================================
                        사진
                    ======================================== */}

                    {post.image_urls
                            .length >
                        0 && (
                            <div className="bg-black">
                                <PostImageSlider
                                    images={
                                        post.image_urls
                                    }
                                />
                            </div>
                        )}

                    {/* ========================================
                        게시물 본문
                    ======================================== */}

                    <div className="px-4 pb-2 pt-4 sm:px-6">

                        {post.content && (
                            <p className="whitespace-pre-wrap break-words text-[14px] leading-6 text-gray-900 sm:text-[15px]">
                                {
                                    post.content
                                }
                            </p>
                        )}

                        {/* ========================================
                            좋아요 / 댓글 수
                        ======================================== */}

                        <div
                            className={
                                post.content
                                    ? "mt-5 border-t border-black/[0.05] pt-4"
                                    : "pt-1"
                            }
                        >
                            <div className="flex items-center gap-5">
                                <LikeButton
                                    postId={
                                        post.id
                                    }
                                    initialLiked={
                                        post.liked_by_me
                                    }
                                    initialCount={
                                        post.like_count
                                    }
                                    toggleAction={
                                        toggleLikeAction
                                    }
                                />

                                <div className="flex items-center gap-1.5 text-gray-700">
                                    <CommentIcon />

                                    <span className="text-[11px] font-black">
                                        {
                                            post
                                                .comments
                                                .length
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ========================================
                            댓글 영역
                        ======================================== */}

                        <section className="mt-5 border-t border-black/[0.05] pt-5">
                            <div className="mb-1 flex items-center justify-between gap-3">
                                <div className="flex shrink-0 items-center gap-2">
                                    <h3 className="text-[13px] font-black text-gray-900">
                                        댓글
                                    </h3>

                                    <span className="text-[10px] font-bold text-gray-400">
                                        {
                                            post
                                                .comments
                                                .length
                                        }
                                    </span>
                                </div>

                                {post.comments
                                        .length >
                                    0 && (
                                        <span className="truncate text-[9px] font-medium text-gray-400">
                                        답글과 멘션을 사용할 수 있어요
                                    </span>
                                    )}
                            </div>

                            <CommentSection
                                postId={
                                    post.id
                                }
                                comments={
                                    post.comments
                                }
                                currentUserId={
                                    currentUserId
                                }
                                avatarUrl={
                                    currentUserAvatarUrl
                                }
                                members={
                                    post.members
                                }
                                createAction={
                                    createCommentAction
                                }
                                deleteAction={
                                    deleteCommentAction
                                }
                            />
                        </section>
                    </div>
                </div>
            </article>
        </div>
    );
}

// ========================================
// 날짜
// ========================================

function formatPostDate(
    dateString: string
) {
    const parts =
        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone:
                    "Asia/Seoul",

                year:
                    "numeric",

                month:
                    "numeric",

                day:
                    "numeric",

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                hour12:
                    false,
            }
        ).formatToParts(
            new Date(
                dateString
            )
        );

    const getPart = (
        type: Intl.DateTimeFormatPartTypes
    ) =>
        parts.find(
            (part) =>
                part.type ===
                type
        )?.value ?? "";

    return `${getPart(
        "year"
    )}.${getPart(
        "month"
    )}.${getPart(
        "day"
    )} ${getPart(
        "hour"
    )}:${getPart(
        "minute"
    )}`;
}

// ========================================
// 닫기 아이콘
// ========================================

function CloseIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

// ========================================
// 댓글 아이콘
// ========================================

function CommentIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.7 9.7 0 0 1-3.8-.8L3 21l1.7-4.5A8.1 8.1 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}