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
         * - 이미지 파일
         */
        "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};