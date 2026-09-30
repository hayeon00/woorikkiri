import Link from "next/link";
import { Suspense } from "react";

async function ErrorContent({
                                searchParams,
                            }: {
    searchParams: Promise<{ error?: string }>;
}) {
    const params = await searchParams;

    return (
        <div className="mt-6 rounded-[22px] bg-red-50 px-5 py-4">
            <p className="text-sm font-bold text-red-500">
                인증을 완료하지 못했어요.
            </p>

            {params?.error && (
                <p className="mt-2 break-words text-xs leading-5 text-red-400">
                    {params.error}
                </p>
            )}
        </div>
    );
}

export default function Page({
                                 searchParams,
                             }: {
    searchParams: Promise<{ error?: string }>;
}) {
    return (
        <main className="min-h-svh bg-[#f6f6f4]">
            <div className="mx-auto flex min-h-svh w-full max-w-[480px] items-center px-6 py-10 sm:px-8">
                <section className="w-full rounded-[32px] bg-white px-6 py-8 text-center shadow-[0_8px_40px_rgba(0,0,0,0.05)] sm:px-8 sm:py-10">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-[22px] shadow-sm">
                        <img
                            src="/icon-192.png"
                            alt="우리끼리"
                            className="h-full w-full object-cover"
                        />
                    </div>

                    <p className="mt-4 text-[12px] font-bold tracking-[0.18em] text-gray-400">
                        WOORIKKIRI
                    </p>

                    <h1 className="mt-2 text-[28px] font-black tracking-[-0.04em] text-gray-950">
                        문제가 발생했어요
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-gray-400">
                        인증 링크가 만료되었거나
                        <br />
                        처리 과정에서 문제가 발생했을 수 있어요.
                    </p>

                    <Suspense
                        fallback={
                            <div className="mt-6 h-20 animate-pulse rounded-[22px] bg-gray-50" />
                        }
                    >
                        <ErrorContent searchParams={searchParams} />
                    </Suspense>

                    <Link
                        href="/auth/login"
                        className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-[#171717] text-sm font-bold text-white transition hover:bg-black"
                    >
                        로그인 화면으로 돌아가기
                    </Link>

                    <p className="mt-9 text-[11px] leading-5 text-gray-300">
                        친한 사람들과 나누는
                        <br />
                        우리만의 작은 공간
                    </p>
                </section>
            </div>
        </main>
    );
}