"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { logout } from "@/app/actions";
import {
    browserPushEnvironment,
    readCurrentPushEndpoint,
    unsubscribeCurrentPush,
} from "@/lib/push-subscription-cleanup";

/**
 * 설정 화면의 로그아웃 버튼.
 *
 * 1) 이 기기의 푸시 구독 endpoint를 읽어 서버에 함께 보낸다.
 *    서버는 세션이 살아 있는 동안 DB의 구독 행을 지운 뒤 로그아웃한다.
 * 2) 서버 처리가 끝나면 브라우저 구독도 해제한다 (보조 조치, 실패해도 무시).
 */
export function LogoutForm() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        startTransition(async () => {
            const pushEnv = browserPushEnvironment();
            const endpoint = await readCurrentPushEndpoint(pushEnv);

            const formData = new FormData();
            if (endpoint) {
                formData.set("push_endpoint", endpoint);
            }

            await logout(formData);
            await unsubscribeCurrentPush(pushEnv);

            router.replace("/auth/login");
            router.refresh();
        });
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="border-t border-gray-100"
        >
            <button
                type="submit"
                disabled={isPending}
                className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-bold transition hover:bg-gray-50 disabled:opacity-50"
            >
                <span>
                    {isPending ? "로그아웃 중..." : "로그아웃"}
                </span>

                <span className="text-lg font-light text-gray-300">
                    ›
                </span>
            </button>
        </form>
    );
}
