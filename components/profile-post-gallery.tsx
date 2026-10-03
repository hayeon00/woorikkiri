"use client";

import {
    useMemo,
    useState,
} from "react";

import { ProfilePostDetail } from "@/components/profile-post-detail";

type Group = {
    id: number;
    name: string;
};

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

type ProfilePostGalleryProps = {
    posts: Post[];

    groups: Group[];

    currentUserId: string;

    currentUserAvatarUrl:
        | string
        | null;

    toggleLikeAction: (
        postId: number
    ) => Promise<void>;

    createCommentAction: (
        formData: FormData
    ) => void | Promise<void>;

    deleteCommentAction: (
        formData: FormData
    ) => void | Promise<void>;
};

type PostType =
    | "photo"
    | "text";

export function ProfilePostGallery({
                                       posts,
                                       groups,
                                       currentUserId,
                                       currentUserAvatarUrl,
                                       toggleLikeAction,
                                       createCommentAction,
                                       deleteCommentAction,
                                   }: ProfilePostGalleryProps) {
    const [
        selectedGroupId,
        setSelectedGroupId,
    ] = useState<number | null>(
        null
    );

    const [
        postType,
        setPostType,
    ] = useState<PostType>(
        "photo"
    );

    const [
        selectedPostId,
        setSelectedPostId,
    ] = useState<number | null>(
        null
    );

    const selectedPost =
        selectedPostId === null
            ? null
            : posts.find(
            (post) =>
                post.id ===
                selectedPostId
        ) ?? null;

    const groupFilteredPosts =
        useMemo(() => {
            if (
                selectedGroupId ===
                null
            ) {
                return posts;
            }

            return posts.filter(
                (post) =>
                    post.group_id ===
                    selectedGroupId
            );
        }, [
            posts,
            selectedGroupId,
        ]);

    const photoPosts =
        useMemo(
            () =>
                groupFilteredPosts.filter(
                    (post) =>
                        post.image_urls
                            ?.length >
                        0
                ),
            [groupFilteredPosts]
        );

    const textPosts =
        useMemo(
            () =>
                groupFilteredPosts.filter(
                    (post) =>
                        !post.image_urls ||
                        post.image_urls
                            .length ===
                        0
                ),
            [groupFilteredPosts]
        );

    const visiblePosts =
        postType === "photo"
            ? photoPosts
            : textPosts;

    function getGroupName(
        groupId: number
    ) {
        return (
            groups.find(
                (group) =>
                    group.id ===
                    groupId
            )?.name ??
            "우리 공간"
        );
    }

    return (
        <section>
            {/* 공간 선택 */}
            <div className="border-b border-black/[0.05] bg-white">
                <div className="overflow-x-auto px-4 py-3 sm:px-5">
                    <div className="flex min-w-max gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                setSelectedGroupId(
                                    null
                                )
                            }
                            className={
                                selectedGroupId ===
                                null
                                    ? "flex h-9 items-center rounded-full bg-gray-950 px-4 text-[11px] font-black text-white"
                                    : "flex h-9 items-center rounded-full bg-gray-100 px-4 text-[11px] font-bold text-gray-500 transition hover:bg-gray-200"
                            }
                        >
                            전체 공간
                        </button>

                        {groups.map(
                            (group) => (
                                <button
                                    key={
                                        group.id
                                    }
                                    type="button"
                                    onClick={() =>
                                        setSelectedGroupId(
                                            group.id
                                        )
                                    }
                                    className={
                                        selectedGroupId ===
                                        group.id
                                            ? "flex h-9 max-w-[180px] items-center rounded-full bg-gray-950 px-4 text-[11px] font-black text-white"
                                            : "flex h-9 max-w-[180px] items-center rounded-full bg-gray-100 px-4 text-[11px] font-bold text-gray-500 transition hover:bg-gray-200"
                                    }
                                >
                                    <span className="truncate">
                                        {
                                            group.name
                                        }
                                    </span>
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* 사진 / 글 탭 */}
            <div className="grid grid-cols-2 border-b border-black/[0.05] bg-white">
                <button
                    type="button"
                    onClick={() =>
                        setPostType(
                            "photo"
                        )
                    }
                    className={
                        postType ===
                        "photo"
                            ? "relative flex h-12 items-center justify-center gap-2 text-[11px] font-black text-gray-950"
                            : "relative flex h-12 items-center justify-center gap-2 text-[11px] font-bold text-gray-400"
                    }
                >
                    <GridIcon />
                    사진

                    <span className="text-[9px] text-gray-400">
                        {
                            photoPosts.length
                        }
                    </span>

                    {postType ===
                        "photo" && (
                            <span className="absolute bottom-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-gray-950" />
                        )}
                </button>

                <button
                    type="button"
                    onClick={() =>
                        setPostType(
                            "text"
                        )
                    }
                    className={
                        postType ===
                        "text"
                            ? "relative flex h-12 items-center justify-center gap-2 text-[11px] font-black text-gray-950"
                            : "relative flex h-12 items-center justify-center gap-2 text-[11px] font-bold text-gray-400"
                    }
                >
                    <TextIcon />
                    글

                    <span className="text-[9px] text-gray-400">
                        {
                            textPosts.length
                        }
                    </span>

                    {postType ===
                        "text" && (
                            <span className="absolute bottom-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-gray-950" />
                        )}
                </button>
            </div>

            {/* 사진 게시물 */}
            {postType ===
                "photo" && (
                    <>
                        {visiblePosts.length >
                        0 ? (
                            <div className="grid grid-cols-3 gap-[2px] bg-white">
                                {visiblePosts.map(
                                    (
                                        post
                                    ) => {
                                        const firstImage =
                                            post
                                                .image_urls?.[0];

                                        if (
                                            !firstImage
                                        ) {
                                            return null;
                                        }

                                        return (
                                            <button
                                                key={
                                                    post.id
                                                }
                                                type="button"
                                                onClick={() =>
                                                    setSelectedPostId(
                                                        post.id
                                                    )
                                                }
                                                className="group relative aspect-square overflow-hidden bg-gray-100 text-left"
                                                aria-label={`${getGroupName(
                                                    post.group_id
                                                )} 게시물 보기`}
                                            >
                                                <img
                                                    src={
                                                        firstImage.image_url
                                                    }
                                                    alt=""
                                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                                />

                                                {post
                                                        .image_urls
                                                        .length >
                                                    1 && (
                                                        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                                                            <MultipleImageIcon />
                                                        </div>
                                                    )}

                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent px-2 pb-2 pt-8 opacity-0 transition group-hover:opacity-100 sm:opacity-100">
                                                    <p className="truncate text-[9px] font-bold text-white">
                                                        {getGroupName(
                                                            post.group_id
                                                        )}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    }
                                )}
                            </div>
                        ) : (
                            <EmptyState
                                text="사진 게시물이 없어요."
                            />
                        )}
                    </>
                )}

            {/* 글 게시물 */}
            {postType ===
                "text" && (
                    <div className="space-y-3 px-3 py-4 sm:px-5">
                        {visiblePosts.length >
                        0 ? (
                            visiblePosts.map(
                                (
                                    post
                                ) => (
                                    <button
                                        key={
                                            post.id
                                        }
                                        type="button"
                                        onClick={() =>
                                            setSelectedPostId(
                                                post.id
                                            )
                                        }
                                        className="block w-full rounded-[20px] border border-black/[0.04] bg-white p-4 text-left shadow-[0_5px_20px_rgba(0,0,0,0.025)] transition active:scale-[0.99] sm:p-5"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                        <span className="min-w-0 truncate rounded-full bg-gray-100 px-2.5 py-1 text-[9px] font-black text-gray-500">
                                            {getGroupName(
                                                post.group_id
                                            )}
                                        </span>

                                            <time
                                                dateTime={
                                                    post.created_at
                                                }
                                                className="shrink-0 text-[9px] font-medium text-gray-400"
                                            >
                                                {formatPostDate(
                                                    post.created_at
                                                )}
                                            </time>
                                        </div>

                                        <p className="mt-3 whitespace-pre-wrap break-words text-[13px] leading-6 text-gray-800 sm:text-[14px]">
                                            {post.content ||
                                                "내용 없는 게시물"}
                                        </p>

                                        <div className="mt-4 flex items-center gap-3 text-[10px] font-bold text-gray-400">
                                        <span>
                                            댓글{" "}
                                            {
                                                post
                                                    .comments
                                                    .length
                                            }
                                        </span>

                                            <span>
                                            게시물 보기 →
                                        </span>
                                        </div>
                                    </button>
                                )
                            )
                        ) : (
                            <EmptyState
                                text="글 게시물이 없어요."
                            />
                        )}
                    </div>
                )}

            {/* 상세 모달 */}
            {selectedPost && (
                <ProfilePostDetail
                    post={
                        selectedPost
                    }
                    groupName={getGroupName(
                        selectedPost.group_id
                    )}
                    currentUserId={
                        currentUserId
                    }
                    currentUserAvatarUrl={
                        currentUserAvatarUrl
                    }
                    toggleLikeAction={
                        toggleLikeAction
                    }
                    createCommentAction={
                        createCommentAction
                    }
                    deleteCommentAction={
                        deleteCommentAction
                    }
                    onClose={() =>
                        setSelectedPostId(
                            null
                        )
                    }
                />
            )}
        </section>
    );
}

function EmptyState({
                        text,
                    }: {
    text: string;
}) {
    return (
        <div className="bg-[#f6f6f4] px-5 py-16 text-center">
            <p className="text-[13px] font-black text-gray-600">
                {text}
            </p>

            <p className="mt-1.5 text-[11px] text-gray-400">
                다른 공간도 확인해보세요.
            </p>
        </div>
    );
}

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
    )}`;
}

function GridIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <rect
                x="3"
                y="3"
                width="7"
                height="7"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.7"
            />

            <rect
                x="14"
                y="3"
                width="7"
                height="7"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.7"
            />

            <rect
                x="3"
                y="14"
                width="7"
                height="7"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.7"
            />

            <rect
                x="14"
                y="14"
                width="7"
                height="7"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.7"
            />
        </svg>
    );
}

function TextIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M5 6h14M5 12h14M5 18h9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

function MultipleImageIcon() {
    return (
        <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <rect
                x="7"
                y="7"
                width="12"
                height="12"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.8"
            />

            <path
                d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}