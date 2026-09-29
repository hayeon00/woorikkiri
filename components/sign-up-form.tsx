"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import {
    useRouter,
    useSearchParams,
} from "next/navigation";
import { useState } from "react";

export function SignUpForm({
                               className,
                               ...props
                           }: React.ComponentPropsWithoutRef<"div">) {
    const [email, setEmail] = useState("");
    const [password, setPassword] =
        useState("");
    const [
        repeatPassword,
        setRepeatPassword,
    ] = useState("");
    const [error, setError] =
        useState<string | null>(null);
    const [isLoading, setIsLoading] =
        useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();

    // ========================================
    // 초대 링크에서 넘어온 next 주소
    // ========================================

    const nextParam =
        searchParams.get("next");

    // 외부 사이트 이동 방지
    const nextPath =
        nextParam &&
        nextParam.startsWith("/") &&
        !nextParam.startsWith("//")
            ? nextParam
            : "/";

    const handleSignUp = async (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        const supabase = createClient();

        setIsLoading(true);
        setError(null);

        if (password !== repeatPassword) {
            setError(
                "비밀번호가 서로 일치하지 않습니다."
            );
            setIsLoading(false);
            return;
        }

        try {
            // ========================================
            // 이메일 인증 후 돌아올 주소
            // ========================================

            const callbackUrl =
                `${window.location.origin}` +
                `/auth/confirm?next=${encodeURIComponent(
                    nextPath
                )}`;

            const {
                data,
                error,
            } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: callbackUrl,
                },
            });

            if (error) {
                throw error;
            }

            // 이메일 인증이 꺼져 있어서
            // 가입 즉시 세션이 생기는 경우
            if (data.session) {
                router.push(nextPath);
                router.refresh();
                return;
            }

            // 이메일 인증이 필요한 경우
            router.push(
                `/auth/sign-up-success?next=${encodeURIComponent(
                    nextPath
                )}`
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

    // 로그인 화면으로 돌아갈 때도
    // 초대 주소를 유지
    const loginHref =
        nextPath !== "/"
            ? `/auth/login?next=${encodeURIComponent(
                nextPath
            )}`
            : "/auth/login";

    return (
        <div
            className={cn(
                "flex flex-col gap-6",
                className
            )}
            {...props}
        >
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">
                        회원가입
                    </CardTitle>

                    <CardDescription>
                        우리끼리에서 사용할 계정을
                        만들어주세요.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSignUp}>
                        <div className="flex flex-col gap-6">

                            <div className="grid gap-2">
                                <Label htmlFor="email">
                                    이메일
                                </Label>

                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="example@email.com"
                                    required
                                    value={email}
                                    onChange={(e) =>
                                        setEmail(e.target.value)
                                    }
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">
                                    비밀번호
                                </Label>

                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="repeat-password">
                                    비밀번호 확인
                                </Label>

                                <Input
                                    id="repeat-password"
                                    type="password"
                                    required
                                    value={repeatPassword}
                                    onChange={(e) =>
                                        setRepeatPassword(
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-500">
                                    {error}
                                </p>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading}
                            >
                                {isLoading
                                    ? "계정 만드는 중..."
                                    : "회원가입"}
                            </Button>

                        </div>

                        <div className="mt-4 text-center text-sm">
                            이미 계정이 있으신가요?{" "}

                            <Link
                                href={loginHref}
                                className="underline underline-offset-4"
                            >
                                로그인
                            </Link>
                        </div>

                    </form>
                </CardContent>
            </Card>
        </div>
    );
}