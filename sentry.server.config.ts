import * as Sentry from "@sentry/nextjs";
import {
    scrubEvent,
    SENTRY_DATA_COLLECTION,
    SENTRY_DSN,
    SENTRY_ENABLED,
    SENTRY_ENVIRONMENT,
    SENTRY_TRACES_SAMPLE_RATE,
} from "@/lib/sentry-options";

Sentry.init({
    dsn: SENTRY_DSN,
    enabled: SENTRY_ENABLED,
    environment: SENTRY_ENVIRONMENT,
    dataCollection: SENTRY_DATA_COLLECTION,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    beforeSend: scrubEvent,
    // 서버 액션은 실패해도 화면을 깨지 않고 console.error로만 남기는 곳이 많아
    // (푸시 발송 실패 등) 서버의 console.error도 함께 수집한다.
    integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],
});
