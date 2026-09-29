import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(
    request: NextRequest
) {
    const { searchParams } =
        new URL(request.url);

    const nextParam =
        searchParams.get("next");

    // 우리 사이트 내부 경로만 허용
    const nextPath =
        nextParam &&
        nextParam.startsWith("/") &&
        !nextParam.startsWith("//")
            ? nextParam
            : "/";

    // Supabase의 기본 ConfirmationURL 방식에서는
    // 이메일 인증이 이미 Supabase에서 완료된 뒤
    // 이 주소로 돌아온다.
    redirect(nextPath);
}