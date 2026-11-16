import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { GroupSwitcher } from "@/components/group-switcher";
import { CreatePostForm } from "@/components/create-post-form";
import { PostMenu } from "@/components/post-menu";
import { CommentSection } from "@/components/comment-section";
import { PostImageSlider } from "@/components/post-image-slider";
import { FeedRealtime } from "@/components/feed-realtime";
import { LikeButton } from "@/components/like-button";
import { ProfileImageViewer } from "@/components/profile-image-viewer";
import { PushOnboarding } from "@/components/push-onboarding";
import { InviteLinkButton } from "@/components/invite-link-button";
import { formatFullDateTime, formatRelativeTime } from "@/lib/time";
import {
    NotificationTarget,
} from "@/components/notification-target";
import {
    FEED_PAGE,
    nextListLimit,
    parseListLimit,
} from "@/lib/list-pagination";
import {
    fetchFeedPage,
    limitIncludingPost,
} from "@/lib/feed-query";

import {
    toggleLike,
    createComment,
} from "../actions";
import {
    deleteCommentSafe,
    deletePostSafe,
    updatePostSafe,
} from "../safe-actions";

async function Feed({
                        searchParams,
                    }: {
    searchParams: Promise<{
        group?: string;
        post?: string;
        comment?: string;
        limit?: string;
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
// 내 프로필 + 읽지 않은 알림 개수 병렬 조회
// ========================================

    const [
        profileResult,
        notificationCountResult,
    ] = await Promise.all([
        supabase
            .from("profiles")
            .select("nickname, avatar_url")
            .eq("id", user.id)
            .single(),

        supabase
            .from("notifications")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq("user_id", user.id)
            .eq("is_read", false),
    ]);

    const myProfile =
        profileResult.data;

    const unreadNotificationCount =
        notificationCountResult.count;

    if (profileResult.error) {
        console.error(
            "프로필 조회 실패:",
            profileResult.error
        );
    }

    if (notificationCountResult.error) {
        console.error(
            "알림 개수 조회 실패:",
            notificationCountResult.error
        );
    }


// ========================================
// 내 프로필 사진 + 그룹 목록 병렬 처리
// ========================================

    const [
        myAvatarResult,
        membershipResult,
    ] = await Promise.all([
        myProfile?.avatar_url
            ? supabase.storage
                .from("avatars")
                .createSignedUrl(
                    myProfile.avatar_url,
                    60 * 60
                )
            : Promise.resolve({
                data: null,
                error: null,
            }),

        supabase
            .from("group_members")
            .select(`
            group_id,
            joined_at,

            groups (
                id,
                name,
                invite_code,
                invite_code_expires_at,
                owner_id,
                created_at
            )
        `)
            .eq("user_id", user.id)
            .order("sort_order", {
                ascending: true,
            })
            .order("joined_at", {
                ascending: true,
            }),
    ]);

    const myAvatarUrl =
        myAvatarResult.data?.signedUrl ??
        null;

    const memberships =
        membershipResult.data;

    if (myAvatarResult.error) {
        console.error(
            "내 프로필 사진 URL 생성 실패:",
            myAvatarResult.error
        );
    }

    if (membershipResult.error) {
        console.error(
            "그룹 조회 실패:",
            membershipResult.error
        );
    }

    const avatarUrlCache = new Map<
        string,
        Promise<string | null>
    >();

    function getAvatarSignedUrl(
        path: string | null | undefined
    ) {
        if (!path) {
            return Promise.resolve(null);
        }

        const cached =
            avatarUrlCache.get(path);

        if (cached) {
            return cached;
        }

        const promise = supabase.storage
            .from("avatars")
            .createSignedUrl(
                path,
                60 * 60
            )
            .then(({ data, error }) => {
                if (error) {
                    console.error(
                        "프로필 사진 URL 생성 실패:",
                        error
                    );

                    return null;
                }

                return data?.signedUrl ?? null;
            });

        avatarUrlCache.set(
            path,
            promise
        );

        return promise;
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

    // 초대코드가 아직 유효할 때만 초대 버튼을 보여준다 (S4: 7일 만료)
    const inviteActive =
        Boolean(currentGroup?.invite_code) &&
        Boolean(currentGroup?.invite_code_expires_at) &&
        Date.parse(currentGroup.invite_code_expires_at) > Date.now();

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
                async (member: any) => ({
                    ...member,
                    avatar_url:
                        await getAvatarSignedUrl(
                            member.profiles?.avatar_url
                        ),
                })
            )
        );

    // ========================================
    // 게시글 (B1: limit 기반 "더 보기")
    //
    // 알림 딥링크(?post=)로 들어온 게시물이 첫 페이지 밖에 있으면
    // 그 게시물까지 보이도록 limit을 늘린다.
    // ========================================

    const requestedLimit = parseListLimit(
        params.limit,
        FEED_PAGE
    );

    const feedLimit = currentGroup
        ? await limitIncludingPost(
            supabase,
            currentGroup.id,
            Number(params.post),
            requestedLimit,
            FEED_PAGE
        )
        : requestedLimit;

    const {
        posts,
        total: totalPostCount,
        error: postsError,
    } = await fetchFeedPage(
        supabase,
        currentGroup?.id ?? -1,
        feedLimit
    );

    const nextFeedLimit = nextListLimit(
        feedLimit,
        posts.length,
        totalPostCount,
        FEED_PAGE
    );

    if (postsError) {
        console.error(
            "게시글 조회 실패:",
            postsError
        );

        // 기술 오류 문구는 Sentry·서버 로그로만 남기고, 화면에는 할 일을 안내한다.
        return (
            <main className="flex min-h-svh items-center justify-center bg-[#f6f6f4] px-6 pb-28">
                <div className="w-full max-w-[360px] rounded-[28px] bg-white p-7 text-center shadow-[0_12px_40px_rgba(0,0,0,0.05)]">
                    <p className="text-[18px] font-black tracking-[-0.03em]">
                        피드를 불러오지 못했어요
                    </p>

                    <p className="mt-2 text-[14px] leading-6 text-gray-500">
                        인터넷 연결을 확인한 뒤
                        <br />
                        다시 시도해주세요.
                    </p>

                    <Link
                        href={
                            currentGroup
                                ? `/?group=${currentGroup.id}`
                                : "/"
                        }
                        className="mt-6 flex h-12 items-center justify-center rounded-full bg-gray-950 text-[14px] font-black text-white transition active:scale-95"
                    >
                        다시 시도
                    </Link>
                </div>
            </main>
        );
    }


    // ========================================
    // 게시글 / 프로필 사진 Signed URL
    // ========================================

    // 게시물 이미지 경로를 중복 없이 수집
    const allImagePaths = [
        ...new Set(
            (posts ?? []).flatMap((post: any) =>
                (post.post_images ?? []).map(
                    (image: any) => image.image_path as string
                )
            )
        ),
    ];

// 여러 이미지의 Signed URL을 한 번에 생성
    const signedImageResult =
        allImagePaths.length > 0
            ? await supabase.storage
                .from("post-images")
                .createSignedUrls(
                    allImagePaths,
                    60 * 60
                )
            : null;

    if (signedImageResult?.error) {
        console.error(
            "게시물 이미지 URL 일괄 생성 실패:",
            signedImageResult.error
        );
    }

// 이미지 경로별 Signed URL 저장
    const signedImageMap = new Map<
        string,
        string
    >();

    signedImageResult?.data?.forEach(
        (item, index) => {
            if (item.signedUrl) {
                signedImageMap.set(
                    allImagePaths[index],
                    item.signedUrl
                );
            }
        }
    );

    const postsWithImages =
        await Promise.all(
            (posts ?? []).map(
                async (post: any) => {
                    const sortedPostImages = [
                        ...(post.post_images ?? []),
                    ].sort(
                        (a: any, b: any) =>
                            a.sort_order - b.sort_order
                    );

                    const imageUrls = sortedPostImages
                        .map((postImage: any) => {
                            const imageUrl = signedImageMap.get(
                                postImage.image_path
                            );

                            if (!imageUrl) {
                                return null;
                            }

                            return {
                                id: postImage.id,
                                image_path: postImage.image_path,
                                sort_order: postImage.sort_order,
                                image_url: imageUrl,
                            };
                        })
                        .filter(
                            (image): image is {
                                id: number;
                                image_path: string;
                                sort_order: number;
                                image_url: string;
                            } => image !== null
                        );

                    const authorAvatarUrl =
                        await getAvatarSignedUrl(
                            post.profiles?.avatar_url
                        );


                    const commentsWithAvatars =
                        await Promise.all(
                            (
                                post.comments ??
                                []
                            ).map(
                                async (
                                    comment: any
                                ) => {
                                    const commentAvatarUrl =
                                        await getAvatarSignedUrl(
                                            comment.profiles?.avatar_url
                                        );

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
                        image_urls:
                        imageUrls,
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

    async function toggleLikeAction(
        postId: number
    ) {
        "use server";

        await toggleLike(postId);
    }

    // ========================================
    // 화면
    // ========================================

    return (
        <main className="min-h-screen bg-[#f6f6f4] text-[#111]">

            <NotificationTarget />

            {currentGroup && (
                <FeedRealtime
                    groupId={currentGroup.id}
                />
            )}

            <div className="mx-auto min-h-screen w-full xl:grid xl:max-w-[1360px] xl:grid-cols-[250px_minmax(0,760px)_300px] xl:gap-6 xl:px-4 2xl:px-0">

                {/* ========================================
                    PC 왼쪽 사이드바
                ======================================== */}

                <aside className="hidden xl:block">
                    <div className="sticky top-0 flex h-screen flex-col px-3 py-8">

                        <Link
                            href="/"
                            className="flex items-center gap-3 px-3"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gray-950 text-[16px] font-black text-white">
                                W
                            </div>

                            <span className="text-[20px] font-black tracking-[-0.04em]">
                                우리끼리
                            </span>
                        </Link>

                        <nav className="mt-10 space-y-1">

                            <Link
                                href="/"
                                className="flex h-12 items-center gap-3 rounded-[16px] bg-white px-4 text-[14px] font-black shadow-[0_4px_20px_rgba(0,0,0,0.035)]"
                            >
                                <HomeIcon />
                                피드
                            </Link>

                            <Link
                                href={`/profile/${user.id}`}
                                className="flex h-12 items-center gap-3 rounded-[16px] px-4 text-[14px] font-bold text-gray-500 transition hover:bg-white"
                            >
                                <GridIcon />
                                내 피드
                            </Link>

                            <Link
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
                            </Link>

                            <Link
                                href="/settings"
                                className="flex h-12 items-center gap-3 rounded-[16px] px-4 text-[14px] font-bold text-gray-500 transition hover:bg-white"
                            >
                                <UserIcon />
                                내 정보
                            </Link>
                        </nav>

                        {memberships &&
                            memberships.length >
                            0 && (
                                <div className="mt-9">
                                    <p className="px-4 text-[12px] font-black tracking-[0.08em] text-gray-400">
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
                                                    <Link
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
                                                    </Link>
                                                );
                                            }
                                        )}
                                    </div>
                                </div>
                            )}

                        <div className="mt-auto px-3">
                            <Link
                                href="/settings"
                                className="flex items-center gap-3 rounded-[18px] p-2 transition hover:bg-white"
                            >
                                {myAvatarUrl ? (
                                    <ProfileImageViewer
                                        src={myAvatarUrl}
                                        alt="내 프로필 사진"
                                        className="h-9 w-9 rounded-full border border-black/[0.05] object-cover"
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

                                    <p className="mt-0.5 text-[11px] text-gray-400">
                                        내 정보 보기
                                    </p>
                                </div>
                            </Link>
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
                                <Link
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
                                </Link>

                                <Link
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
                                </Link>
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

                            <Link
                                href="/settings"
                                className="mt-7 flex h-12 items-center justify-center rounded-full bg-gray-950 px-6 text-sm font-black text-white transition active:scale-95"
                            >
                                공간 만들기
                            </Link>
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

                                            <p className="mt-0.5 truncate text-[12px] text-gray-400">
                                                우리끼리
                                                편하게
                                                이야기해요
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-1.5">
                                        {inviteActive && (
                                            <InviteLinkButton
                                                inviteCode={currentGroup.invite_code}
                                                groupName={currentGroup.name}
                                                variant="chip"
                                            />
                                        )}

                                        <Link
                                            href="/settings"
                                            aria-label="공간 관리"
                                            title="공간 관리"
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200"
                                        >
                                            <SettingsIcon />
                                        </Link>
                                    </div>
                                </div>
                            </section>

                            {/* 혼자일 때: 친구 초대 안내 */}
                            {groupMembersWithAvatars.length <= 1 && (
                                <section className="mx-3 mt-3 rounded-[22px] bg-gray-950 p-5 text-white sm:mx-5 xl:mx-6 xl:mt-6">
                                    <p className="text-[16px] font-black tracking-[-0.02em]">
                                        아직 혼자 있는 공간이에요
                                    </p>
                                    <p className="mt-1.5 text-[13px] leading-5 text-white/70">
                                        친구를 초대하면 서로의 이야기를 볼 수 있어요.
                                    </p>
                                    <div className="mt-4">
                                        {inviteActive ? (
                                            <InviteLinkButton
                                                inviteCode={currentGroup.invite_code}
                                                groupName={currentGroup.name}
                                                variant="block"
                                            />
                                        ) : (
                                            <Link
                                                href="/settings"
                                                className="flex h-11 items-center justify-center rounded-[14px] bg-white text-[13px] font-black text-gray-950"
                                            >
                                                초대코드 새로 만들기
                                            </Link>
                                        )}
                                    </div>
                                </section>
                            )}

                            <div className="space-y-3 px-3 pt-3 sm:px-5 sm:pt-5 xl:px-6 xl:pt-6">

                                <PushOnboarding />

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
                                            totalPostCount ??
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
                                                key={post.id}
                                                className="scroll-mt-24 overflow-hidden rounded-[22px] border border-black/[0.04] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.025)]"
                                            >
                                                {/* 작성자 */}
                                                <div className="flex items-center justify-between gap-3 px-4 pb-2.5 pt-4 sm:px-5 sm:pt-5">

                                                    <div className="flex min-w-0 items-center gap-3">

                                                        {post.author_avatar_url ? (
                                                            <ProfileImageViewer
                                                                src={post.author_avatar_url}
                                                                alt={`${post.profiles?.nickname ?? "친구"} 프로필 사진`}
                                                                className="h-10 w-10 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                                                <UserIcon />
                                                            </div>
                                                        )}

                                                        <div className="min-w-0">
                                                            {post.user_id ? (
                                                                <Link
                                                                    href={`/profile/${post.user_id}`}
                                                                    className="block truncate text-[13px] font-black text-gray-950 transition hover:text-gray-500"
                                                                >
                                                                    {post.profiles?.nickname ??
                                                                        "사용자"}
                                                                </Link>
                                                            ) : (
                                                                <p className="truncate text-[13px] font-black text-gray-500">
                                                                    탈퇴한 사용자
                                                                </p>
                                                            )}

                                                            <time
                                                                dateTime={post.created_at}
                                                                title={formatFullDateTime(post.created_at)}
                                                                className="mt-0.5 block text-[12px] font-medium text-gray-400"
                                                            >
                                                                {formatRelativeTime(
                                                                    post.created_at
                                                                )}
                                                            </time>
                                                        </div>
                                                    </div>

                                                    {post.user_id === user.id && (
                                                        <PostMenu
                                                            postId={post.id}
                                                            currentContent={
                                                                post.content ?? ""
                                                            }
                                                            updateAction={
                                                                updatePostSafe
                                                            }
                                                            deleteAction={
                                                                deletePostSafe
                                                            }
                                                        />
                                                    )}
                                                </div>

                                                {/* 글 */}
                                                {post.content && (
                                                    <p className="whitespace-pre-wrap break-words px-4 pb-3 text-[14px] leading-[1.65] text-gray-900 sm:px-5 sm:pb-4 sm:text-[15px]">
                                                        {
                                                            post.content
                                                        }
                                                    </p>
                                                )}

                                                {/* 사진 */}
                                                {post.image_urls?.length > 0 && (
                                                    <PostImageSlider
                                                        images={
                                                            post.image_urls
                                                        }
                                                    />
                                                )}

                                                {/* 반응 / 댓글 */}
                                                <div className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5">

                                                    <div className="flex items-center gap-5">

                                                        {/* 좋아요 */}
                                                        <LikeButton
                                                            postId={post.id}
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
                                                    <CommentSection
                                                        postId={post.id}
                                                        comments={(post.comments ?? []).map(
                                                            (comment: any) => ({
                                                                ...comment,

                                                                mentions: (
                                                                    comment.comment_mentions ??
                                                                    []
                                                                )
                                                                    .map(
                                                                        (mention: any) => {
                                                                            const member =
                                                                                groupMembersWithAvatars.find(
                                                                                    (
                                                                                        item: any
                                                                                    ) =>
                                                                                        item.user_id ===
                                                                                        mention.user_id
                                                                                );

                                                                            if (!member) {
                                                                                return null;
                                                                            }

                                                                            return {
                                                                                userId:
                                                                                mention.user_id,

                                                                                nickname:
                                                                                    member.profiles
                                                                                        ?.nickname ??
                                                                                    "사용자",
                                                                            };
                                                                        }
                                                                    )
                                                                    .filter(Boolean),

                                                                replyToUser:
                                                                    comment.reply_to_user_id
                                                                        ? (() => {
                                                                            const member =
                                                                                groupMembersWithAvatars.find(
                                                                                    (
                                                                                        item: any
                                                                                    ) =>
                                                                                        item.user_id ===
                                                                                        comment.reply_to_user_id
                                                                                );

                                                                            if (!member) {
                                                                                return null;
                                                                            }

                                                                            return {
                                                                                userId:
                                                                                member.user_id,

                                                                                nickname:
                                                                                    member.profiles
                                                                                        ?.nickname ??
                                                                                    "사용자",
                                                                            };
                                                                        })()
                                                                        : null,
                                                            })
                                                        )}
                                                        currentUserId={user.id}
                                                        avatarUrl={myAvatarUrl}
                                                        members={groupMembersWithAvatars.map(
                                                            (member: any) => ({
                                                                userId:
                                                                member.user_id,

                                                                nickname:
                                                                    member.profiles
                                                                        ?.nickname ??
                                                                    "사용자",

                                                                avatarUrl:
                                                                    member.avatar_url ??
                                                                    null,
                                                            })
                                                        )}
                                                        createAction={createComment}
                                                        deleteAction={
                                                            deleteCommentSafe
                                                        }
                                                    />
                                                </div>
                                            </article>
                                        )
                                    )}

                                    {/* 더 보기 (B1) */}
                                    {nextFeedLimit !== null && (
                                        <Link
                                            href={`/?group=${currentGroup.id}&limit=${nextFeedLimit}`}
                                            scroll={false}
                                            className="flex h-12 items-center justify-center rounded-[18px] border border-black/[0.04] bg-white text-[13px] font-black text-gray-600 transition hover:bg-gray-50 active:scale-[0.99]"
                                        >
                                            이전 이야기 더 보기
                                        </Link>
                                    )}

                                    {nextFeedLimit === null &&
                                        totalPostCount !== null &&
                                        postsWithImages.length <
                                        totalPostCount && (
                                            <p className="px-1 py-4 text-center text-[11px] text-gray-400">
                                                피드에서는 최근 {postsWithImages.length}개까지 볼 수 있어요.
                                            </p>
                                        )}
                                </section>
                            </div>
                        </>
                    )}

                </div>

                {/* ========================================
                    PC 오른쪽 사이드바
                ======================================== */}

                <aside className="hidden xl:block">
                    <div className="sticky top-0 py-8">

                        {currentGroup && (
                            <div className="rounded-[26px] border border-black/[0.04] bg-white p-6 shadow-[0_10px_35px_rgba(0,0,0,0.035)]">

                                <p className="text-[12px] font-black tracking-[0.08em] text-gray-400">
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

                                <p className="mt-1 text-[12px] leading-5 text-gray-400">
                                    우리끼리 편하게
                                    이야기하는
                                    <br />
                                    비공개 공간이에요.
                                </p>

                                <Link
                                    href="/settings"
                                    className="mt-5 flex h-10 items-center justify-center rounded-[14px] bg-gray-100 text-[11px] font-black text-gray-600 transition hover:bg-gray-200"
                                >
                                    공간 관리
                                </Link>
                            </div>
                        )}

                        <div className="mt-4 px-2 text-[11px] leading-5 text-gray-300">
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

function GridIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <rect
                x="3"
                y="3"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.8"
            />

            <rect
                x="14"
                y="3"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.8"
            />

            <rect
                x="3"
                y="14"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.8"
            />

            <rect
                x="14"
                y="14"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.8"
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


// ========================================
// PAGE
// ========================================

export default function Home({
                                 searchParams,
                             }: {
    searchParams: Promise<{
        group?: string;
        post?: string;
        comment?: string;
        limit?: string;
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
function SettingsIcon() {
    return (
        <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M4 7h10M18 7h2M4 17h4M12 17h8"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
            />
            <circle cx="16" cy="7" r="2" stroke="currentColor" strokeWidth="1.9" />
            <circle cx="10" cy="17" r="2" stroke="currentColor" strokeWidth="1.9" />
        </svg>
    );
}
