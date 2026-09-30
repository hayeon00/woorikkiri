import { Suspense } from "react";
import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
    return (
        <main className="min-h-svh bg-[#f6f6f4]">
            <div className="mx-auto flex min-h-svh w-full max-w-[480px] items-center px-6 py-10 sm:px-8">
                <div className="w-full rounded-[32px] bg-white px-6 py-8 shadow-[0_8px_40px_rgba(0,0,0,0.05)] sm:px-8 sm:py-10">
                    <Suspense fallback={<SignUpLoading />}>
                        <SignUpForm />
                    </Suspense>
                </div>
            </div>
        </main>
    );
}

function SignUpLoading() {
    return (
        <div className="flex min-h-[560px] items-center justify-center">
            <p className="text-sm font-medium text-gray-400">
                회원가입 화면을 불러오는 중...
            </p>
        </div>
    );
}