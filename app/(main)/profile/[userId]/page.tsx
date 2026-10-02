import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ProfileImageViewer } from "@/components/profile-image-viewer";
import { PostImageSlider } from "@/components/post-image-slider";
import { LikeButton } from "@/components/like-button";

import { toggleLike } from "../../../actions";

async function ProfileContent({
                                  userId,
                              }: {
    userId: string;
}) {


    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    // ========================================
    // 보고 있는 프로필
    // ========================================

    const {
        data: targetProfile,
        error: profileError,
    } = await supabase
        .from("profiles")
        .select(`
            id,
            nickname,
            avatar_url
        `)
        .eq("id", userId)
        .maybeSingle();

    if (profileError) {
        console.error(
            "프로필 조회 실패:",
            profileError
        );
    }

    if (!targetProfile) {
        notFound();
    }

    // ========================================
    // 나와 상대방이 함께 속한 공간 찾기
    // ========================================

    const {
        data: myMemberships,
        error: myMembershipError,
    } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

    if (myMembershipError) {
        console.error(
            "내 공간 조회 실패:",
            myMembershipError
        );
    }

    const myGroupIds = (
        myMemberships ?? []
    ).map(
        (membership: any) =>
            membership.group_id
    );

    let sharedGroupIds: number[] = [];

    if (myGroupIds.length > 0) {
        const {
            data: targetMemberships,
            error: targetMembershipError,
        } = await supabase
            .from("group_members")
            .select("group_id")
            .eq("user_id", userId)
            .in("group_id", myGroupIds);

        if (targetMembershipError) {
            console.error(
                "공통 공간 조회 실패:",
                targetMembershipError
            );
        }

        sharedGroupIds = (
            targetMemberships ?? []
        ).map(
            (membership: any) =>
                membership.group_id
        );
    }

    // 서로 공유하는 공간이 없으면
    // 프로필 자체도 보여주지 않음.
    if (
        userId !== user.id &&
        sharedGroupIds.length === 0
    ) {
        notFound();
    }

    // 본인 프로필은 내가 가입한 모든 공간 사용
    const visibleGroupIds =
        userId === user.id
            ? myGroupIds
            : sharedGroupIds;

    // ========================================
    // 공간 이름
    // ========================================

    let groups: any[] = [];

    if (visibleGroupIds.length > 0) {
        const {
            data,
            error,
        } = await supabase
            .from("groups")
            .select("id, name")
            .in(
                "id",
                visibleGroupIds
            );

        if (error) {
            console.error(
                "공간 이름 조회 실패:",
                error
            );
        }

        groups = data ?? [];
    }

    const groupNameMap = new Map<
        number,
        string
    >(
        groups.map(
            (group: any) => [
                group.id,
                group.name,
            ]
        )
    );

    // ========================================
    // 프로필 사진 Signed URL
    // ========================================

    let profileAvatarUrl:
        | string
        | null = null;

    if (targetProfile.avatar_url) {
        const {
            data,
            error,
        } = await supabase.storage
            .from("avatars")
            .createSignedUrl(
                targetProfile.avatar_url,
                60 * 60
            );

        if (error) {
            console.error(
                "프로필 사진 URL 생성 실패:",
                error
            );
        }

        profileAvatarUrl =
            data?.signedUrl ?? null;
    }

    // ========================================
    // 해당 사용자의 게시물
    // ========================================

    let posts: any[] = [];

    if (visibleGroupIds.length > 0) {
        const {
            data,
            error,
        } = await supabase
            .from("posts")
            .select(`
                id,
                content,
                created_at,
                user_id,
                group_id,

                post_images (
                    id,
                    image_path,
                    sort_order
                ),

                likes (
                    user_id
                )
            `)
            .eq("user_id", userId)
            .in(
                "group_id",
                visibleGroupIds
            )
            .order(
                "created_at",
                {
                    ascending: false,
                }
            );

        if (error) {
            console.error(
                "개인 피드 조회 실패:",
                error
            );
        }

        posts = data ?? [];
    }

    // ========================================
    // 게시물 사진 Signed URL
    // ========================================

    const postsWithImages =
        await Promise.all(
            posts.map(
                async (post: any) => {
                    const sortedImages = [
                        ...(post.post_images ??
                            []),
                    ].sort(
                        (
                            a: any,
                            b: any
                        ) =>
                            a.sort_order -
                            b.sort_order
                    );

                    const imageUrls = (
                        await Promise.all(
                            sortedImages.map(
                                async (
                                    image: any
                                ) => {
                                    const {
                                        data,
                                        error,
                                    } =
                                        await supabase.storage
                                            .from(
                                                "post-images"
                                            )
                                            .createSignedUrl(
                                                image.image_path,
                                                60 *
                                                60
                                            );

                                    if (
                                        error ||
                                        !data?.signedUrl
                                    ) {
                                        if (
                                            error
                                        ) {
                                            console.error(
                                                "게시물 사진 URL 생성 실패:",
                                                error
                                            );
                                        }

                                        return null;
                                    }

                                    return {
                                        id:
                                        image.id,
                                        image_path:
                                        image.image_path,
                                        sort_order:
                                        image.sort_order,
                                        image_url:
                                        data.signedUrl,
                                    };
                                }
                            )
                        )
                    ).filter(
                        (
                            image
                        ): image is {
                            id: number;
                            image_path: string;
                            sort_order: number;
                            image_url: string;
                        } =>
                            image !==
                            null
                    );

                    const likedByMe =
                        post.likes?.some(
                            (
                                like: any
                            ) =>
                                like.user_id ===
                                user.id
                        ) ?? false;

                    return {
                        ...post,
                        image_urls:
                        imageUrls,
                        like_count:
                            post.likes
                                ?.length ??
                            0,
                        liked_by_me:
                        likedByMe,
                    };
                }
            )
        );

    async function toggleLikeAction(
        postId: number
    ) {
        "use server";

        await toggleLike(postId);
    }

    const isMe =
        user.id === userId;

    return (
        <main className="min-h-screen bg-[#f6f6f4] pb-28 text-[#111]">
            <div className="mx-auto min-h-screen w-full max-w-[720px] sm:border-x sm:border-black/[0.04]">

                {/* 헤더 */}
                <header className="sticky top-0 z-30 flex h-[64px] items-center border-b border-black/[0.04] bg-[#f6f6f4]/90 px-4 backdrop-blur-xl sm:px-6">
                    <Link
                        href="/"
                        className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-black/[0.04]"
                        aria-label="피드로 돌아가기"
                    >
                        <ArrowLeftIcon />
                    </Link>

                    <p className="ml-2 text-[15px] font-black">
                        프로필
                    </p>
                </header>

                {/* 프로필 */}
                <section className="bg-white px-5 pb-7 pt-8 text-center sm:px-8">
                    <div className="flex justify-center">
                        {profileAvatarUrl ? (
                            <ProfileImageViewer
                                src={
                                    profileAvatarUrl
                                }
                                alt={`${
                                    targetProfile.nickname ??
                                    "친구"
                                } 프로필 사진`}
                                className="h-24 w-24 rounded-full border border-black/[0.05] object-cover"
                            />
                        ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                <UserIcon />
                            </div>
                        )}
                    </div>

                    <h1 className="mt-4 text-[21px] font-black tracking-[-0.04em]">
                        {targetProfile.nickname ??
                            "친구"}
                    </h1>

                    {isMe && (
                        <p className="mt-1 text-[11px] font-medium text-gray-400">
                            내 프로필
                        </p>
                    )}

                    <div className="mt-6 flex justify-center">
                        <div className="min-w-[90px]">
                            <p className="text-[17px] font-black">
                                {
                                    postsWithImages.length
                                }
                            </p>

                            <p className="mt-0.5 text-[10px] font-bold text-gray-400">
                                게시물
                            </p>
                        </div>

                        <div className="h-9 w-px bg-gray-100" />

                        <div className="min-w-[90px]">
                            <p className="text-[17px] font-black">
                                {
                                    visibleGroupIds.length
                                }
                            </p>

                            <p className="mt-0.5 text-[10px] font-bold text-gray-400">
                                {isMe
                                    ? "내 공간"
                                    : "함께한 공간"}
                            </p>
                        </div>
                    </div>

                    {isMe && (
                        <Link
                            href="/settings"
                            className="mx-auto mt-6 flex h-10 max-w-[220px] items-center justify-center rounded-full bg-gray-100 text-[11px] font-black text-gray-700 transition hover:bg-gray-200"
                        >
                            내 정보 수정
                        </Link>
                    )}
                </section>

                {/* 개인 피드 */}
                <section className="space-y-3 px-3 pt-5 sm:px-5">
                    <div className="flex items-center justify-between px-1 pb-1">
                        <h2 className="text-[17px] font-black tracking-[-0.03em]">
                            {isMe
                                ? "내 이야기"
                                : `${
                                    targetProfile.nickname ??
                                    "친구"
                                }의 이야기`}
                        </h2>

                        <span className="text-[11px] font-medium text-gray-400">
                            {
                                postsWithImages.length
                            }
                            개
                        </span>
                    </div>

                    {postsWithImages.length ===
                        0 && (
                            <div className="rounded-[24px] border border-black/[0.04] bg-white px-5 py-16 text-center">
                                <p className="text-sm font-black">
                                    아직 게시물이
                                    없어요
                                </p>

                                <p className="mt-1.5 text-xs leading-5 text-gray-400">
                                    {isMe
                                        ? "공간에서 이야기를 작성하면 여기에 모여요."
                                        : "함께한 공간에서 작성한 게시물이 여기에 보여요."}
                                </p>
                            </div>
                        )}

                    {postsWithImages.map(
                        (post: any) => (
                            <article
                                key={post.id}
                                className="overflow-hidden rounded-[22px] border border-black/[0.04] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.025)]"
                            >
                                {/* 작성 공간 / 날짜 */}
                                <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
                                    <Link
                                        href={`/?group=${post.group_id}`}
                                        className="min-w-0 truncate text-[12px] font-black text-gray-700 transition hover:text-gray-950"
                                    >
                                        {groupNameMap.get(
                                                post.group_id
                                            ) ??
                                            "우리 공간"}
                                    </Link>

                                    <time className="shrink-0 text-[10px] font-medium text-gray-400">
                                        {new Date(
                                            post.created_at
                                        ).toLocaleString(
                                            "ko-KR",
                                            {
                                                month:
                                                    "long",
                                                day:
                                                    "numeric",
                                                hour:
                                                    "2-digit",
                                                minute:
                                                    "2-digit",
                                            }
                                        )}
                                    </time>
                                </div>

                                {post.content && (
                                    <p className="whitespace-pre-wrap break-words px-4 pb-3 text-[14px] leading-[1.65] text-gray-900 sm:px-5 sm:pb-4 sm:text-[15px]">
                                        {
                                            post.content
                                        }
                                    </p>
                                )}

                                {post.image_urls
                                        ?.length >
                                    0 && (
                                        <PostImageSlider
                                            images={
                                                post.image_urls
                                            }
                                        />
                                    )}

                                <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
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

                                    <Link
                                        href={`/?group=${post.group_id}#post-${post.id}`}
                                        className="mt-3 inline-flex text-[11px] font-bold text-gray-400 transition hover:text-gray-700"
                                    >
                                        공간에서 댓글 보기 →
                                    </Link>
                                </div>
                            </article>
                        )
                    )}
                </section>
            </div>
        </main>
    );
}

function ArrowLeftIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M19 12H5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />

            <path
                d="m11 18-6-6 6-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function UserIcon() {
    return (
        <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <circle
                cx="12"
                cy="8"
                r="4"
                stroke="currentColor"
                strokeWidth="1.6"
            />

            <path
                d="M4 21a8 8 0 0 1 16 0"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
            />
        </svg>
    );
}

export default function ProfilePage({
                                        params,
                                    }: {
    params: Promise<{
        userId: string;
    }>;
}) {
    return (
        <Suspense
            fallback={
                <ProfileLoading />
            }
        >
            <ProfileLoader
                params={params}
            />
        </Suspense>
    );
}

async function ProfileLoader({
                                 params,
                             }: {
    params: Promise<{
        userId: string;
    }>;
}) {
    const { userId } =
        await params;

    return (
        <ProfileContent
            userId={userId}
        />
    );
}

function ProfileLoading() {
    return (
        <main className="min-h-screen bg-[#f6f6f4] pb-28">
            <div className="mx-auto min-h-screen w-full max-w-[720px] sm:border-x sm:border-black/[0.04]">

                <div className="h-[64px] border-b border-black/[0.04] bg-[#f6f6f4]" />

                <section className="bg-white px-5 pb-7 pt-8">
                    <div className="animate-pulse">
                        <div className="mx-auto h-24 w-24 rounded-full bg-gray-200" />

                        <div className="mx-auto mt-4 h-6 w-28 rounded bg-gray-200" />

                        <div className="mx-auto mt-2 h-3 w-16 rounded bg-gray-100" />

                        <div className="mx-auto mt-6 h-10 w-48 rounded-xl bg-gray-100" />
                    </div>
                </section>

                <section className="space-y-3 px-3 pt-5 sm:px-5">
                    <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />

                    {[1, 2].map(
                        (item) => (
                            <div
                                key={item}
                                className="h-[320px] animate-pulse rounded-[22px] bg-white"
                            />
                        )
                    )}
                </section>
            </div>
        </main>
    );
}