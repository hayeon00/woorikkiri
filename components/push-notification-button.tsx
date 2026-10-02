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
        setMessage(null);

        try {
            if (
                !("serviceWorker" in navigator) ||
                !("PushManager" in window) ||
                !("Notification" in window)
            ) {
                setMessage(
                    "이 기기에서는 푸시 알림을 사용할 수 없어요."
                );
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

            await navigator.serviceWorker.ready;

            const permission =
                await Notification.requestPermission();

            if (permission !== "granted") {
                setMessage(
                    "알림 권한이 허용되지 않았어요."
                );
                return;
            }

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
                    "푸시 구독 정보를 가져오지 못했습니다."
                );
            }

            await savePushSubscription(
                {
                    endpoint: json.endpoint,
                    keys: {
                        p256dh:
                        json.keys.p256dh,
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

            setMessage(
                "푸시 알림 설정에 실패했어요."
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