import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ProfileImageViewer } from "@/components/profile-image-viewer";
import { ProfilePostGallery } from "@/components/profile-post-gallery";
import {
    toggleLike,
    createComment,
    deleteComment,
} from "../../../actions";

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

    const {
        data: myProfile,
        error: myProfileError,
    } = await supabase
        .from("profiles")
        .select(`
        nickname,
        avatar_url
    `)
        .eq(
            "id",
            user.id
        )
        .maybeSingle();

    if (myProfileError) {
        console.error(
            "내 프로필 조회 실패:",
            myProfileError
        );
    }

    let myAvatarUrl:
        | string
        | null = null;

    if (
        myProfile?.avatar_url
    ) {
        const {
            data,
            error,
        } =
            await supabase.storage
                .from("avatars")
                .createSignedUrl(
                    myProfile.avatar_url,
                    60 * 60
                );

        if (error) {
            console.error(
                "내 프로필 사진 URL 생성 실패:",
                error
            );
        }

        myAvatarUrl =
            data?.signedUrl ??
            null;
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
// 보이는 모든 공간의 멤버
// ========================================

    let allGroupMembers: any[] =
        [];

    if (
        visibleGroupIds.length >
        0
    ) {
        const {
            data,
            error,
        } = await supabase
            .from(
                "group_members"
            )
            .select(`
            group_id,
            user_id,

            profiles (
                nickname,
                avatar_url
            )
        `)
            .in(
                "group_id",
                visibleGroupIds
            );

        if (error) {
            console.error(
                "공간 멤버 조회 실패:",
                error
            );
        }

        allGroupMembers =
            data ?? [];
    }

    const memberAvatarCache =
        new Map<
            string,
            Promise<
                string | null
            >
        >();

    function getMemberAvatarUrl(
        path:
            | string
            | null
            | undefined
    ) {
        if (!path) {
            return Promise.resolve(
                null
            );
        }

        const cached =
            memberAvatarCache.get(
                path
            );

        if (cached) {
            return cached;
        }

        const promise =
            supabase.storage
                .from("avatars")
                .createSignedUrl(
                    path,
                    60 * 60
                )
                .then(
                    ({
                         data,
                         error,
                     }) => {
                        if (error) {
                            console.error(
                                "멤버 프로필 사진 URL 생성 실패:",
                                error
                            );

                            return null;
                        }

                        return (
                            data?.signedUrl ??
                            null
                        );
                    }
                );

        memberAvatarCache.set(
            path,
            promise
        );

        return promise;
    }

    const allGroupMembersWithAvatars =
        await Promise.all(
            allGroupMembers.map(
                async (
                    member: any
                ) => ({
                    ...member,

                    avatar_url:
                        await getMemberAvatarUrl(
                            member
                                .profiles
                                ?.avatar_url
                        ),
                })
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
                ),
                
                comments (
                    id,
                    content,
                    created_at,
                    user_id,
                    parent_id,
                    reply_to_user_id,
                
                    profiles!comments_user_id_fkey (
                        nickname,
                        avatar_url
                    ),
                
                    comment_mentions (
                        user_id
                    )
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

                    const postMembers =
                        allGroupMembersWithAvatars.filter(
                            (
                                member: any
                            ) =>
                                member.group_id ===
                                post.group_id
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
                                    const avatarUrl =
                                        await getMemberAvatarUrl(
                                            comment
                                                .profiles
                                                ?.avatar_url
                                        );

                                    const mentions =
                                        (
                                            comment.comment_mentions ??
                                            []
                                        )
                                            .map(
                                                (
                                                    mention: any
                                                ) => {
                                                    const member =
                                                        postMembers.find(
                                                            (
                                                                item: any
                                                            ) =>
                                                                item.user_id ===
                                                                mention.user_id
                                                        );

                                                    if (
                                                        !member
                                                    ) {
                                                        return null;
                                                    }

                                                    return {
                                                        userId:
                                                        mention.user_id,

                                                        nickname:
                                                            member
                                                                .profiles
                                                                ?.nickname ??
                                                            "사용자",
                                                    };
                                                }
                                            )
                                            .filter(
                                                Boolean
                                            );

                                    const replyToUser =
                                        comment.reply_to_user_id
                                            ? (() => {
                                                const member =
                                                    postMembers.find(
                                                        (
                                                            item: any
                                                        ) =>
                                                            item.user_id ===
                                                            comment.reply_to_user_id
                                                    );

                                                if (
                                                    !member
                                                ) {
                                                    return null;
                                                }

                                                return {
                                                    userId:
                                                    member.user_id,

                                                    nickname:
                                                        member
                                                            .profiles
                                                            ?.nickname ??
                                                        "사용자",
                                                };
                                            })()
                                            : null;

                                    return {
                                        ...comment,

                                        avatar_url:
                                        avatarUrl,

                                        mentions,

                                        replyToUser,
                                    };
                                }
                            )
                        );

                    const members =
                        postMembers.map(
                            (
                                member: any
                            ) => ({
                                userId:
                                member.user_id,

                                nickname:
                                    member
                                        .profiles
                                        ?.nickname ??
                                    "사용자",

                                avatarUrl:
                                    member.avatar_url ??
                                    null,
                            })
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

                        comments:
                        commentsWithAvatars,

                        members,

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

    async function createCommentAction(
        formData: FormData
    ) {
        "use server";

        await createComment(
            formData
        );
    }

    async function deleteCommentAction(
        formData: FormData
    ) {
        "use server";

        const commentId =
            Number(
                formData.get(
                    "comment_id"
                )
            );

        if (
            !Number.isInteger(
                commentId
            ) ||
            commentId <= 0
        ) {
            return;
        }

        await deleteComment(
            commentId
        );
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
                {/* 개인 피드 */}
                <section className="pt-3">
                    <div className="px-4 pb-3 pt-2 sm:px-5">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400">
                                    PROFILE FEED
                                </p>

                                <h2 className="mt-1 text-[17px] font-black tracking-[-0.03em]">
                                    {isMe
                                        ? "내 이야기"
                                        : `${
                                            targetProfile.nickname ??
                                            "친구"
                                        }의 이야기`}
                                </h2>
                            </div>

                            <span className="text-[10px] font-bold text-gray-400">
                {postsWithImages.length}개
            </span>
                        </div>
                    </div>

                    <ProfilePostGallery
                        posts={
                            postsWithImages
                        }
                        groups={groups.map(
                            (group: any) => ({
                                id:
                                group.id,

                                name:
                                group.name,
                            })
                        )}
                        currentUserId={
                            user.id
                        }
                        currentUserAvatarUrl={
                            myAvatarUrl
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
                    />
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