import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { GroupSwitcher } from "@/components/group-switcher";
import { CreatePostForm } from "@/components/create-post-form";
import { PostMenu } from "@/components/post-menu";
import { CommentDeleteButton } from "@/components/comment-delete-button";

import {
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

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    // ========================================
    // 내 프로필
    // ========================================

    const { data: myProfile } = await supabase
        .from("profiles")
        .select("nickname, avatar_url")
        .eq("id", user.id)
        .single();

    // ========================================
    // 읽지 않은 알림 개수
    // ========================================

    const {
        count: unreadNotificationCount,
        error: notificationCountError,
    } = await supabase
        .from("notifications")
        .select("id", {
            count: "exact",
            head: true,
        })
        .eq("user_id", user.id)
        .eq("is_read", false);

    if (notificationCountError) {
        console.error(
            "알림 개수 조회 실패:",
            notificationCountError
        );
    }

    // ========================================
    // 내 프로필 사진
    // ========================================

    let myAvatarUrl: string | null = null;

    if (myProfile?.avatar_url) {
        const { data } = await supabase.storage
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
        .eq("user_id", user.id)
        .order("joined_at", {
            ascending: true,
        });

    if (membershipError) {
        console.error(
            "그룹 조회 실패:",
            membershipError
        );
    }

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
        currentMembership?.groups ?? null;

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
            .order("joined_at", {
                ascending: true,
            });

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

    const groupMembersWithAvatars =
        await Promise.all(
            groupMembers.map(
                async (member: any) => {
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
    // 게시글
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

    // ========================================
    // 게시글 / 프로필 사진 Signed URL
    // ========================================

    const postsWithImages =
        await Promise.all(
            (posts ?? []).map(
                async (post: any) => {
                    let imageUrl:
                        | string
                        | null = null;

                    if (post.image_path) {
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
                                ?.length ?? 0,
                        liked_by_me:
                        likedByMe,
                    };
                }
            )
        );

    // ========================================
    // 그룹 선택기에 전달할 그룹 목록
    // ========================================

    const groupOptions =
        memberships
            ?.map(
                (membership: any) => {
                    const group =
                        membership.groups;

                    if (!group) {
                        return null;
                    }

                    return {
                        id: group.id,
                        name: group.name,
                    };
                }
            )
            .filter(
                (
                    group
                ): group is {
                    id: number;
                    name: string;
                } => group !== null
            ) ?? [];

    async function deletePostAction(
        formData: FormData
    ) {
        "use server";

        const postId = Number(
            formData.get("post_id")
        );

        if (
            !Number.isInteger(postId) ||
            postId <= 0
        ) {
            return;
        }

        await deletePost(postId);
    }

    async function deleteCommentAction(
        formData: FormData
    ) {
        "use server";

        const commentId = Number(
            formData.get("comment_id")
        );

        if (
            !Number.isInteger(commentId) ||
            commentId <= 0
        ) {
            return;
        }

        await deleteComment(commentId);
    }

    // ========================================
    // 화면
    // ========================================

    return (
        <main className="min-h-screen bg-[#f6f6f4] text-[#111]">
            <div className="mx-auto min-h-screen w-full xl:grid xl:max-w-[1360px] xl:grid-cols-[250px_minmax(0,760px)_300px] xl:gap-6 xl:px-4 2xl:px-0">

                {/* ========================================
                    PC 왼쪽 사이드바
                ======================================== */}

                <aside className="hidden xl:block">
                    <div className="sticky top-0 flex h-screen flex-col px-3 py-8">

                        <a
                            href="/"
                            className="flex items-center gap-3 px-3"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gray-950 text-[16px] font-black text-white">
                                W
                            </div>

                            <span className="text-[20px] font-black tracking-[-0.04em]">
                                우리끼리
                            </span>
                        </a>

                        <nav className="mt-10 space-y-1">

                            <a
                                href="/"
                                className="flex h-12 items-center gap-3 rounded-[16px] bg-white px-4 text-[14px] font-black shadow-[0_4px_20px_rgba(0,0,0,0.035)]"
                            >
                                <HomeIcon />
                                피드
                            </a>

                            <a
                                href="/notifications"
                                className="flex h-12 items-center justify-between rounded-[16px] px-4 text-[14px] font-bold text-gray-500 transition hover:bg-white"
                            >
                                <span className="flex items-center gap-3">
                                    <BellIcon />
                                    알림
                                </span>

                                {(unreadNotificationCount ??
                                    0) > 0 && (
                                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[9px] font-black text-white">
                                        {(unreadNotificationCount ??
                                            0) > 99
                                            ? "99+"
                                            : unreadNotificationCount}
                                    </span>
                                )}
                            </a>

                            <a
                                href="/settings"
                                className="flex h-12 items-center gap-3 rounded-[16px] px-4 text-[14px] font-bold text-gray-500 transition hover:bg-white"
                            >
                                <UserIcon />
                                내 정보
                            </a>
                        </nav>

                        {memberships &&
                            memberships.length >
                            0 && (
                                <div className="mt-9">
                                    <p className="px-4 text-[10px] font-black tracking-[0.08em] text-gray-400">
                                        내 공간
                                    </p>

                                    <div className="mt-3 space-y-1">
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
                                                    currentGroup?.id ===
                                                    group.id;

                                                return (
                                                    <a
                                                        key={
                                                            group.id
                                                        }
                                                        href={`/?group=${group.id}`}
                                                        className={
                                                            selected
                                                                ? "flex h-10 items-center gap-2.5 rounded-[14px] bg-black/[0.045] px-4 text-[12px] font-black text-gray-950"
                                                                : "flex h-10 items-center gap-2.5 rounded-[14px] px-4 text-[12px] font-bold text-gray-500 transition hover:bg-white"
                                                        }
                                                    >
                                                        <span
                                                            className={
                                                                selected
                                                                    ? "h-1.5 w-1.5 shrink-0 rounded-full bg-gray-950"
                                                                    : "h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300"
                                                            }
                                                        />

                                                        <span className="truncate">
                                                            {
                                                                group.name
                                                            }
                                                        </span>
                                                    </a>
                                                );
                                            }
                                        )}
                                    </div>
                                </div>
                            )}

                        <div className="mt-auto px-3">
                            <a
                                href="/settings"
                                className="flex items-center gap-3 rounded-[18px] p-2 transition hover:bg-white"
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
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-gray-500">
                                        <UserIcon />
                                    </div>
                                )}

                                <div className="min-w-0">
                                    <p className="truncate text-[12px] font-black">
                                        {myProfile?.nickname ??
                                            "친구"}
                                    </p>

                                    <p className="mt-0.5 text-[9px] text-gray-400">
                                        내 정보 보기
                                    </p>
                                </div>
                            </a>
                        </div>
                    </div>
                </aside>

                {/* ========================================
                    중앙 피드
                ======================================== */}

                <div className="mx-auto min-h-screen w-full max-w-[720px] bg-[#f6f6f4] pb-28 sm:border-x sm:border-black/[0.04] xl:mx-0 xl:max-w-none xl:border-x xl:pb-10">

                    {/* HEADER */}
                    {/* HEADER */}
                    {/* HEADER */}
                    <header className="sticky top-0 z-30 border-b border-black/[0.04] bg-[#f6f6f4]/90 backdrop-blur-xl">

                        {/* 모바일 / 태블릿 헤더 */}
                        <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 sm:px-6 xl:hidden">

                            <div className="min-w-0">
                                <p className="text-[11px] font-bold tracking-[-0.01em] text-gray-400">
                                    우리끼리
                                </p>

                                <div className="mt-0.5">
                                    {currentGroup ? (
                                        <GroupSwitcher
                                            currentGroup={{
                                                id: currentGroup.id,
                                                name: currentGroup.name,
                                            }}
                                            groups={groupOptions}
                                        />
                                    ) : (
                                        <h1 className="text-[20px] font-black tracking-[-0.04em] sm:text-[22px]">
                                            우리 피드
                                        </h1>
                                    )}
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                                <a
                                    href="/notifications"
                                    aria-label="알림"
                                    className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-black/[0.04]"
                                >
                                    <BellIcon />

                                    {(unreadNotificationCount ?? 0) > 0 && (
                                        <span className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-[#f6f6f4] bg-red-500 px-0.5 text-[8px] font-black leading-none text-white">
                        {(unreadNotificationCount ?? 0) > 99
                            ? "99+"
                            : unreadNotificationCount}
                    </span>
                                    )}
                                </a>

                                <a
                                    href="/settings"
                                    aria-label="내 정보"
                                    className="ml-1 block shrink-0"
                                >
                                    {myAvatarUrl ? (
                                        <img
                                            src={myAvatarUrl}
                                            alt="내 프로필"
                                            className="h-9 w-9 rounded-full border border-black/[0.05] object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-gray-500">
                                            <UserIcon />
                                        </div>
                                    )}
                                </a>
                            </div>
                        </div>

                        {/* PC 헤더 */}
                        <div className="hidden min-h-[72px] items-center justify-between px-6 xl:flex">

                            <div className="min-w-0">
                                {currentGroup ? (
                                    <GroupSwitcher
                                        currentGroup={{
                                            id: currentGroup.id,
                                            name: currentGroup.name,
                                        }}
                                        groups={groupOptions}
                                    />
                                ) : (
                                    <h1 className="text-[20px] font-black tracking-[-0.04em]">
                                        우리 피드
                                    </h1>
                                )}
                            </div>

                            {currentGroup && (
                                <div className="flex shrink-0 items-center gap-2 text-[11px] font-bold text-gray-400">
                                    <div className="flex items-center">
                                        {groupMembersWithAvatars
                                            .slice(0, 3)
                                            .map(
                                                (
                                                    member: any,
                                                    index: number
                                                ) => (
                                                    <div
                                                        key={member.user_id}
                                                        className={
                                                            index === 0
                                                                ? ""
                                                                : "-ml-1.5"
                                                        }
                                                    >
                                                        {member.avatar_url ? (
                                                            <img
                                                                src={member.avatar_url}
                                                                alt=""
                                                                className="h-6 w-6 rounded-full border-2 border-[#f6f6f4] object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#f6f6f4] bg-gray-200 text-gray-400">
                                                                <UserIcon />
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                    </div>

                                    <span>
                    {groupMembersWithAvatars.length}명
                </span>
                                </div>
                            )}
                        </div>
                    </header>

                    {/* 그룹 없음 */}
                    {!currentGroup && (
                        <section className="flex min-h-[calc(100vh-160px)] flex-col items-center justify-center px-6 text-center">

                            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
                                <GroupIcon />
                            </div>

                            <h2 className="mt-6 text-xl font-black tracking-[-0.03em]">
                                아직 공간이 없어요
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-gray-400">
                                친구들과 우리만의
                                공간을 만들거나
                                <br />
                                받은 초대로
                                참여해보세요.
                            </p>

                            <a
                                href="/settings"
                                className="mt-7 flex h-12 items-center justify-center rounded-full bg-gray-950 px-6 text-sm font-black text-white transition active:scale-95"
                            >
                                공간 만들기
                            </a>
                        </section>
                    )}

                    {currentGroup && (
                        <>
                            {/* 모바일/태블릿 공간 요약 */}
                            <section className="bg-white px-4 py-4 sm:px-6 xl:hidden">
                                <div className="flex items-center justify-between gap-4">

                                    <div className="flex min-w-0 items-center">

                                        <div className="flex shrink-0 items-center">
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
                                                                    alt="멤버"
                                                                    className="h-8 w-8 rounded-full border-2 border-white object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-gray-400">
                                                                    <UserIcon />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                )}
                                        </div>

                                        <div className="ml-3 min-w-0">
                                            <p className="truncate text-[12px] font-bold text-gray-700">
                                                함께하는
                                                친구{" "}
                                                {
                                                    groupMembersWithAvatars.length
                                                }
                                                명
                                            </p>

                                            <p className="mt-0.5 text-[10px] text-gray-400">
                                                우리끼리
                                                편하게
                                                이야기해요
                                            </p>
                                        </div>
                                    </div>

                                    <a
                                        href="/settings"
                                        className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-gray-100 px-3 text-[11px] font-bold text-gray-600 transition hover:bg-gray-200"
                                    >
                                        공간 관리

                                        <ChevronRightIcon />
                                    </a>
                                </div>
                            </section>

                            <div className="space-y-3 px-3 pt-3 sm:px-5 sm:pt-5 xl:px-6 xl:pt-6">

                                {/* 글쓰기 */}
                                <CreatePostForm
                                    groupId={
                                        currentGroup.id
                                    }
                                    nickname={
                                        myProfile?.nickname ??
                                        "친구"
                                    }
                                    avatarUrl={
                                        myAvatarUrl
                                    }
                                />

                                {/* 피드 헤더 */}
                                <div className="flex items-center justify-between px-1 pb-1 pt-5">
                                    <h2 className="text-[17px] font-black tracking-[-0.03em]">
                                        최근 이야기
                                    </h2>

                                    <span className="text-[11px] font-medium text-gray-400">
                                        {
                                            postsWithImages.length
                                        }
                                        개
                                    </span>
                                </div>

                                {/* 게시물 */}
                                <section className="space-y-3 xl:space-y-4">

                                    {postsWithImages.length ===
                                        0 && (
                                            <div className="rounded-[24px] border border-black/[0.04] bg-white px-5 py-16 text-center">

                                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                                    <WriteIcon />
                                                </div>

                                                <p className="mt-4 text-sm font-black">
                                                    아직
                                                    이야기가
                                                    없어요
                                                </p>

                                                <p className="mt-1.5 text-xs text-gray-400">
                                                    첫 번째
                                                    일상을
                                                    공유해보세요.
                                                </p>
                                            </div>
                                        )}

                                    {postsWithImages.map(
                                        (
                                            post: any
                                        ) => (
                                            <article
                                                id={`post-${post.id}`}
                                                key={
                                                    post.id
                                                }
                                                className="scroll-mt-24 overflow-hidden rounded-[24px] border border-black/[0.04] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.025)]"
                                            >
                                                {/* 작성자 */}
                                                <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">

                                                    <div className="flex min-w-0 items-center gap-3">

                                                        {post.author_avatar_url ? (
                                                            <img
                                                                src={
                                                                    post.author_avatar_url
                                                                }
                                                                alt="작성자"
                                                                className="h-10 w-10 shrink-0 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                                                <UserIcon />
                                                            </div>
                                                        )}

                                                        <div className="min-w-0">
                                                            <p className="truncate text-[13px] font-black text-gray-950">
                                                                {post
                                                                        .profiles
                                                                        ?.nickname ??
                                                                    "탈퇴한 사용자"}
                                                            </p>

                                                            <time className="mt-0.5 block text-[10px] font-medium text-gray-400">
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
                                                    </div>

                                                    {post.user_id === user.id && (
                                                        <PostMenu
                                                            postId={post.id}
                                                            deleteAction={
                                                                deletePostAction
                                                            }
                                                        />
                                                    )}
                                                </div>

                                                {/* 글 */}
                                                {post.content && (
                                                    <p className="whitespace-pre-wrap break-words px-4 pb-4 text-[14px] leading-[1.75] text-gray-900 sm:px-5 sm:text-[15px]">
                                                        {
                                                            post.content
                                                        }
                                                    </p>
                                                )}

                                                {/* 사진 */}
                                                {post.image_url && (
                                                    <div className="px-2 sm:px-3">
                                                        <img
                                                            src={
                                                                post.image_url
                                                            }
                                                            alt="게시글 사진"
                                                            className="max-h-[480px] w-full rounded-[20px] bg-gray-100 object-cover sm:max-h-[560px] xl:max-h-[600px]"
                                                        />
                                                    </div>
                                                )}

                                                {/* 반응 / 댓글 */}
                                                <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">

                                                    <div className="flex items-center gap-5">

                                                        {/* 좋아요 */}
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
                                                                className={
                                                                    post.liked_by_me
                                                                        ? "flex items-center gap-1.5 text-red-500"
                                                                        : "flex items-center gap-1.5 text-gray-700 transition hover:text-black"
                                                                }
                                                            >
                                                                <HeartIcon
                                                                    filled={
                                                                        post.liked_by_me
                                                                    }
                                                                />

                                                                <span className="text-[11px] font-black">
                                                                    {
                                                                        post.like_count
                                                                    }
                                                                </span>
                                                            </button>
                                                        </form>

                                                        {/* 댓글 수 */}
                                                        <div className="flex items-center gap-1.5 text-gray-700">
                                                            <CommentIcon />

                                                            <span className="text-[11px] font-black">
                                                                {post
                                                                        .comments
                                                                        ?.length ??
                                                                    0}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* 댓글 목록 */}
                                                    {post.comments
                                                            ?.length >
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
                                                                                        className="h-7 w-7 shrink-0 rounded-full object-cover"
                                                                                    />
                                                                                ) : (
                                                                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                                                                        <UserIcon />
                                                                                    </div>
                                                                                )}

                                                                                <div className="min-w-0 flex-1">
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

                                                                                    {comment.user_id ===
                                                                                        user.id && (
                                                                                            <CommentDeleteButton
                                                                                                commentId={
                                                                                                    comment.id
                                                                                                }
                                                                                                deleteAction={
                                                                                                    deleteCommentAction
                                                                                                }
                                                                                            />
                                                                                        )}
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    )}
                                                            </div>
                                                        )}

                                                    {/* 댓글 작성 */}
                                                    <form
                                                        action={
                                                            createComment
                                                        }
                                                        className="mt-4 flex items-center gap-2"
                                                    >
                                                        <input
                                                            type="hidden"
                                                            name="post_id"
                                                            value={
                                                                post.id
                                                            }
                                                        />

                                                        {myAvatarUrl ? (
                                                            <img
                                                                src={
                                                                    myAvatarUrl
                                                                }
                                                                alt="내 프로필"
                                                                className="h-7 w-7 shrink-0 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                                                <UserIcon />
                                                            </div>
                                                        )}

                                                        <div className="flex min-w-0 flex-1 items-center rounded-full bg-[#f5f5f5]">
                                                            <input
                                                                type="text"
                                                                name="content"
                                                                maxLength={
                                                                    300
                                                                }
                                                                required
                                                                placeholder="댓글 남기기..."
                                                                className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[12px] outline-none placeholder:text-gray-400"
                                                            />

                                                            <button
                                                                type="submit"
                                                                aria-label="댓글 등록"
                                                                className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-950 text-white transition active:scale-90"
                                                            >
                                                                <ArrowUpIcon />
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

                    {/* 모바일/태블릿 하단 내비게이션 */}
                    <nav className="fixed bottom-0 left-1/2 z-30 flex h-[64px] w-full max-w-[720px] -translate-x-1/2 items-center border-t border-black/[0.05] bg-white/95 px-4 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:border-x xl:hidden">

                        <a
                            href="/"
                            aria-label="피드"
                            className="flex h-full flex-1 flex-col items-center justify-center gap-1 text-gray-950"
                        >
                            <HomeIcon />

                            <span className="text-[9px] font-black">
                                피드
                            </span>
                        </a>

                        <a
                            href="/notifications"
                            aria-label="알림"
                            className="flex h-full flex-1 flex-col items-center justify-center gap-1 text-gray-400"
                        >
                            <span className="relative">
                                <BellIcon />

                                {(unreadNotificationCount ??
                                    0) > 0 && (
                                    <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-black leading-none text-white">
                                        {(unreadNotificationCount ??
                                            0) >
                                        99
                                            ? "99+"
                                            : unreadNotificationCount}
                                    </span>
                                )}
                            </span>

                            <span className="text-[9px] font-bold">
                                알림
                            </span>
                        </a>

                        <a
                            href="/settings"
                            aria-label="내 정보"
                            className="flex h-full flex-1 flex-col items-center justify-center gap-1 text-gray-400"
                        >
                            {myAvatarUrl ? (
                                <img
                                    src={
                                        myAvatarUrl
                                    }
                                    alt=""
                                    className="h-[22px] w-[22px] rounded-full object-cover opacity-70"
                                />
                            ) : (
                                <UserIcon />
                            )}

                            <span className="text-[9px] font-bold">
                                내 정보
                            </span>
                        </a>
                    </nav>
                </div>

                {/* ========================================
                    PC 오른쪽 사이드바
                ======================================== */}

                <aside className="hidden xl:block">
                    <div className="sticky top-0 py-8">

                        {currentGroup && (
                            <div className="rounded-[26px] border border-black/[0.04] bg-white p-6 shadow-[0_10px_35px_rgba(0,0,0,0.035)]">

                                <p className="text-[10px] font-black tracking-[0.08em] text-gray-400">
                                    우리 공간
                                </p>

                                <h2 className="mt-2 truncate text-[20px] font-black tracking-[-0.04em]">
                                    {currentGroup.name}
                                </h2>

                                <div className="mt-5 flex items-center">
                                    {groupMembersWithAvatars
                                        .slice(
                                            0,
                                            5
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
                                                            alt=""
                                                            className="h-10 w-10 rounded-full border-2 border-white object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-gray-400">
                                                            <UserIcon />
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        )}
                                </div>

                                <p className="mt-4 text-[12px] font-bold text-gray-700">
                                    함께하는 친구{" "}
                                    {
                                        groupMembersWithAvatars.length
                                    }
                                    명
                                </p>

                                <p className="mt-1 text-[10px] leading-5 text-gray-400">
                                    우리끼리 편하게
                                    이야기하는
                                    <br />
                                    비공개 공간이에요.
                                </p>

                                <a
                                    href="/settings"
                                    className="mt-5 flex h-10 items-center justify-center rounded-[14px] bg-gray-100 text-[11px] font-black text-gray-600 transition hover:bg-gray-200"
                                >
                                    공간 관리
                                </a>
                            </div>
                        )}

                        <div className="mt-4 px-2 text-[9px] leading-5 text-gray-300">
                            우리끼리 · 친구들과 나누는
                            작은 공간
                        </div>
                    </div>
                </aside>
            </div>
        </main>
    );
}

// ========================================
// 공통 아이콘
// ========================================

function HomeIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="m3 11 9-8 9 8"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            <path
                d="M5 10v10h14V10M9 20v-6h6v6"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function BellIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            <path
                d="M10 21h4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
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

function GroupIcon() {
    return (
        <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
            />

            <circle
                cx="9"
                cy="7"
                r="4"
                stroke="currentColor"
                strokeWidth="1.7"
            />

            <path
                d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
            />
        </svg>
    );
}

function WriteIcon() {
    return (
        <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M12 20h9"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
            />

            <path
                d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}


function HeartIcon({
                       filled,
                   }: {
    filled: boolean;
}) {
    return (
        <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill={
                filled
                    ? "currentColor"
                    : "none"
            }
            aria-hidden="true"
        >
            <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function CommentIcon() {
    return (
        <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function ArrowUpIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M12 19V5M5 12l7-7 7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function ChevronRightIcon() {
    return (
        <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="m9 18 6-6-6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

// ========================================
// PAGE
// ========================================

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
                <main className="min-h-screen bg-[#f6f6f4]">
                    <div className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6">
                        <div className="animate-pulse">
                            <div className="h-4 w-16 rounded bg-gray-200" />

                            <div className="mt-3 h-7 w-32 rounded bg-gray-200" />

                            <div className="mt-8 h-20 rounded-[24px] bg-gray-100" />

                            <div className="mt-6 h-80 rounded-[24px] bg-gray-100" />
                        </div>
                    </div>
                </main>
            }
        >
            <Feed
                searchParams={
                    searchParams
                }
            />
        </Suspense>
    );
}