"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
                               className,
                               ...props
                           }: React.ComponentPropsWithoutRef<"div">) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
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

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();

        const supabase = createClient();

        setIsLoading(true);
        setError(null);

        if (password !== repeatPassword) {
            setError("비밀번호가 서로 일치하지 않습니다.");
            setIsLoading(false);
            return;
        }

        try {
            const callbackUrl =
                `${window.location.origin}` +
                `/auth/confirm?next=${encodeURIComponent(nextPath)}`;

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: callbackUrl,
                },
            });

            if (error) {
                throw error;
            }

            if (data.session) {
                router.push(nextPath);
                router.refresh();
                return;
            }

            router.push(
                `/auth/sign-up-success?next=${encodeURIComponent(nextPath)}`
            );
        } catch (error: unknown) {
            setError(
                error instanceof Error
                    ? error.message
                    : "회원가입 중 오류가 발생했습니다."
            );
        } finally {
            setIsLoading(false);
        }
    };

    const loginHref =
        nextPath !== "/"
            ? `/auth/login?next=${encodeURIComponent(nextPath)}`
            : "/auth/login";

    return (
        <div
            className={cn("w-full", className)}
            {...props}
        >
            {/* 브랜드 */}
            <div className="mb-7 text-center">
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
                    우리끼리에 오신 걸 환영해요
                </h1>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                    우리만의 작은 공간을 시작해보세요.
                </p>
            </div>

            {/* 회원가입 폼 */}
            <form onSubmit={handleSignUp}>
                <div className="space-y-4">
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
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-bold text-gray-800"
                        >
                            비밀번호
                        </label>

                        <input
                            id="password"
                            type="password"
                            autoComplete="new-password"
                            placeholder="비밀번호를 입력해주세요"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-14 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="repeat-password"
                            className="mb-2 block text-sm font-bold text-gray-800"
                        >
                            비밀번호 확인
                        </label>

                        <input
                            id="repeat-password"
                            type="password"
                            autoComplete="new-password"
                            placeholder="비밀번호를 한 번 더 입력해주세요"
                            required
                            value={repeatPassword}
                            onChange={(e) => setRepeatPassword(e.target.value)}
                            className="h-14 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white"
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
                        className="mt-1 flex h-14 w-full items-center justify-center rounded-2xl bg-[#171717] text-sm font-bold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? "계정 만드는 중..." : "회원가입"}
                    </button>
                </div>
            </form>

            <div className="mt-7 text-center">
        <span className="text-sm text-gray-400">
          이미 계정이 있으신가요?
        </span>{" "}
                <Link
                    href={loginHref}
                    className="text-sm font-bold text-gray-900"
                >
                    로그인
                </Link>
            </div>

            <p className="mt-9 text-center text-[11px] leading-5 text-gray-300">
                친한 사람들과 나누는
                <br />
                우리만의 작은 공간
            </p>
        </div>
    );
}