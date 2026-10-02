"use client";

import { useState } from "react";
import { sendTestPush } from "@/app/actions";

export function TestPushButton() {
    const [loading, setLoading] =
        useState(false);

    const [message, setMessage] =
        useState<string | null>(null);

    async function handleTest() {
        setLoading(true);
        setMessage(null);

        try {
            const result =
                await sendTestPush();

            setMessage(
                `${result.count}개 기기로 테스트 알림을 보냈어요.`
            );
        } catch (error) {
            console.error(error);

            setMessage(
                error instanceof Error
                    ? error.message
                    : "테스트 알림 발송에 실패했어요."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mt-3">
            <button
                type="button"
                onClick={handleTest}
                disabled={loading}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-bold text-black transition hover:bg-gray-50 disabled:opacity-50"
            >
                {loading
                    ? "보내는 중..."
                    : "테스트 알림 보내기"}
            </button>

            {message && (
                <p className="mt-2 text-center text-xs text-gray-500">
                    {message}
                </p>
            )}
        </div>
    );
}