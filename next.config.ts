import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default withSentryConfig(nextConfig, {
  org: "woorikkiri",
  project: "woorikkiri",
  // 소스맵 업로드용. Vercel 환경 변수에만 둔다. 없으면 업로드만 건너뛴다.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // 광고 차단기가 sentry.io 요청을 막아도 브라우저 오류를 받을 수 있도록
  // 같은 도메인의 경로로 보낸다. proxy.ts matcher에서 제외되어 있다.
  tunnelRoute: "/monitoring",
  // 업로드한 소스맵은 배포 결과물에서 지워 원본 코드를 공개하지 않는다.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  telemetry: false,
});
