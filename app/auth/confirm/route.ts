import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(
    request: NextRequest
) {
    const { searchParams } =
        new URL(request.url);

    const tokenHash =
        searchParams.get("token_hash");

    const type =
        searchParams.get("type") as
            | EmailOtpType
            | null;

    const nextParam =
        searchParams.get("next");

    // ========================================
    // 안전한 내부 이동 주소만 허용
    // ========================================

    const nextPath =
        nextParam &&
        nextParam.startsWith("/") &&
        !nextParam.startsWith("//")
            ? nextParam
            : "/";

    // ========================================
    // 이메일 인증
    // ========================================

    if (tokenHash && type) {
        const supabase =
            await createClient();

        const { error } =
            await supabase.auth.verifyOtp({
                type,
                token_hash: tokenHash,
            });

        if (!error) {
            // 일반 회원가입 → /
            // 초대 링크 회원가입 → /join/초대코드
            redirect(nextPath);
        }

        redirect(
            `/auth/error?error=${encodeURIComponent(
                error.message
            )}`
        );
    }

    redirect(
        "/auth/error?error=Invalid%20confirmation%20link"
    );
}