"use client";

import { useState } from "react";
import { savePushSubscription } from "@/app/actions";

function urlBase64ToUint8Array(
    base64String: string
) {
    const padding =
        "=".repeat(
            (4 - (base64String.length % 4)) % 4
        );

    const base64 = (
        base64String + padding
    )
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);

    return Uint8Array.from(
        [...rawData].map((char) =>
            char.charCodeAt(0)
        )
    );
}

export function PushNotificationButton() {
    const [loading, setLoading] =
        useState(false);

    const [message, setMessage] =
        useState<string | null>(null);

    async function enablePush() {
        setLoading(true);
        setMessage("1/6 브라우저 기능 확인 중...");

        try {
            if (!("serviceWorker" in navigator)) {
                throw new Error(
                    "SERVICE_WORKER_NOT_SUPPORTED"
                );
            }

            if (!("PushManager" in window)) {
                throw new Error(
                    "PUSH_MANAGER_NOT_SUPPORTED"
                );
            }

            if (!("Notification" in window)) {
                throw new Error(
                    "NOTIFICATION_NOT_SUPPORTED"
                );
            }

            setMessage("2/6 VAPID 키 확인 중...");

            const publicKey =
                process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

            if (!publicKey) {
                throw new Error(
                    "VAPID_PUBLIC_KEY_MISSING"
                );
            }

            setMessage("3/6 Service Worker 등록 중...");

            const registration =
                await navigator.serviceWorker.register(
                    "/sw.js"
                );

            await navigator.serviceWorker.ready;

            setMessage("4/6 알림 권한 요청 중...");

            const permission =
                await Notification.requestPermission();

            if (permission !== "granted") {
                throw new Error(
                    `NOTIFICATION_PERMISSION_${permission}`
                );
            }

            setMessage("5/6 푸시 구독 생성 중...");

            let subscription =
                await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription =
                    await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey:
                            urlBase64ToUint8Array(
                                publicKey
                            ),
                    });
            }

            const json =
                subscription.toJSON();

            if (
                !json.endpoint ||
                !json.keys?.p256dh ||
                !json.keys?.auth
            ) {
                throw new Error(
                    "PUSH_SUBSCRIPTION_INVALID"
                );
            }

            setMessage("6/6 서버에 저장 중...");

            await savePushSubscription(
                {
                    endpoint: json.endpoint,
                    keys: {
                        p256dh: json.keys.p256dh,
                        auth: json.keys.auth,
                    },
                },
                navigator.userAgent
            );

            setMessage(
                "푸시 알림이 켜졌어요. 🔔"
            );
        } catch (error) {
            console.error(
                "푸시 알림 설정 실패:",
                error
            );

            const detail =
                error instanceof Error
                    ? `${error.name}: ${error.message}`
                    : String(error);

            setMessage(
                `설정 실패: ${detail}`
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <button
                type="button"
                onClick={enablePush}
                disabled={loading}
                className="w-full rounded-2xl bg-black px-4 py-3.5 text-sm font-bold text-white transition disabled:opacity-50"
            >
                {loading
                    ? "설정 중..."
                    : "푸시 알림 켜기"}
            </button>

            {message && (
                <p className="mt-2 text-center text-xs text-gray-500">
                    {message}
                </p>
            )}
        </div>
    );
}