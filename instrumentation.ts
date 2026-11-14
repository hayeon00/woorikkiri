import * as Sentry from "@sentry/nextjs";

export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await import("./sentry.server.config");
    }

    if (process.env.NEXT_RUNTIME === "edge") {
        await import("./sentry.edge.config");
    }
}

/** 서버 컴포넌트·라우트·proxy에서 난 오류를 Sentry로 보낸다. */
export const onRequestError = Sentry.captureRequestError;
