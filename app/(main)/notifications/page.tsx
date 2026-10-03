import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { markNotificationsAsRead } from "../../actions";

async function NotificationsContent() {
    const supabase =
        await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(
            "/auth/login"
        );
    }

    // ========================================
    // 알림 조회
    // ========================================

    const {
        data: notifications,
        error: notificationsError,
    } = await supabase
        .from("notifications")
        .select(`
            id,
            type,
            post_id,
            comment_id,
            is_read,
            created_at,
            actor_id,

            profiles!notifications_actor_id_fkey (
                nickname,
                avatar_url
            ),

            posts (
                group_id
            )
        `)
        .eq(
            "user_id",
            user.id
        )
        .order(
            "created_at",
            {
                ascending:
                    false,
            }
        );

    if (
        notificationsError
    ) {
        console.error(
            "알림 조회 실패:",
            notificationsError
        );
    }

    // ========================================
    // 읽지 않은 알림
    // ========================================

    const unreadCount =
        notifications?.filter(
            (
                notification: any
            ) =>
                !notification.is_read
        ).length ?? 0;

    if (unreadCount > 0) {
        await markNotificationsAsRead();
    }

    // ========================================
    // 프로필 사진 Signed URL
    // ========================================

    const notificationsWithAvatars =
        await Promise.all(
            (
                notifications ??
                []
            ).map(
                async (
                    notification: any
                ) => {
                    let avatarUrl:
                        | string
                        | null = null;

                    if (
                        notification
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
                                    notification
                                        .profiles
                                        .avatar_url,
                                    60 *
                                    60
                                );

                        avatarUrl =
                            data?.signedUrl ??
                            null;
                    }

                    return {
                        ...notification,
                        avatar_url:
                        avatarUrl,
                    };
                }
            )
        );

    return (
        <main className="mx-auto min-h-screen w-full max-w-[720px] border-x border-gray-100 bg-[#f7f7f7] pb-28 text-gray-950">
            <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur-xl">
                <div className="flex h-[76px] items-center px-4 sm:px-7">
                    <Link
                        href="/"
                        aria-label="피드로 돌아가기"
                        className="mr-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-gray-100"
                    >
                        <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path
                                d="M15 18L9 12L15 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </Link>

                    <div>
                        <p className="text-[11px] font-semibold tracking-wide text-gray-400">
                            우리끼리
                        </p>

                        <h1 className="mt-0.5 text-[21px] font-black tracking-tight sm:text-[23px]">
                            알림
                        </h1>
                    </div>
                </div>
            </header>

            <div className="px-3 pt-4 sm:px-6 sm:pt-6">
                <section className="mb-4 rounded-[26px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.035)] sm:p-6">
                    <p className="text-[10px] font-bold tracking-wider text-gray-400">
                        NOTIFICATIONS
                    </p>

                    <div className="mt-1 flex items-end justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-black tracking-tight">
                                새로운 소식
                            </h2>

                            <p className="mt-1 text-sm text-gray-400">
                                친구들의 반응을 확인해보세요.
                            </p>
                        </div>

                        {unreadCount >
                            0 && (
                                <div className="flex h-10 min-w-10 items-center justify-center rounded-full bg-black px-3 text-sm font-black text-white">
                                    {unreadCount >
                                    99
                                        ? "99+"
                                        : unreadCount}
                                </div>
                            )}
                    </div>
                </section>

                {notificationsWithAvatars.length ===
                    0 && (
                        <section className="rounded-[26px] bg-white px-5 py-20 text-center shadow-[0_2px_16px_rgba(0,0,0,0.035)]">
                            <div className="text-4xl">
                                ♡
                            </div>

                            <h2 className="mt-5 text-lg font-black">
                                아직 알림이
                                없어요
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-gray-400">
                                친구가 새 게시물을
                                올리거나
                                <br />
                                좋아요와 댓글을
                                남기면 여기에
                                표시돼요.
                            </p>
                        </section>
                    )}

                {notificationsWithAvatars.length >
                    0 && (
                        <section className="overflow-hidden rounded-[26px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.035)]">
                            {notificationsWithAvatars.map(
                                (
                                    notification: any,
                                    index: number
                                ) => {
                                    const nickname =
                                        notification
                                            .profiles
                                            ?.nickname ??
                                        "친구";

                                    const type =
                                        notification.type;

                                    const groupId =
                                        notification
                                            .posts
                                            ?.group_id;

                                    const postUrl =
                                        groupId
                                            ? `/?group=${groupId}#post-${notification.post_id}`
                                            : "/";

                                    return (
                                        <Link
                                            key={
                                                notification.id
                                            }
                                            href={
                                                postUrl
                                            }
                                            className={
                                                index ===
                                                0
                                                    ? "group flex gap-3.5 px-5 py-5 transition hover:bg-gray-50 sm:px-6"
                                                    : "group flex gap-3.5 border-t border-gray-100 px-5 py-5 transition hover:bg-gray-50 sm:px-6"
                                            }
                                        >
                                            <div className="relative shrink-0">
                                                {notification.avatar_url ? (
                                                    <img
                                                        src={
                                                            notification.avatar_url
                                                        }
                                                        alt={`${nickname} 프로필`}
                                                        className="h-12 w-12 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                                                        👤
                                                    </div>
                                                )}

                                                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-black text-[11px] text-white">
                                                    {getNotificationIcon(
                                                        type
                                                    )}
                                                </div>
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="text-[14px] leading-6 text-gray-700">
                                                <span className="font-black text-black">
                                                    {
                                                        nickname
                                                    }
                                                </span>

                                                    {getNotificationMessage(
                                                        type
                                                    )}
                                                </p>

                                                <time
                                                    className="mt-1 block text-[11px] text-gray-400"
                                                    dateTime={
                                                        notification.created_at
                                                    }
                                                >
                                                    {formatNotificationDate(
                                                        notification.created_at
                                                    )}
                                                </time>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-3">
                                                {!notification.is_read && (
                                                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                                                )}

                                                <svg
                                                    width="18"
                                                    height="18"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    aria-hidden="true"
                                                    className="text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-500"
                                                >
                                                    <path
                                                        d="M9 18L15 12L9 6"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </div>
                                        </Link>
                                    );
                                }
                            )}
                        </section>
                    )}
            </div>
        </main>
    );
}

