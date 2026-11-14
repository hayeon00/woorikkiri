import type { DataCollection } from "@sentry/core";
import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Sentry 공통 설정 (브라우저·서버·엣지)
 *
 * DSN은 브라우저 코드에도 들어가는 공개 값이라 코드에 둔다.
 * 오류 원인 파악에 필요한 정보만 보내고, 개인정보는 보내지 않는다.
 *   - SENTRY_DATA_COLLECTION: 사용자 정보, 쿠키, 요청·응답 본문, 쿼리 문자열,
 *     DB 쿼리 값, 지역 변수 값을 수집하지 않는다. (SDK 기본값은 모두 수집)
 *   - beforeSend에서 혹시 남은 사용자·요청 정보를 한 번 더 지운다.
 *   - 세션 녹화(Replay)는 쓰지 않는다.
 * 개인정보처리방침(app/privacy)의 위탁·국외 이전 항목과 맞춰야 한다.
 */

export const SENTRY_DSN =
    "https://483f32840173912fd8fe0bf64e2c824a@o4512429818707968.ingest.de.sentry.io/4512429826310224";

/** 로컬 개발 중에는 보내지 않는다. */
export const SENTRY_ENABLED = process.env.NODE_ENV === "production";

export const SENTRY_ENVIRONMENT =
    process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? "local";

/** 성능 추적은 무료 한도를 넘지 않도록 일부만 */
export const SENTRY_TRACES_SAMPLE_RATE = 0.1;

export const SENTRY_DATA_COLLECTION: DataCollection = {
    userInfo: false,
    cookies: false,
    httpHeaders: { allow: ["user-agent", "content-type", "accept-language"] },
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
};

const SENSITIVE_HEADERS = new Set([
    "cookie",
    "authorization",
    "x-forwarded-for",
    "x-real-ip",
    "x-vercel-forwarded-for",
    "x-vercel-proxied-for",
    "cf-connecting-ip",
    "true-client-ip",
]);

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function maskEmails(text: string | undefined) {
    return text?.replace(EMAIL, "[이메일]");
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
    if (event.user) {
        // 계정 식별은 내부 id만 남긴다.
        event.user = event.user.id ? { id: event.user.id } : undefined;
    }

    if (event.request) {
        delete event.request.cookies;
        delete event.request.data;

        if (event.request.headers) {
            for (const name of Object.keys(event.request.headers)) {
                if (SENSITIVE_HEADERS.has(name.toLowerCase())) {
                    delete event.request.headers[name];
                }
            }
        }
    }

    event.message = maskEmails(event.message);
    for (const exception of event.exception?.values ?? []) {
        exception.value = maskEmails(exception.value);
    }

    return event;
}
