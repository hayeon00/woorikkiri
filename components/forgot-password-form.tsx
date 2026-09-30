"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm({
                                       className,
                                       ...props
                                   }: React.ComponentPropsWithoutRef<"div">) {
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        const supabase = createClient();

        setIsLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/update-password`,
            });

            if (error) {
                throw error;
            }

            setSuccess(true);
        } catch (error: unknown) {
            setError(
                error instanceof Error
                    ? error.message
                    : "비밀번호 재설정 이메일을 보내는 중 오류가 발생했습니다."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={cn("w-full", className)} {...props}>
            <div className="text-center">
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
                    {success ? "이메일을 확인해주세요" : "비밀번호를 잊으셨나요?"}
                </h1>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                    {success ? (
                        <>
                            비밀번호를 다시 설정할 수 있는
                            <br />
                            링크를 이메일로 보냈어요.
                        </>
                    ) : (
                        <>
                            가입한 이메일을 입력하면
                            <br />
                            비밀번호 재설정 링크를 보내드릴게요.
                        </>
                    )}
                </p>
            </div>

            {success ? (
                <div className="mt-8">
                    <div className="rounded-[22px] bg-[#f7f7f5] px-5 py-5 text-center">
                        <p className="text-sm font-bold text-gray-800">
                            {email}
                        </p>

                        <p className="mt-2 text-xs leading-5 text-gray-400">
                            메일이 보이지 않는다면
                            <br />
                            스팸 메일함도 확인해주세요.
                        </p>
                    </div>

                    <Link
                        href="/auth/login"
                        className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-[#171717] text-sm font-bold text-white transition hover:bg-black"
                    >
                        로그인 화면으로 돌아가기
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleForgotPassword} className="mt-8">
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

                    {error && (
                        <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3">
                            <p className="text-sm font-medium text-red-500">
                                {error}
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-5 flex h-14 w-full items-center justify-center rounded-2xl bg-[#171717] text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? "보내는 중..." : "재설정 이메일 보내기"}
                    </button>

                    <div className="mt-7 text-center">
            <span className="text-sm text-gray-400">
              비밀번호가 기억나셨나요?
            </span>{" "}
                        <Link
                            href="/auth/login"
                            className="text-sm font-bold text-gray-900"
                        >
                            로그인
                        </Link>
                    </div>
                </form>
            )}

            <p className="mt-9 text-center text-[11px] leading-5 text-gray-300">
                친한 사람들과 나누는
                <br />
                우리만의 작은 공간
            </p>
        </div>
    );
}