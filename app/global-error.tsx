"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * 루트 레이아웃 자체가 실패했을 때의 마지막 안전망.
 * 레이아웃·전역 CSS 없이 그려지므로 스타일을 직접 넣는다.
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <html lang="ko">
            <body
                style={{
                    margin: 0,
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f6f6f4",
                    fontFamily:
                        "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
                    color: "#111",
                    padding: "24px",
                }}
            >
                <main style={{ maxWidth: 380, textAlign: "center" }}>
                    <h1 style={{ fontSize: 22, margin: 0 }}>
                        우리끼리를 열지 못했어요
                    </h1>
                    <p style={{ fontSize: 14, lineHeight: 1.6, color: "#666" }}>
                        잠시 후 다시 시도해주세요.
                    </p>
                    {error.digest && (
                        <p style={{ fontSize: 11, color: "#999", fontFamily: "monospace" }}>
                            오류 번호 {error.digest}
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={reset}
                        style={{
                            marginTop: 16,
                            height: 48,
                            padding: "0 28px",
                            border: 0,
                            borderRadius: 16,
                            background: "#111",
                            color: "#fff",
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        다시 시도
                    </button>
                </main>
            </body>
        </html>
    );
}
