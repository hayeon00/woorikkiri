import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

import {
    toggleLike,
    createComment,
    deletePost,
    deleteComment,
} from "./actions";

import { CreatePostForm } from "@/components/create-post-form";

async function Feed({
                        searchParams,
                    }: {
    searchParams: Promise<{
        group?: string;
    }>;
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return (
            <main className="mx-auto flex min-h-screen w-full max-w-[720px] flex-col justify-center bg-white px-6 sm:px-10">
                <div className="mb-8">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-2xl font-black text-white">
                        W
                    </div>

                    <h1 className="text-3xl font-black tracking-tight">
                        우리끼리
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-gray-400">
                        친한 사람들끼리
                        <br />
                        일상을 나누는 작은 공간
                    </p>
                </div>

                <a
                    href="/auth/login"
                    className="flex h-13 items-center justify-center rounded-2xl bg-black text-sm font-bold text-white"
                >
                    로그인하기
                </a>
            </main>
        );
    }

    // 내 프로필
    const { data: myProfile } = await supabase
        .from("profiles")
        .select("nickname, avatar_url")
        .eq("id", user.id)
        .single();

    let myAvatarUrl: string | null = null;

    if (myProfile?.avatar_url) {
        const { data } = await supabase.storage
            .from("avatars")
            .createSignedUrl(myProfile.avatar_url, 60 * 60);

        myAvatarUrl = data?.signedUrl ?? null;
    }

    // 내가 가입한 그룹
    const { data: memberships, error: membershipError } =
        await supabase
            .from("group_members")
            .select(`
                group_id,
                joined_at,

                groups (
                    id,
                    name,
                    invite_code,
                    owner_id,
                    created_at
                )
            `)
            .eq("user_id", user.id)
            .order("joined_at", {
                ascending: true,
            });

    if (membershipError) {
        console.error("그룹 조회 실패:", membershipError);
    }

    const requestedGroupId = Number(params.group);

    const requestedMembership = memberships?.find(
        (membership: any) =>
            membership.group_id === requestedGroupId
    );

    const currentMembership =
        requestedMembership ??
        memberships?.[0] ??
        null;

    const currentGroup: any =
        currentMembership?.groups ?? null;

    // 현재 그룹 멤버
    let groupMembers: any[] = [];

    if (currentGroup) {
        const { data, error } = await supabase
            .from("group_members")
            .select(`
                user_id,
                joined_at,

                profiles (
                    nickname,
                    avatar_url
                )
            `)
            .eq("group_id", currentGroup.id)
            .order("joined_at", {
                ascending: true,
            });

        if (error) {
            console.error("그룹 멤버 조회 실패:", error);
        } else {
            groupMembers = data ?? [];
        }
    }

    const groupMembersWithAvatars = await Promise.all(
        groupMembers.map(async (member: any) => {
            let avatarUrl: string | null = null;

            if (member.profiles?.avatar_url) {
                const { data } = await supabase.storage
                    .from("avatars")
                    .createSignedUrl(
                        member.profiles.avatar_url,
                        60 * 60
                    );

                avatarUrl = data?.signedUrl ?? null;
            }

            return {
                ...member,
                avatar_url: avatarUrl,
            };
        })
    );

    // 게시글
    const { data: posts, error: postsError } =
        await supabase
            .from("posts")
            .select(`
                id,
                content,
                image_path,
                created_at,
                user_id,
                group_id,

                profiles!posts_user_id_fkey (
                    nickname,
                    avatar_url
                ),

                likes (
                    user_id
                ),

                comments (
                    id,
                    content,
                    created_at,
                    user_id,

                    profiles!comments_user_id_fkey (
                        nickname,
                        avatar_url
                    )
                )
            `)
            .eq(
                "group_id",
                currentGroup?.id ?? -1
            )
            .order("created_at", {
                ascending: false,
            });

    if (postsError) {
        console.error(
            "게시글 조회 실패:",
            postsError
        );

        return (
            <main className="mx-auto min-h-screen w-full max-w-[720px] bg-white p-6">
                <h1 className="text-2xl font-black">
                    우리끼리
                </h1>

                <div className="mt-8 rounded-3xl bg-red-50 p-5">
                    <p className="font-bold">
                        게시글을 불러오지 못했어요.
                    </p>

                    <p className="mt-2 break-words text-sm text-red-500">
                        {postsError.message}
                    </p>
                </div>
            </main>
        );
    }

    const postsWithImages = await Promise.all(
        (posts ?? []).map(async (post: any) => {
            let imageUrl: string | null = null;

            if (post.image_path) {
                const { data } = await supabase.storage
                    .from("post-images")
                    .createSignedUrl(
                        post.image_path,
                        60 * 60
                    );

                imageUrl = data?.signedUrl ?? null;
            }

            let authorAvatarUrl: string | null = null;

            if (post.profiles?.avatar_url) {
                const { data } = await supabase.storage
                    .from("avatars")
                    .createSignedUrl(
                        post.profiles.avatar_url,
                        60 * 60
                    );

                authorAvatarUrl =
                    data?.signedUrl ?? null;
            }

            const commentsWithAvatars =
                await Promise.all(
                    (post.comments ?? []).map(
                        async (comment: any) => {
                            let commentAvatarUrl:
                                | string
                                | null = null;

                            if (
                                comment.profiles
                                    ?.avatar_url
                            ) {
                                const { data } =
                                    await supabase.storage
                                        .from("avatars")
                                        .createSignedUrl(
                                            comment.profiles
                                                .avatar_url,
                                            60 * 60
                                        );

                                commentAvatarUrl =
                                    data?.signedUrl ??
                                    null;
                            }

                            return {
                                ...comment,
                                avatar_url:
                                commentAvatarUrl,
                            };
                        }
                    )
                );

            const likedByMe =
                post.likes?.some(
                    (like: any) =>
                        like.user_id === user.id
                ) ?? false;

            return {
                ...post,
                image_url: imageUrl,
                author_avatar_url:
                authorAvatarUrl,
                comments:
                commentsWithAvatars,
                like_count:
                    post.likes?.length ?? 0,
                liked_by_me: likedByMe,
            };
        })
    );

    return (
        <main className="mx-auto min-h-screen w-full max-w-[720px] border-x border-gray-100 bg-[#f7f7f7] pb-28 text-gray-950">

            {/* HEADER */}
            <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur-xl">
                <div className="flex h-[76px] items-center justify-between px-4 sm:px-7">

                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold tracking-wide text-gray-400">
                            우리끼리
                        </p>

                        <h1 className="mt-0.5 max-w-[420px] truncate text-[21px] font-black tracking-tight sm:text-[23px]">
                            {currentGroup
                                ? currentGroup.name
                                : "우리 피드"}
                        </h1>
                    </div>

                    <a
                        href="/settings"
                        className="relative ml-4 block shrink-0"
                    >
                        {myAvatarUrl ? (
                            <img
                                src={myAvatarUrl}
                                alt="내 프로필"
                                className="h-10 w-10 rounded-full border border-gray-100 object-cover sm:h-11 sm:w-11"
                            />
                        ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm sm:h-11 sm:w-11">
                                👤
                            </div>
                        )}

                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                    </a>

                </div>
            </header>

            {/* 그룹 없음 */}
            {!currentGroup && (
                <section className="px-6 py-24 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-white text-3xl shadow-sm">
                        👥
                    </div>

                    <h2 className="mt-6 text-xl font-black">
                        아직 공간이 없어요
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-gray-400">
                        친구들과 우리만의 공간을 만들거나
                        <br />
                        받은 초대코드로 참여해보세요.
                    </p>

                    <a
                        href="/settings"
                        className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-bold text-white"
                    >
                        공간 만들기
                    </a>
                </section>
            )}

            {currentGroup && (
                <>
                    {/* 그룹 선택 */}
                    {memberships &&
                        memberships.length > 1 && (
                            <section className="border-b border-gray-100 bg-white py-3">
                                <div
                                    className="flex gap-2 overflow-x-auto px-4 sm:px-7"
                                    style={{
                                        scrollbarWidth:
                                            "none",
                                    }}
                                >
                                    {memberships.map(
                                        (
                                            membership: any
                                        ) => {
                                            const group =
                                                membership.groups;

                                            if (!group) {
                                                return null;
                                            }

                                            const selected =
                                                group.id ===
                                                currentGroup.id;

                                            return (
                                                <a
                                                    key={
                                                        group.id
                                                    }
                                                    href={`/?group=${group.id}`}
                                                    className={
                                                        selected
                                                            ? "shrink-0 rounded-full bg-black px-4 py-2.5 text-[13px] font-bold text-white"
                                                            : "shrink-0 rounded-full bg-gray-100 px-4 py-2.5 text-[13px] font-semibold text-gray-500 transition hover:bg-gray-200"
                                                    }
                                                >
                                                    {
                                                        group.name
                                                    }
                                                </a>
                                            );
                                        }
                                    )}
                                </div>
                            </section>
                        )}

                    <div className="space-y-4 px-3 pt-4 sm:px-6 sm:pt-6">

                        {/* 현재 공간 */}
                        <section className="overflow-hidden rounded-[26px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.035)] sm:p-7">

                            <div className="flex items-start justify-between gap-4">

                                <div className="min-w-0">
                                    <div className="mb-2 inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-500">
                                        OUR SPACE
                                    </div>

                                    <h2 className="truncate text-[22px] font-black tracking-tight sm:text-[26px]">
                                        {currentGroup.name}
                                    </h2>

                                    <p className="mt-1 text-xs text-gray-400 sm:text-sm">
                                        우리끼리 편하게 이야기해요.
                                    </p>
                                </div>

                                <a
                                    href="/settings"
                                    className="shrink-0 rounded-full border border-gray-200 px-3.5 py-2 text-xs font-bold transition hover:bg-gray-50"
                                >
                                    관리
                                </a>

                            </div>

                            <div className="mt-7 flex items-end justify-between gap-4">

                                <div>
                                    <div className="flex items-center">
                                        {groupMembersWithAvatars
                                            .slice(0, 5)
                                            .map(
                                                (
                                                    member: any,
                                                    index: number
                                                ) => (
                                                    <div
                                                        key={
                                                            member.user_id
                                                        }
                                                        className={
                                                            index ===
                                                            0
                                                                ? ""
                                                                : "-ml-2"
                                                        }
                                                    >
                                                        {member.avatar_url ? (
                                                            <img
                                                                src={
                                                                    member.avatar_url
                                                                }
                                                                alt="멤버"
                                                                className="h-9 w-9 rounded-full border-[3px] border-white object-cover sm:h-10 sm:w-10"
                                                            />
                                                        ) : (
                                                            <div className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-gray-100 text-xs sm:h-10 sm:w-10">
                                                                👤
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                    </div>

                                    <p className="mt-2 text-[11px] font-medium text-gray-400">
                                        함께하는 친구{" "}
                                        <span className="font-bold text-gray-700">
                                            {
                                                groupMembersWithAvatars.length
                                            }
                                            명
                                        </span>
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-gray-50 px-4 py-2.5 text-right">
                                    <p className="text-[9px] font-bold text-gray-400">
                                        초대코드
                                    </p>

                                    <p className="mt-0.5 font-mono text-sm font-black tracking-widest">
                                        {
                                            currentGroup.invite_code
                                        }
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* 글쓰기 */}
                        <CreatePostForm
                            groupId={currentGroup.id}
                            nickname={
                                myProfile?.nickname ?? "친구"
                            }
                            avatarUrl={myAvatarUrl}
                        />


                        {/* 피드 제목 */}
                        <div className="flex items-end justify-between px-1 pb-1 pt-5 sm:pt-7">
                            <div>
                                <p className="text-[10px] font-bold tracking-wider text-gray-400">
                                    LATEST
                                </p>

                                <h2 className="mt-0.5 text-lg font-black sm:text-xl">
                                    우리 피드
                                </h2>
                            </div>

                            <p className="text-xs text-gray-400">
                                {postsWithImages.length}개의 이야기
                            </p>
                        </div>

                        {/* 게시물 */}
                        <section className="space-y-4">
                            {postsWithImages.length ===
                                0 && (
                                    <div className="rounded-[26px] bg-white px-5 py-16 text-center">
                                        <div className="text-3xl">
                                            ✏️
                                        </div>

                                        <p className="mt-4 font-bold">
                                            아직 이야기가 없어요
                                        </p>

                                        <p className="mt-2 text-sm text-gray-400">
                                            첫 번째 이야기를 남겨보세요.
                                        </p>
                                    </div>
                                )}

                            {postsWithImages.map(
                                (post: any) => (
                                    <article
                                        key={post.id}
                                        className="overflow-hidden rounded-[26px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.035)]"
                                    >
                                        {/* 작성자 */}
                                        <div className="flex items-center justify-between px-5 pb-3 pt-5 sm:px-7 sm:pt-6">
                                            <div className="flex min-w-0 items-center gap-3">
                                                {post.author_avatar_url ? (
                                                    <img
                                                        src={
                                                            post.author_avatar_url
                                                        }
                                                        alt="작성자"
                                                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100">
                                                        👤
                                                    </div>
                                                )}

                                                <div className="min-w-0">
                                                    <p className="truncate text-[14px] font-black">
                                                        {post
                                                                .profiles
                                                                ?.nickname ??
                                                            "친구"}
                                                    </p>

                                                    <time className="mt-0.5 block text-[11px] text-gray-400">
                                                        {new Date(
                                                            post.created_at
                                                        ).toLocaleString(
                                                            "ko-KR",
                                                            {
                                                                month:
                                                                    "long",
                                                                day: "numeric",
                                                                hour: "2-digit",
                                                                minute:
                                                                    "2-digit",
                                                            }
                                                        )}
                                                    </time>
                                                </div>
                                            </div>

                                            {post.user_id ===
                                                user.id && (
                                                    <form
                                                        action={async () => {
                                                            "use server";
                                                            await deletePost(
                                                                post.id
                                                            );
                                                        }}
                                                    >
                                                        <button
                                                            type="submit"
                                                            className="rounded-full px-3 py-2 text-xs font-medium text-gray-300 transition hover:bg-gray-50 hover:text-red-400"
                                                        >
                                                            삭제
                                                        </button>
                                                    </form>
                                                )}
                                        </div>

                                        {/* 글 */}
                                        {post.content && (
                                            <p className="whitespace-pre-wrap break-words px-5 pb-5 text-[15px] leading-7 sm:px-7 sm:text-base">
                                                {post.content}
                                            </p>
                                        )}

                                        {/* 사진 */}
                                        {post.image_url && (
                                            <div className="px-3 sm:px-5">
                                                <img
                                                    src={
                                                        post.image_url
                                                    }
                                                    alt="게시글 사진"
                                                    className="max-h-[650px] w-full rounded-[22px] object-cover"
                                                />
                                            </div>
                                        )}

                                        {/* 액션 */}
                                        <div className="px-5 pb-5 pt-4 sm:px-7 sm:pb-6">
                                            <div className="flex items-center gap-5">
                                                <form
                                                    action={async () => {
                                                        "use server";
                                                        await toggleLike(
                                                            post.id
                                                        );
                                                    }}
                                                >
                                                    <button
                                                        type="submit"
                                                        aria-label="좋아요"
                                                        className="flex items-center gap-1.5"
                                                    >
                                                        <span
                                                            className={
                                                                post.liked_by_me
                                                                    ? "text-[25px] leading-none text-red-500"
                                                                    : "text-[25px] leading-none text-gray-800"
                                                            }
                                                        >
                                                            {post.liked_by_me
                                                                ? "♥"
                                                                : "♡"}
                                                        </span>

                                                        <span className="text-xs font-bold">
                                                            {
                                                                post.like_count
                                                            }
                                                        </span>
                                                    </button>
                                                </form>

                                                <div className="flex items-center gap-1.5 text-gray-700">
                                                    <svg
                                                        width="21"
                                                        height="21"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        aria-hidden="true"
                                                    >
                                                        <path
                                                            d="M21 11.5C21 16.1944 16.9706 20 12 20C10.9285 20 9.90074 19.8232 8.94792 19.4987L4 21L5.45751 16.6277C3.92303 15.2308 3 13.2393 3 11.5C3 6.80558 7.02944 3 12 3C16.9706 3 21 6.80558 21 11.5Z"
                                                            stroke="currentColor"
                                                            strokeWidth="1.7"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>

                                                    <span className="text-xs font-bold">
                                                        {post.comments
                                                                ?.length ??
                                                            0}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* 댓글 목록 */}
                                            {post.comments?.length >
                                                0 && (
                                                    <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                                                        {post.comments
                                                            .sort(
                                                                (
                                                                    a: any,
                                                                    b: any
                                                                ) =>
                                                                    new Date(
                                                                        a.created_at
                                                                    ).getTime() -
                                                                    new Date(
                                                                        b.created_at
                                                                    ).getTime()
                                                            )
                                                            .map(
                                                                (
                                                                    comment: any
                                                                ) => (
                                                                    <div
                                                                        key={
                                                                            comment.id
                                                                        }
                                                                        className="flex items-start gap-2.5"
                                                                    >
                                                                        {comment.avatar_url ? (
                                                                            <img
                                                                                src={
                                                                                    comment.avatar_url
                                                                                }
                                                                                alt="댓글 작성자"
                                                                                className="h-8 w-8 shrink-0 rounded-full object-cover"
                                                                            />
                                                                        ) : (
                                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px]">
                                                                                👤
                                                                            </div>
                                                                        )}

                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="rounded-2xl bg-gray-50 px-3.5 py-2.5">
                                                                                <span className="mr-2 text-xs font-black">
                                                                                    {comment
                                                                                            .profiles
                                                                                            ?.nickname ??
                                                                                        "친구"}
                                                                                </span>

                                                                                <span className="break-words text-[13px] leading-5">
                                                                                    {
                                                                                        comment.content
                                                                                    }
                                                                                </span>
                                                                            </div>

                                                                            {comment.user_id ===
                                                                                user.id && (
                                                                                    <form
                                                                                        action={async () => {
                                                                                            "use server";
                                                                                            await deleteComment(
                                                                                                comment.id
                                                                                            );
                                                                                        }}
                                                                                    >
                                                                                        <button
                                                                                            type="submit"
                                                                                            className="ml-2 mt-1 text-[10px] text-gray-300 hover:text-red-400"
                                                                                        >
                                                                                            삭제
                                                                                        </button>
                                                                                    </form>
                                                                                )}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            )}
                                                    </div>
                                                )}

                                            {/* 댓글 입력 */}
                                            <form
                                                action={
                                                    createComment
                                                }
                                                className="mt-4 flex items-center gap-2"
                                            >
                                                <input
                                                    type="hidden"
                                                    name="post_id"
                                                    value={post.id}
                                                />

                                                {myAvatarUrl ? (
                                                    <img
                                                        src={
                                                            myAvatarUrl
                                                        }
                                                        alt="내 프로필"
                                                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs">
                                                        👤
                                                    </div>
                                                )}

                                                <div className="flex min-w-0 flex-1 items-center rounded-full bg-gray-50">
                                                    <input
                                                        type="text"
                                                        name="content"
                                                        maxLength={
                                                            300
                                                        }
                                                        required
                                                        placeholder="댓글 남기기..."
                                                        className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[13px] outline-none placeholder:text-gray-300"
                                                    />

                                                    <button
                                                        type="submit"
                                                        className="shrink-0 px-4 text-xs font-black text-black"
                                                    >
                                                        등록
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </article>
                                )
                            )}
                        </section>
                    </div>
                </>
            )}

            {/* 하단 메뉴 */}
            <nav className="fixed bottom-0 left-1/2 z-30 flex h-[72px] w-full max-w-[720px] -translate-x-1/2 items-center border-x border-t border-gray-100 bg-white/95 px-8 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
                <a
                    href="/"
                    className="flex flex-1 flex-col items-center justify-center gap-1 text-black"
                >
                    <span className="text-[22px] leading-none">
                        ⌂
                    </span>

                    <span className="text-[10px] font-black">
                        피드
                    </span>
                </a>

                <a
                    href="/settings"
                    className="flex flex-1 flex-col items-center justify-center gap-1 text-gray-300"
                >
                    <span className="text-[20px] leading-none">
                        ●
                    </span>

                    <span className="text-[10px] font-bold">
                        내 정보
                    </span>
                </a>
            </nav>
        </main>
    );
}

export default function Home({
                                 searchParams,
                             }: {
    searchParams: Promise<{
        group?: string;
    }>;
}) {
    return (
        <Suspense
            fallback={
                <main className="mx-auto min-h-screen w-full max-w-[720px] bg-[#f7f7f7] px-4 py-8 sm:px-6">
                    <div className="animate-pulse">
                        <div className="h-4 w-16 rounded bg-gray-200" />
                        <div className="mt-3 h-7 w-32 rounded bg-gray-200" />

                        <div className="mt-8 h-40 rounded-[28px] bg-gray-100" />
                        <div className="mt-3 h-40 rounded-[28px] bg-gray-100" />
                    </div>
                </main>
            }
        >
            <Feed searchParams={searchParams} />
        </Suspense>
    );
}