import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { markNotificationsAsRead } from "../actions";
import Link from "next/link";

async function NotificationsContent() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
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
        .eq("user_id", user.id)
        .order("created_at", {
            ascending: false,
        });

    if (notificationsError) {
        console.error(
            "알림 조회 실패:",
            notificationsError
        );
    }

    // ========================================
    // 페이지 진입 당시 읽지 않은 알림 개수
    // ========================================

    const unreadCount =
        notifications?.filter(
            (notification: any) =>
                !notification.is_read
        ).length ?? 0;

    // ========================================
    // 알림 읽음 처리
    // ========================================

    if (unreadCount > 0) {
        await markNotificationsAsRead();
    }

    // ========================================
    // 상대방 프로필 사진 Signed URL
    // ========================================

    const notificationsWithAvatars =
        await Promise.all(
            (notifications ?? []).map(
                async (notification: any) => {
                    let avatarUrl:
                        | string
                        | null = null;

                    if (
                        notification.profiles
                            ?.avatar_url
                    ) {
                        const { data } =
                            await supabase.storage
                                .from("avatars")
                                .createSignedUrl(
                                    notification
                                        .profiles
                                        .avatar_url,
                                    60 * 60
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

            {/* ========================================
                HEADER
            ======================================== */}
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
                            xmlns="http://www.w3.org/2000/svg"
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

            {/* ========================================
                CONTENT
            ======================================== */}
            <div className="px-3 pt-4 sm:px-6 sm:pt-6">

                {/* 알림 요약 */}
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

                        {unreadCount > 0 && (
                            <div className="flex h-10 min-w-10 items-center justify-center rounded-full bg-black px-3 text-sm font-black text-white">
                                {unreadCount > 99
                                    ? "99+"
                                    : unreadCount}
                            </div>
                        )}

                    </div>
                </section>

                {/* ========================================
                    알림 없음
                ======================================== */}
                {notificationsWithAvatars.length ===
                    0 && (
                        <section className="rounded-[26px] bg-white px-5 py-20 text-center shadow-[0_2px_16px_rgba(0,0,0,0.035)]">

                            <div className="text-4xl">
                                ♡
                            </div>

                            <h2 className="mt-5 text-lg font-black">
                                아직 알림이 없어요
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-gray-400">
                                친구가 게시물에 좋아요를 누르거나
                                <br />
                                댓글을 남기면 여기에 표시돼요.
                            </p>

                        </section>
                    )}

                {/* ========================================
                    알림 목록
                ======================================== */}
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

                                    const isLike =
                                        notification.type ===
                                        "like";

                                    const groupId =
                                        notification.posts
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
                                                index === 0
                                                    ? "group flex gap-3.5 px-5 py-5 transition hover:bg-gray-50 sm:px-6"
                                                    : "group flex gap-3.5 border-t border-gray-100 px-5 py-5 transition hover:bg-gray-50 sm:px-6"
                                            }
                                        >
                                            {/* 프로필 */}
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
                                                    {isLike
                                                        ? "♥"
                                                        : "●"}
                                                </div>

                                            </div>

                                            {/* 내용 */}
                                            <div className="min-w-0 flex-1">

                                                <p className="text-[14px] leading-6 text-gray-700">
                                                <span className="font-black text-black">
                                                    {
                                                        nickname
                                                    }
                                                </span>

                                                    {isLike
                                                        ? "님이 회원님의 게시물을 좋아합니다."
                                                        : "님이 회원님의 게시물에 댓글을 남겼습니다."}
                                                </p>

                                                <time className="mt-1 block text-[11px] text-gray-400">
                                                    {new Date(
                                                        notification.created_at
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

                                            {/* 오른쪽 영역 */}
                                            <div className="flex shrink-0 items-center gap-3">

                                                {/* 아직 읽지 않았던 알림 */}
                                                {!notification.is_read && (
                                                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                                                )}

                                                {/* 이동 화살표 */}
                                                <svg
                                                    width="18"
                                                    height="18"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    xmlns="http://www.w3.org/2000/svg"
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

            {/* ========================================
                하단 메뉴
            ======================================== */}

            <nav className="fixed bottom-0 left-1/2 z-50 flex h-[calc(64px+env(safe-area-inset-bottom))] w-full max-w-[720px] -translate-x-1/2 items-start border-x border-t border-black/[0.06] bg-white px-4 pb-[env(safe-area-inset-bottom)] pt-1">

                {/* 피드 */}
                <Link
                    href="/"
                    aria-label="피드"
                    className="flex h-[60px] flex-1 flex-col items-center justify-center gap-1 text-gray-400"
                >
                    <HomeIcon />

                    <span className="text-[9px] font-bold">
            피드
        </span>
                </Link>

                {/* 알림 */}
                <Link
                    href="/notifications"
                    aria-label="알림"
                    className="flex h-[60px] flex-1 flex-col items-center justify-center gap-1 text-gray-950"
                >
                    <BellIcon />

                    <span className="text-[9px] font-black">
            알림
        </span>
                </Link>

                {/* 내 정보 */}
                <Link
                    href="/settings"
                    aria-label="내 정보"
                    className="flex h-[60px] flex-1 flex-col items-center justify-center gap-1 text-gray-400"
                >
                    <UserIcon />

                    <span className="text-[9px] font-bold">
            내 정보
        </span>
                </Link>
            </nav>
        </main>
    );
}
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