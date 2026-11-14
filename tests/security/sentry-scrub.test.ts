import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import {
    scrubEvent,
    SENTRY_DATA_COLLECTION,
    SENTRY_ENABLED,
} from "../../lib/sentry-options";

/**
 * Sentry로 보내는 오류에 개인정보가 섞이지 않는지 확인
 * (개인정보처리방침: IP 주소·이메일·게시물 내용은 보내지 않음)
 */
describe("Sentry 개인정보 제거", () => {
    it("사용자 정보는 내부 id만 남긴다", () => {
        const event = scrubEvent({
            type: undefined,
            user: { id: "u1", email: "a@b.com", ip_address: "1.2.3.4", username: "닉" },
        } as ErrorEvent);
        expect(event.user).toEqual({ id: "u1" });
    });

    it("쿠키, 요청 본문, IP 관련 헤더를 지운다", () => {
        const event = scrubEvent({
            type: undefined,
            request: {
                url: "https://woorikkiri.com/settings",
                cookies: { "sb-access-token": "secret" },
                data: { content: "게시물 내용" },
                headers: {
                    Cookie: "sb=secret",
                    Authorization: "Bearer x",
                    "X-Forwarded-For": "1.2.3.4",
                    "x-real-ip": "1.2.3.4",
                    "user-agent": "Safari",
                },
            },
        } as ErrorEvent);

        expect(event.request?.cookies).toBeUndefined();
        expect(event.request?.data).toBeUndefined();
        expect(event.request?.headers).toEqual({ "user-agent": "Safari" });
        expect(event.request?.url).toBe("https://woorikkiri.com/settings");
    });

    it("오류 메시지 속 이메일을 가린다", () => {
        const event = scrubEvent({
            type: undefined,
            message: "가입 실패: someone@gmail.com",
            exception: {
                values: [{ type: "Error", value: "User a.b+c@example.co.kr not found" }],
            },
        } as ErrorEvent);

        expect(event.message).toBe("가입 실패: [이메일]");
        expect(event.exception?.values?.[0].value).toBe("User [이메일] not found");
    });

    it("SDK 기본 수집(사용자·쿠키·본문·쿼리·지역 변수)을 끈다", () => {
        expect(SENTRY_DATA_COLLECTION).toMatchObject({
            userInfo: false,
            cookies: false,
            httpBodies: [],
            urlQueryParams: false,
            databaseQueryData: false,
            stackFrameVariables: false,
        });
    });

    it("로컬 개발·테스트에서는 보내지 않는다", () => {
        expect(SENTRY_ENABLED).toBe(false);
    });
});
