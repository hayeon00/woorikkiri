"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * 화면을 그리다 예상하지 못한 오류가 났을 때 보여주는 화면.
 * (Next.js 기본 "Application error" 화면 대신)
 *
 * 운영 빌드에서는 error.message가 감춰지므로 원인 대신 digest(오류 번호)만
 * 보여주고, 문의할 때 알려 달라고 안내한다.
 */
export default function ErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("화면 오류:", error);
    }, [error]);

    return (
        <main className="flex min-h-svh items-center justify-center bg-[#f6f6f4] px-6 py-10">
            <section className="w-full max-w-[420px] rounded-[28px] bg-white px-6 py-10 text-center shadow-[0_8px_40px_rgba(0,0,0,0.05)]">
                <p className="text-[11px] font-bold tracking-[0.16em] text-gray-400">
                    우리끼리
                </p>

                <h1 className="mt-3 text-[22px] font-black tracking-[-0.03em] text-gray-950">
                    화면을 불러오지 못했어요
                </h1>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                    잠시 후 다시 시도해주세요.
                    <br />
                    계속 같은 화면이 보이면 아래 오류 번호와 함께 알려주세요.
                </p>

                {error.digest && (
                    <p className="mt-4 font-mono text-[11px] text-gray-400">
                        오류 번호 {error.digest}
                    </p>
                )}

                <div className="mt-7 flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={reset}
                        className="flex h-12 items-center justify-center rounded-2xl bg-gray-950 text-sm font-bold text-white transition hover:bg-black"
                    >
                        다시 시도
                    </button>

                    <Link
                        href="/"
                        className="flex h-12 items-center justify-center rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
                    >
                        피드로 가기
                    </Link>
                </div>
            </section>
        </main>
    );
}
