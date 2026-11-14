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
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
