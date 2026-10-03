"use client";

import {
    useEffect,
    useState,
} from "react";

import {
    savePushSubscription,
} from "@/app/actions";

type Status =
    | "loading"
    | "unsupported"
    | "denied"
    | "ready"
    | "enabled"
    | "working"
    | "error";

export function PushNotificationButton() {
    const [status, setStatus] =
        useState<Status>("loading");

    const [message, setMessage] =
        useState<string | null>(null);

    useEffect(() => {
        checkPushStatus();
    }, []);

    async function checkPushStatus() {
        if (
            !("serviceWorker" in navigator) ||
            !("PushManager" in window) ||
            !("Notification" in window)
        ) {
            setStatus("unsupported");
            return;
        }

        if (
            Notification.permission ===
            "denied"
        ) {
            setStatus("denied");
            return;
        }

        try {
            const registration =
                await navigator.serviceWorker.register(
                    "/sw.js"
                );

            const subscription =
                await registration.pushManager.getSubscription();

            if (subscription) {
                setStatus("enabled");
            } else {
                setStatus("ready");
            }
        } catch (error) {
            console.error(
                "Push 상태 확인 실패:",
                error
            );

            setStatus("error");
        }
    }

    async function enablePush() {
        setStatus("working");
        setMessage(null);

        try {
            if (
                !("serviceWorker" in navigator) ||
                !("PushManager" in window) ||
                !("Notification" in window)
            ) {
                setStatus("unsupported");
                return;
            }

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
                    setStatus("ready");
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
                endpoint: json.endpoint,
                keys: {
                    p256dh: json.keys.p256dh,
                    auth: json.keys.auth,
                },
            });

            setStatus("enabled");
            setMessage(
                "이 기기에서 푸시 알림을 받을 수 있어요."
            );
        } catch (error) {
            console.error(
                "Push 등록 실패:",
                error
            );

            setStatus("error");
            setMessage(
                "푸시 알림을 설정하지 못했어요."
            );
        }
    }

    if (status === "loading") {
        return (
            <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <p className="text-xs font-medium text-gray-400">
                    알림 상태를 확인하고 있어요...
                </p>
            </div>
        );
    }

    if (status === "unsupported") {
        return (
            <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <p className="text-sm font-bold">
                    이 환경에서는 푸시 알림을 사용할 수 없어요.
                </p>

                <p className="mt-1 text-[11px] leading-5 text-gray-400">
                    지원되는 브라우저 또는 홈 화면에 설치한 앱에서 이용해주세요.
                </p>
            </div>
        );
    }

    if (status === "denied") {
        return (
            <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-base">
                        🔕
                    </span>

                    <div>
                        <p className="text-sm font-black">
                            기기 알림이 차단되어 있어요
                        </p>

                        <p className="mt-0.5 text-[10px] leading-4 text-gray-400">
                            기기 설정에서 우리끼리의 알림 권한을 허용해주세요.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (status === "enabled") {
        return (
            <div>
                <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-base text-white">
                        ✓
                    </span>

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-black">
                            이 기기에서 알림을 받고 있어요
                        </p>

                        <p className="mt-0.5 text-[10px] leading-4 text-gray-400">
                            아래에서 받을 알림 종류를 선택할 수 있어요.
                        </p>
                    </div>
                </div>

                {message && (
                    <p className="mt-2 text-center text-[10px] font-medium text-gray-400">
                        {message}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div>
                <p className="text-sm font-black">
                    이 기기에서 알림 받기
                </p>

                <p className="mt-1 text-[11px] leading-5 text-gray-400">
                    새 게시물, 좋아요, 댓글 소식을 이 기기에서 바로 받아보세요.
                </p>
            </div>

            <button
                type="button"
                onClick={enablePush}
                disabled={
                    status === "working"
                }
                className="mt-3 h-11 w-full rounded-xl bg-black text-xs font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {status === "working"
                    ? "설정 중..."
                    : status === "error"
                        ? "다시 시도"
                        : "알림 사용하기"}
            </button>

            {message && (
                <p className="mt-2 text-center text-[10px] font-medium text-red-400">
                    {message}
                </p>
            )}
        </div>
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