// ========================================
// 알림 문구
// ========================================

function getNotificationMessage(
    type: string
) {
    switch (type) {
        case "like":
            return "님이 회원님의 게시물을 좋아합니다.";

        case "comment":
            return "님이 회원님의 게시물에 댓글을 남겼습니다.";

        case "reply":
            return "님이 회원님의 댓글에 답글을 남겼습니다.";

        case "mention":
            return "님이 댓글에서 회원님을 언급했습니다.";

        case "post":
            return "님이 새 게시물을 올렸어요.";

        default:
            return "님의 새로운 활동이 있어요.";
    }
}

// ========================================
// 알림 아이콘
// ========================================

function getNotificationIcon(
    type: string
) {
    switch (type) {
        case "like":
            return "♥";

        case "comment":
            return "●";

        case "reply":
            return "↩";

        case "mention":
            return "@";

        case "post":
            return "＋";

        default:
            return "●";
    }
}

// ========================================
// 날짜
// 서버/브라우저에서 같은 결과가 나오도록
// 고정된 숫자 형식 사용
// ========================================

function formatNotificationDate(
    dateString: string
) {
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
                hour12: false,
            }
        ).formatToParts(
            new Date(dateString)
        );

    const getPart = (
        type: Intl.DateTimeFormatPartTypes
    ) =>
        parts.find(
            (part) =>
                part.type === type
        )?.value ?? "";

    return `${getPart("month")}. ${getPart("day")}. ${getPart("hour")}:${getPart("minute")}`;
}

export default function NotificationsPage() {
    return (
        <Suspense
            fallback={
                <main className="mx-auto min-h-screen w-full max-w-[720px] border-x border-gray-100 bg-[#f7f7f7] px-4 py-8">
                    <div className="animate-pulse">
                        <div className="h-4 w-16 rounded bg-gray-200" />

                        <div className="mt-3 h-7 w-24 rounded bg-gray-200" />

                        <div className="mt-8 h-32 rounded-[26px] bg-gray-100" />

                        <div className="mt-4 h-24 rounded-[26px] bg-gray-100" />

                        <div className="mt-3 h-24 rounded-[26px] bg-gray-100" />
                    </div>
                </main>
            }
        >
            <NotificationsContent />
        </Suspense>
    );
}