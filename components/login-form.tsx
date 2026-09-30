"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm({
                              className,
                              ...props
                          }: React.ComponentPropsWithoutRef<"div">) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();

    const nextParam = searchParams.get("next");

    const nextPath =
        nextParam &&
        nextParam.startsWith("/") &&
        !nextParam.startsWith("//")
            ? nextParam
            : "/";

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        const supabase = createClient();

        setIsLoading(true);
        setError(null);

        try {
            const { error } =
                await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

            if (error) {
                throw error;
            }

            router.push(nextPath);
            router.refresh();
        } catch (error: unknown) {
            setError(
                error instanceof Error
                    ? error.message
                    : "로그인 중 오류가 발생했습니다."
            );
        } finally {
            setIsLoading(false);
        }
    };

    const signUpHref =
        nextPath !== "/"
            ? `/auth/sign-up?next=${encodeURIComponent(nextPath)}`
            : "/auth/sign-up";

    return (
        <div
            className={cn("w-full", className)}
            {...props}
        >
            {/* 브랜드 */}
            <div className="mb-8 text-center">
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
                    다시 만나서 반가워요
                </h1>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                    우리끼리 계정으로 로그인해주세요.
                </p>
            </div>

            {/* 로그인 폼 */}
            <form onSubmit={handleLogin}>
                <div className="space-y-5">
                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-bold text-gray-800"
                        >
                            이메일
                        </label>

                        <input
                            id="email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            placeholder="example@email.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-14 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white"
                        />
                    </div>

                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <label
                                htmlFor="password"
                                className="text-sm font-bold text-gray-800"
                            >
                                비밀번호
                            </label>

                            <Link
                                href="/auth/forgot-password"
                                className="text-xs font-semibold text-gray-400 transition hover:text-gray-700"
                            >
                                비밀번호 찾기
                            </Link>
                        </div>

                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-14 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-950 outline-none transition focus:border-gray-400 focus:bg-white"
                        />
                    </div>

                    {error && (
                        <div className="rounded-2xl bg-red-50 px-4 py-3">
                            <p className="text-sm font-medium text-red-500">
                                {error}
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#171717] text-sm font-bold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? "로그인 중..." : "로그인"}
                    </button>
                </div>
            </form>

            <div className="mt-7 text-center">
        <span className="text-sm text-gray-400">
          아직 계정이 없으신가요?
        </span>{" "}
                <Link
                    href={signUpHref}
                    className="text-sm font-bold text-gray-900"
                >
                    회원가입
                </Link>
            </div>

            <p className="mt-10 text-center text-[11px] leading-5 text-gray-300">
                친한 사람들과 나누는
                <br />
                우리만의 작은 공간
            </p>
        </div>
    );
}