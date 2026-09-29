import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function Page() {
    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <Suspense fallback={<LoginLoading />}>
                    <LoginForm />
                </Suspense>
            </div>
        </div>
    );
}

function LoginLoading() {
    return (
        <div className="flex min-h-[400px] items-center justify-center">
            <p className="text-sm text-muted-foreground">
                로그인 화면을 불러오는 중...
            </p>
        </div>
    );
}