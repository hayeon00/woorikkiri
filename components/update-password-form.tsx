"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpdatePasswordForm({
                                       className,
                                       ...props
                                   }: React.ComponentPropsWithoutRef<"div">) {
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== repeatPassword) {
            setError("비밀번호가 서로 일치하지 않습니다.");
            return;
        }

        const supabase = createClient();

        setIsLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password,
            });

            if (error) {
                throw error;
            }

            router.push("/");
            router.refresh();
        } catch (error: unknown) {
            setError(
                error instanceof Error
                    ? error.message
                    : "비밀번호를 변경하는 중 오류가 발생했습니다."
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
                    새 비밀번호를 설정해주세요
                </h1>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                    앞으로 사용할 새로운 비밀번호를
                    <br />
                    입력해주세요.
                </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="mt-8">
                <div className="space-y-4">
                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-bold text-gray-800"
                        >
                            새 비밀번호
                        </label>

                        <input
                            id="password"
                            type="password"
                            autoComplete="new-password"
                            placeholder="새 비밀번호를 입력해주세요"
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
                            새 비밀번호 확인
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
                        className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#171717] text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? "변경하는 중..." : "새 비밀번호 저장"}
                    </button>
                </div>
            </form>

            <p className="mt-9 text-center text-[11px] leading-5 text-gray-300">
                친한 사람들과 나누는
                <br />
                우리만의 작은 공간
            </p>
        </div>
    );
}