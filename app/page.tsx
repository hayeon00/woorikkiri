import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

import {
    createPost,
    toggleLike,
    createComment,
    deletePost,
    deleteComment,
} from "./actions";

async function Feed({
                        searchParams,
                    }: {
    searchParams: Promise<{
        group?: string;
    }>;
}) {
    const supabase = await createClient();

    const params = await searchParams;

    // ========================================
    // 로그인 사용자 확인
    // ========================================

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return (
            <main className="mx-auto min-h-screen max-w-md p-6">
                <h1 className="text-3xl font-bold">
                    우리끼리
                </h1>

                <p className="mt-3 text-gray-500">
                    친한 사람들끼리 남기는 작은 공간
                </p>

                <a
                    href="/auth/login"
                    className="mt-8 inline-block rounded-xl bg-black px-5 py-3 text-white"
                >
                    로그인하기
                </a>
            </main>
        );
    }

    // ========================================
    // 내 프로필
    // ========================================

    const { data: myProfile } =
        await supabase
            .from("profiles")
            .select(
                "nickname, avatar_url"
            )
            .eq("id", user.id)
            .single();

    let myAvatarUrl:
        | string
        | null = null;

    if (myProfile?.avatar_url) {
        const { data } =
            await supabase.storage
                .from("avatars")
                .createSignedUrl(
                    myProfile.avatar_url,
                    60 * 60
                );

        myAvatarUrl =
            data?.signedUrl ?? null;
    }

    // ========================================
    // 내가 가입한 그룹
    // ========================================

    const {
        data: memberships,
        error: membershipError,
    } = await supabase
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
        .eq(
            "user_id",
            user.id
        )
        .order(
            "joined_at",
            {
                ascending: true,
            }
        );

    if (membershipError) {
        console.error(
            "그룹 조회 실패:",
            membershipError
        );
    }

    // ========================================
    // 현재 선택된 그룹
    // ========================================

    const requestedGroupId =
        Number(params.group);

    const requestedMembership =
        memberships?.find(
            (membership: any) =>
                membership.group_id ===
                requestedGroupId
        );

    const currentMembership =
        requestedMembership ??
        memberships?.[0] ??
        null;

    const currentGroup: any =
        currentMembership?.groups ??
        null;

    // ========================================
    // 현재 그룹 멤버
    // ========================================

    let groupMembers: any[] = [];

    if (currentGroup) {
        const {
            data,
            error,
        } = await supabase
            .from("group_members")
            .select(`
                user_id,
                joined_at,

                profiles (
                    nickname,
                    avatar_url
                )
            `)
            .eq(
                "group_id",
                currentGroup.id
            )
            .order(
                "joined_at",
                {
                    ascending: true,
                }
            );

        if (error) {
            console.error(
                "그룹 멤버 조회 실패:",
                error
            );
        } else {
            groupMembers =
                data ?? [];
        }
    }

    // ========================================
    // 그룹 멤버 프로필 사진
    // ========================================

    const groupMembersWithAvatars =
        await Promise.all(
            groupMembers.map(
                async (
                    member: any
                ) => {
                    let avatarUrl:
                        | string
                        | null = null;

                    if (
                        member.profiles
                            ?.avatar_url
                    ) {
                        const { data } =
                            await supabase.storage
                                .from(
                                    "avatars"
                                )
                                .createSignedUrl(
                                    member
                                        .profiles
                                        .avatar_url,
                                    60 * 60
                                );

                        avatarUrl =
                            data?.signedUrl ??
                            null;
                    }

                    return {
                        ...member,
                        avatar_url:
                        avatarUrl,
                    };
                }
            )
        );

    // ========================================
    // 현재 그룹 게시글
    // ========================================

    const {
        data: posts,
        error: postsError,
    } = await supabase
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
            currentGroup?.id ??
            -1
        )
        .order(
            "created_at",
            {
                ascending: false,
            }
        );

    if (postsError) {
        console.error(
            "게시글 조회 실패:",
            postsError
        );

        return (
            <main className="mx-auto min-h-screen max-w-md p-5">

                <h1 className="text-2xl font-bold">
                    우리끼리
                </h1>

                <div className="mt-8 rounded-2xl border p-5">

                    <p className="font-semibold">
                        게시글을 불러오지 못했습니다.
                    </p>

                    <p className="mt-2 text-sm text-red-500">
                        {postsError.message}
                    </p>

                </div>

            </main>
        );
    }

    // ========================================
    // 게시글 / 프로필 Signed URL
    // ========================================

    const postsWithImages =
        await Promise.all(
            (posts ?? []).map(
                async (
                    post: any
                ) => {
                    // 게시글 사진

                    let imageUrl:
                        | string
                        | null = null;

                    if (
                        post.image_path
                    ) {
                        const { data } =
                            await supabase.storage
                                .from(
                                    "post-images"
                                )
                                .createSignedUrl(
                                    post.image_path,
                                    60 * 60
                                );

                        imageUrl =
                            data?.signedUrl ??
                            null;
                    }

                    // 게시글 작성자 사진

                    let authorAvatarUrl:
                        | string
                        | null = null;

                    if (
                        post.profiles
                            ?.avatar_url
                    ) {
                        const { data } =
                            await supabase.storage
                                .from(
                                    "avatars"
                                )
                                .createSignedUrl(
                                    post
                                        .profiles
                                        .avatar_url,
                                    60 * 60
                                );

                        authorAvatarUrl =
                            data?.signedUrl ??
                            null;
                    }

                    // 댓글 작성자 사진

                    const commentsWithAvatars =
                        await Promise.all(
                            (
                                post.comments ??
                                []
                            ).map(
                                async (
                                    comment: any
                                ) => {
                                    let commentAvatarUrl:
                                        | string
                                        | null =
                                        null;

                                    if (
                                        comment
                                            .profiles
                                            ?.avatar_url
                                    ) {
                                        const {
                                            data,
                                        } =
                                            await supabase.storage
                                                .from(
                                                    "avatars"
                                                )
                                                .createSignedUrl(
                                                    comment
                                                        .profiles
                                                        .avatar_url,
                                                    60 *
                                                    60
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

                    // 내가 좋아요 했는지

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

                        image_url:
                        imageUrl,

                        author_avatar_url:
                        authorAvatarUrl,

                        comments:
                        commentsWithAvatars,

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

    // ========================================
    // 화면
    // ========================================

    return (
        <main className="mx-auto min-h-screen max-w-md border-x bg-white pb-24">

            {/* ================================= */}
            {/* 상단 헤더 */}
            {/* ================================= */}

            <header className="sticky top-0 z-20 border-b bg-white/95 px-5 py-4 backdrop-blur">

                <div className="flex items-center justify-between">

                    <div>

                        <p className="text-xs text-gray-400">
                            우리끼리
                        </p>

                        <h1 className="text-xl font-bold">
                            {currentGroup
                                ? currentGroup.name
                                : "피드"}
                        </h1>

                    </div>


                    <a
                        href="/settings"
                        className="flex items-center gap-2"
                    >

                        {myAvatarUrl ? (

                            <img
                                src={
                                    myAvatarUrl
                                }
                                alt="내 프로필"
                                className="h-9 w-9 rounded-full object-cover"
                            />

                        ) : (

                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm">
                                👤
                            </div>

                        )}

                    </a>

                </div>

            </header>


            <div className="p-5">

                {/* ================================= */}
                {/* 그룹이 없는 경우 */}
                {/* ================================= */}

                {!currentGroup && (

                    <section className="py-16 text-center">

                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-2xl">
                            👥
                        </div>

                        <h2 className="mt-5 text-lg font-bold">
                            아직 참여한 공간이 없어요
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-gray-400">
                            친구들과 새 공간을 만들거나
                            <br />
                            초대코드로 참여해보세요.
                        </p>

                        <a
                            href="/settings"
                            className="mt-6 inline-block rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
                        >
                            공간 만들기 / 참여하기
                        </a>

                    </section>

                )}


                {/* ================================= */}
                {/* 그룹이 있는 경우 */}
                {/* ================================= */}

                {currentGroup && (

                    <>

                        {/* ================================= */}
                        {/* 그룹 전환 */}
                        {/* ================================= */}

                        {memberships &&
                            memberships.length >
                            1 && (

                                <section className="mb-5">

                                    <div className="flex gap-2 overflow-x-auto pb-1">

                                        {memberships.map(
                                            (
                                                membership: any
                                            ) => {
                                                const group =
                                                    membership.groups;

                                                if (
                                                    !group
                                                ) {
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
                                                                ? "shrink-0 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white"
                                                                : "shrink-0 rounded-full border px-4 py-2 text-sm text-gray-500"
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


                        {/* ================================= */}
                        {/* 현재 공간 정보 */}
                        {/* ================================= */}

                        <section className="mb-5 rounded-3xl bg-black p-5 text-white">

                            <div className="flex items-start justify-between gap-4">

                                <div className="min-w-0">

                                    <p className="text-xs text-gray-400">
                                        현재 공간
                                    </p>

                                    <h2 className="mt-1 truncate text-xl font-bold">
                                        {
                                            currentGroup.name
                                        }
                                    </h2>

                                </div>

                                <a
                                    href="/settings"
                                    className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-xs"
                                >
                                    관리
                                </a>

                            </div>


                            <div className="mt-5 flex items-center justify-between">

                                {/* 멤버 프로필 */}

                                <div className="flex items-center">

                                    {groupMembersWithAvatars
                                        .slice(
                                            0,
                                            4
                                        )
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
                                                            alt="멤버 프로필"
                                                            className="h-9 w-9 rounded-full border-2 border-black object-cover"
                                                        />

                                                    ) : (

                                                        <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-gray-200 text-xs text-black">
                                                            👤
                                                        </div>

                                                    )}

                                                </div>

                                            )
                                        )}

                                    <span className="ml-3 text-xs text-gray-300">
                                        {
                                            groupMembersWithAvatars.length
                                        }
                                        명
                                    </span>

                                </div>


                                <div className="text-right">

                                    <p className="text-[10px] text-gray-400">
                                        초대코드
                                    </p>

                                    <p className="font-mono text-sm font-bold tracking-wider">
                                        {
                                            currentGroup.invite_code
                                        }
                                    </p>

                                </div>

                            </div>

                        </section>


                        {/* ================================= */}
                        {/* 게시글 작성 */}
                        {/* ================================= */}

                        <form
                            action={
                                createPost
                            }
                            className="mb-6 rounded-3xl border p-4"
                        >

                            <input
                                type="hidden"
                                name="group_id"
                                value={
                                    currentGroup.id
                                }
                            />


                            <div className="flex items-start gap-3">

                                {myAvatarUrl ? (

                                    <img
                                        src={
                                            myAvatarUrl
                                        }
                                        alt="내 프로필"
                                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                                    />

                                ) : (

                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm">
                                        👤
                                    </div>

                                )}


                                <textarea
                                    name="content"
                                    placeholder={`${myProfile?.nickname ?? "친구"}님, 지금 뭐하고 있어요?`}
                                    maxLength={
                                        500
                                    }
                                    className="min-h-20 min-w-0 flex-1 resize-none pt-2 text-sm outline-none"
                                />

                            </div>


                            <div className="mt-3 flex items-center justify-between border-t pt-3">

                                <label className="cursor-pointer rounded-full px-2 py-1 text-sm">

                                    📷 사진

                                    <input
                                        type="file"
                                        name="image"
                                        accept="image/*"
                                        className="hidden"
                                    />

                                </label>

                                <button
                                    type="submit"
                                    className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white"
                                >
                                    올리기
                                </button>

                            </div>

                        </form>


                        {/* ================================= */}
                        {/* 피드 제목 */}
                        {/* ================================= */}

                        <div className="mb-3 flex items-center justify-between">

                            <h2 className="font-bold">
                                우리 피드
                            </h2>

                            <span className="text-xs text-gray-400">
                                게시글{" "}
                                {
                                    postsWithImages.length
                                }
                                개
                            </span>

                        </div>


                        {/* ================================= */}
                        {/* 게시글 목록 */}
                        {/* ================================= */}

                        <section className="space-y-4">

                            {postsWithImages.length ===
                                0 && (

                                    <div className="rounded-3xl border p-10 text-center">

                                        <div className="text-3xl">
                                            ✏️
                                        </div>

                                        <p className="mt-4 font-semibold">
                                            아직 게시글이 없어요
                                        </p>

                                        <p className="mt-2 text-sm text-gray-400">
                                            이 공간의 첫 게시글을 남겨보세요.
                                        </p>

                                    </div>

                                )}


                            {postsWithImages.map(
                                (
                                    post: any
                                ) => (

                                    <article
                                        key={
                                            post.id
                                        }
                                        className="overflow-hidden rounded-3xl border bg-white"
                                    >

                                        {/* 작성자 */}

                                        <div className="flex items-center justify-between p-4">

                                            <div className="flex min-w-0 items-center gap-3">

                                                {post.author_avatar_url ? (

                                                    <img
                                                        src={
                                                            post.author_avatar_url
                                                        }
                                                        alt="작성자 프로필 사진"
                                                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                                                    />

                                                ) : (

                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm">
                                                        👤
                                                    </div>

                                                )}


                                                <div className="min-w-0">

                                                    <p className="truncate text-sm font-semibold">
                                                        {post
                                                                .profiles
                                                                ?.nickname ??
                                                            "친구"}
                                                    </p>

                                                    <time className="text-xs text-gray-400">
                                                        {new Date(
                                                            post.created_at
                                                        ).toLocaleString(
                                                            "ko-KR"
                                                        )}
                                                    </time>

                                                </div>

                                            </div>


                                            {/* 내 게시글 삭제 */}

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
                                                            className="px-2 text-xs text-gray-400"
                                                        >
                                                            삭제
                                                        </button>

                                                    </form>

                                                )}

                                        </div>


                                        {/* 게시글 사진 */}

                                        {post.image_url && (

                                            <img
                                                src={
                                                    post.image_url
                                                }
                                                alt="게시글 사진"
                                                className="max-h-[520px] w-full object-cover"
                                            />

                                        )}


                                        <div className="p-4">

                                            {/* 게시글 내용 */}

                                            {post.content && (

                                                <p className="whitespace-pre-wrap break-words text-[15px] leading-6">
                                                    {
                                                        post.content
                                                    }
                                                </p>

                                            )}


                                            {/* 좋아요 */}

                                            <div className="mt-4">

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
                                                        className="flex items-center gap-2"
                                                    >

                                                        <span className="text-2xl leading-none">
                                                            {post.liked_by_me
                                                                ? "♥"
                                                                : "♡"}
                                                        </span>

                                                        <span className="text-sm font-semibold">
                                                            {
                                                                post.like_count
                                                            }
                                                        </span>

                                                    </button>

                                                </form>

                                            </div>


                                            {/* ================================= */}
                                            {/* 댓글 */}
                                            {/* ================================= */}

                                            <div className="mt-4 border-t pt-4">

                                                <p className="mb-4 text-sm font-semibold">
                                                    댓글{" "}
                                                    {post
                                                            .comments
                                                            ?.length ??
                                                        0}
                                                </p>


                                                <div className="space-y-4">

                                                    {post.comments
                                                        ?.sort(
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
                                                                    className="flex items-start justify-between gap-3"
                                                                >

                                                                    <div className="flex min-w-0 items-start gap-2">

                                                                        {comment.avatar_url ? (

                                                                            <img
                                                                                src={
                                                                                    comment.avatar_url
                                                                                }
                                                                                alt="댓글 작성자 프로필 사진"
                                                                                className="h-8 w-8 shrink-0 rounded-full object-cover"
                                                                            />

                                                                        ) : (

                                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs">
                                                                                👤
                                                                            </div>

                                                                        )}


                                                                        <div className="min-w-0 rounded-2xl bg-gray-50 px-3 py-2 text-sm">

                                                                            <p className="font-semibold">
                                                                                {comment
                                                                                        .profiles
                                                                                        ?.nickname ??
                                                                                    "친구"}
                                                                            </p>

                                                                            <p className="mt-0.5 break-words">
                                                                                {
                                                                                    comment.content
                                                                                }
                                                                            </p>

                                                                        </div>

                                                                    </div>


                                                                    {/* 내 댓글 삭제 */}

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
                                                                                    className="shrink-0 pt-2 text-xs text-gray-400"
                                                                                >
                                                                                    삭제
                                                                                </button>

                                                                            </form>

                                                                        )}

                                                                </div>

                                                            )
                                                        )}

                                                </div>


                                                {/* 댓글 작성 */}

                                                <form
                                                    action={
                                                        createComment
                                                    }
                                                    className="mt-4 flex gap-2"
                                                >

                                                    <input
                                                        type="hidden"
                                                        name="post_id"
                                                        value={
                                                            post.id
                                                        }
                                                    />

                                                    <input
                                                        type="text"
                                                        name="content"
                                                        maxLength={
                                                            300
                                                        }
                                                        required
                                                        placeholder="댓글을 입력하세요"
                                                        className="min-w-0 flex-1 rounded-full bg-gray-50 px-4 py-2.5 text-sm outline-none"
                                                    />

                                                    <button
                                                        type="submit"
                                                        className="shrink-0 rounded-full bg-black px-4 py-2 text-sm text-white"
                                                    >
                                                        등록
                                                    </button>

                                                </form>

                                            </div>

                                        </div>

                                    </article>

                                )
                            )}

                        </section>

                    </>

                )}

            </div>


            {/* ================================= */}
            {/* 하단 메뉴 */}
            {/* ================================= */}

            <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 border-t bg-white/95 px-6 py-3 backdrop-blur">

                <a
                    href="/"
                    className="flex flex-1 flex-col items-center gap-1 text-xs font-semibold text-black"
                >

                    <span className="text-xl">
                        ⌂
                    </span>

                    <span>
                        피드
                    </span>

                </a>


                <a
                    href="/settings"
                    className="flex flex-1 flex-col items-center gap-1 text-xs text-gray-400"
                >

                    <span className="text-xl">
                        ●
                    </span>

                    <span>
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
                <main className="mx-auto min-h-screen max-w-md border-x bg-white p-6">
                    <h1 className="text-2xl font-bold">
                        우리끼리
                    </h1>

                    <p className="mt-3 text-sm text-gray-400">
                        피드를 불러오는 중...
                    </p>
                </main>
            }
        >
            <Feed
                searchParams={searchParams}
            />
        </Suspense>
    );
}