import { describe, expect, it } from "vitest";

import { formatFullDateTime, formatRelativeTime } from "../../lib/time";
import { friendlyErrorMessage } from "../../lib/friendly-error";

describe("시간 표시 (한국 시간 고정)", () => {
    // 2026-11-15 19:00 KST = 10:00 UTC
    const now = new Date("2026-11-15T10:00:00Z");

    it("1분 안은 '방금 전', 1시간 안은 'N분 전'", () => {
        expect(formatRelativeTime("2026-11-15T09:59:30Z", now)).toBe("방금 전");
        expect(formatRelativeTime("2026-11-15T09:45:00Z", now)).toBe("15분 전");
    });

    it("같은 날은 'N시간 전'", () => {
        expect(formatRelativeTime("2026-11-15T07:00:00Z", now)).toBe("3시간 전");
    });

    it("UTC로는 같은 날이어도 한국 날짜가 어제면 '어제'", () => {
        // 14:30 UTC 전날 = 11-14 23:30 KST
        expect(formatRelativeTime("2026-11-14T14:30:00Z", now)).toMatch(/^어제 오후 11:30$/);
    });

    it("그보다 전은 날짜, 해가 다르면 연도까지", () => {
        expect(formatRelativeTime("2026-11-03T03:00:00Z", now)).toBe("11월 3일");
        expect(formatRelativeTime("2025-11-03T03:00:00Z", now)).toBe("2025년 11월 3일");
    });

    it("서버가 UTC여도 전체 시간은 한국 시간으로 표시", () => {
        expect(formatFullDateTime("2026-11-15T10:01:00Z")).toBe("2026년 11월 15일 오후 7:01");
    });
});

describe("사용자용 오류 문구", () => {
    it("네트워크 오류는 연결 확인 안내로", () => {
        expect(friendlyErrorMessage(new TypeError("Failed to fetch"))).toContain("인터넷 연결");
    });

    it("용량·형식 오류를 한국어로", () => {
        expect(friendlyErrorMessage(new Error("The object exceeded the maximum allowed size"))).toContain("용량");
        expect(friendlyErrorMessage(new Error("mime type image/svg+xml is not supported"))).toContain("형식");
    });

    it("서버가 이미 한국어로 만든 문구는 그대로", () => {
        expect(friendlyErrorMessage(new Error("방장만 초대코드를 다시 만들 수 있습니다."))).toBe(
            "방장만 초대코드를 다시 만들 수 있습니다."
        );
    });

    it("알 수 없는 영어 오류는 기본 안내로 (기술 문구 노출 안 함)", () => {
        expect(friendlyErrorMessage(new Error("duplicate key value violates unique constraint"), "기본 안내")).toBe(
            "기본 안내"
        );
    });
});
