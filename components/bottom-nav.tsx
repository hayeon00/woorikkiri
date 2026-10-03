"use client";

import {
    useEffect,
} from "react";

import Link from "next/link";

import {
    usePathname,
    useRouter,
} from "next/navigation";

type BottomNavProps = {
    currentUserId: string;
};

export function BottomNav({
                              currentUserId,
                          }: BottomNavProps) {
    const pathname =
        usePathname();

    const router =
        useRouter();

    // ========================================
    // 자주 사용하는 화면 미리 불러오기
    // ========================================

    useEffect(() => {
        router.prefetch("/");

        router.prefetch(
            `/profile/${currentUserId}`
        );

        router.prefetch(
            "/notifications"
        );

        router.prefetch(
            "/settings"
        );
    }, [
        router,
        currentUserId,
    ]);

    const isFeed =
        pathname === "/";

    const isMyFeed =
        pathname ===
        `/profile/${currentUserId}`;

    const isNotifications =
        pathname.startsWith(
            "/notifications"
        );

    const isSettings =
        pathname.startsWith(
            "/settings"
        );

    return (
        <nav className="fixed bottom-0 left-1/2 z-50 flex h-[calc(64px+env(safe-area-inset-bottom))] w-full max-w-[720px] -translate-x-1/2 items-start border-x border-t border-black/[0.06] bg-white px-2 pb-[env(safe-area-inset-bottom)] pt-1">

            {/* ========================================
                피드
            ======================================== */}

            <Link
                href="/"
                prefetch={true}
                aria-label="피드"
                className={`flex h-[60px] flex-1 flex-col items-center justify-center gap-1 ${
                    isFeed
                        ? "text-gray-950"
                        : "text-gray-400"
                }`}
            >
                <HomeIcon />

                <span
                    className={
                        isFeed
                            ? "text-[9px] font-black"
                            : "text-[9px] font-bold"
                    }
                >
                    피드
                </span>
            </Link>

            {/* ========================================
                내 피드
            ======================================== */}

            <Link
                href={`/profile/${currentUserId}`}
                prefetch={true}
                aria-label="내 피드"
                className={`flex h-[60px] flex-1 flex-col items-center justify-center gap-1 ${
                    isMyFeed
                        ? "text-gray-950"
                        : "text-gray-400"
                }`}
            >
                <GridIcon />

                <span
                    className={
                        isMyFeed
                            ? "text-[9px] font-black"
                            : "text-[9px] font-bold"
                    }
                >
                    내 피드
                </span>
            </Link>

            {/* ========================================
                알림
            ======================================== */}

            <Link
                href="/notifications"
                prefetch={true}
                aria-label="알림"
                className={`flex h-[60px] flex-1 flex-col items-center justify-center gap-1 ${
                    isNotifications
                        ? "text-gray-950"
                        : "text-gray-400"
                }`}
            >
                <BellIcon />

                <span
                    className={
                        isNotifications
                            ? "text-[9px] font-black"
                            : "text-[9px] font-bold"
                    }
                >
                    알림
                </span>
            </Link>

            {/* ========================================
                내 정보
            ======================================== */}

            <Link
                href="/settings"
                prefetch={true}
                aria-label="내 정보"
                className={`flex h-[60px] flex-1 flex-col items-center justify-center gap-1 ${
                    isSettings
                        ? "text-gray-950"
                        : "text-gray-400"
                }`}
            >
                <UserIcon />

                <span
                    className={
                        isSettings
                            ? "text-[9px] font-black"
                            : "text-[9px] font-bold"
                    }
                >
                    내 정보
                </span>
            </Link>
        </nav>
    );
}

// ========================================
// 피드 아이콘
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

// ========================================
// 내 피드 아이콘
// ========================================

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

// ========================================
// 알림 아이콘
// ========================================

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

// ========================================
// 내 정보 아이콘
// ========================================

function UserIcon() {
    return (
        <svg
            width="20"
            height="20"
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