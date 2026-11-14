import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * 인증 처리가 필요 없는 정적/PWA 파일은 제외합니다.
         *
         * 제외:
         * - _next/static
         * - _next/image
         * - favicon.ico
         * - manifest.webmanifest
         * - sw.js
         * - monitoring (Sentry 오류 전송 터널, 로그인 전 화면 오류도 받아야 함)
         * - 이미지 파일
         */
        "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|sw\\.js|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};