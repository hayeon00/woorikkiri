"use client";

import {
    useEffect,
    useState,
} from "react";

import {
    savePushSubscription,
} from "@/app/actions";

type Status =
    | "checking"
    | "hidden"
    | "show"
    | "working"
    | "denied";

const DISMISS_KEY =
    "woorikkiri-push-onboarding-dismissed";

export function PushOnboarding() {
    const [status, setStatus] =
        useState<Status>("checking");

    useEffect(() => {
        checkStatus();
    }, []);

    async function checkStatus() {
        // 이미 이번 기기에서 "나중에"를 눌렀다면
        // 계속 귀찮게 표시하지 않음
        if (
            window.localStorage.getItem(
                DISMISS_KEY
            ) === "true"
        ) {
            setStatus("hidden");
            return;
        }

        if (
            !("serviceWorker" in navigator) ||
            !("PushManager" in window) ||
            !("Notification" in window)
        ) {
            setStatus("hidden");
            return;
        }

        if (
            Notification.permission ===
            "denied"
        ) {
            setStatus("hidden");
            return;
        }

        try {
            const registration =
                await navigator.serviceWorker.register(
                    "/sw.js"
                );

            const subscription =
                await registration.pushManager.getSubscription();

            // 이미 이 기기가 Push에 등록되어 있으면
            // 홈 안내를 표시하지 않음
            if (subscription) {
                setStatus("hidden");
                return;
            }

            setStatus("show");
        } catch (error) {
            console.error(
                "Push 상태 확인 실패:",
                error
            );

            setStatus("hidden");
        }
    }

    async function enablePush() {
        setStatus("working");

        try {
            const publicKey =
                process.env
                    .NEXT_PUBLIC_VAPID_PUBLIC_KEY;

            if (!publicKey) {
                throw new Error(
                    "VAPID 공개키가 없습니다."
                );
            }

            const registration =
                await navigator.serviceWorker.register(
                    "/sw.js"
                );

            const permission =
                await Notification.requestPermission();

            if (permission !== "granted") {
                if (
                    permission === "denied"
                ) {
                    setStatus("denied");
                } else {
                    setStatus("show");
                }

                return;
            }

            let subscription =
                await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription =
                    await registration.pushManager.subscribe(
                        {
                            userVisibleOnly: true,
                            applicationServerKey:
                                urlBase64ToUint8Array(
                                    publicKey
                                ),
                        }
                    );
            }

            const json =
                subscription.toJSON();

            if (
                !json.endpoint ||
                !json.keys?.p256dh ||
                !json.keys?.auth
            ) {
                throw new Error(
                    "Push 구독 정보를 읽을 수 없습니다."
                );
            }

            await savePushSubscription({
                endpoint:
                json.endpoint,
                keys: {
                    p256dh:
                    json.keys.p256dh,
                    auth:
                    json.keys.auth,
                },
            });

            window.localStorage.removeItem(
                DISMISS_KEY
            );

            setStatus("hidden");
        } catch (error) {
            console.error(
                "Push 등록 실패:",
                error
            );

            setStatus("show");
        }
    }

    function dismiss() {
        window.localStorage.setItem(
            DISMISS_KEY,
            "true"
        );

        setStatus("hidden");
    }

    if (
        status === "checking" ||
        status === "hidden"
    ) {
        return null;
    }

    if (status === "denied") {
        return null;
    }

    return (
        <section className="overflow-hidden rounded-[22px] border border-black/[0.04] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.025)]">
            <div className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-950 text-lg text-white">
                        🔔
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-black tracking-[-0.02em]">
                            친구들의 소식을 놓치지 마세요
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-gray-400">
                            새 게시물, 좋아요, 댓글 소식을
                            바로 알려드릴게요.
                        </p>
                    </div>
                </div>

                <div className="mt-4 flex gap-2">
                    <button
                        type="button"
                        onClick={dismiss}
                        disabled={
                            status ===
                            "working"
                        }
                        className="h-11 flex-1 rounded-xl bg-gray-100 text-[11px] font-bold text-gray-500 transition active:scale-[0.98]"
                    >
                        나중에
                    </button>

                    <button
                        type="button"
                        onClick={enablePush}
                        disabled={
                            status ===
                            "working"
                        }
                        className="h-11 flex-[1.5] rounded-xl bg-gray-950 text-[11px] font-black text-white transition active:scale-[0.98] disabled:opacity-50"
                    >
                        {status ===
                        "working"
                            ? "설정 중..."
                            : "알림 켜기"}
                    </button>
                </div>
            </div>
        </section>
    );
}

function urlBase64ToUint8Array(
    base64String: string
) {
    const padding =
        "=".repeat(
            (4 -
                (base64String.length %
                    4)) %
            4
        );

    const base64 =
        (
            base64String +
            padding
        )
            .replace(/-/g, "+")
            .replace(/_/g, "/");

    const rawData =
        window.atob(base64);

    return Uint8Array.from(
        [...rawData].map((char) =>
            char.charCodeAt(0)
        )
    );
}