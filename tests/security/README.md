# 보안 회귀 테스트 (S1~S3)

로컬 Supabase(Docker)에서만 실행된다. `helpers.ts`가 API 주소가 127.0.0.1/localhost가
아니면 중단하며, `.env.local`(운영 값)은 읽지 않는다.

```bash
cd tests/security
npm install --legacy-peer-deps   # Node 20.14 환경 기준
npm run db:start                 # 최초 1회, Docker 필요
npm run db:reset                 # 로컬 DB에만 마이그레이션 재적용 (--local)
npm test
npm run db:stop
```

- `s1-image-paths.test.ts`: 사진 경로 소유권, 남의 사진 삭제·열람 우회 차단
- `s2-notifications.test.ts`: 알림 위조·스팸 차단, 앱이 만드는 정상 알림 유지
- `s3-logout-push.test.ts`: 로그아웃 시 현재 기기 푸시 구독 삭제

`supabase db push`, `supabase link` 등 원격 명령은 이 패키지 스크립트에 넣지 않는다.
