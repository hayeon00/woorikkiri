import { describe, expect, it } from "vitest";
import { redirect } from "next/navigation";
import {
    GENERIC_ERROR_MESSAGE,
    runFormAction,
    toUserMessage,
} from "../../lib/form-state";

/**
 * 운영 빌드에서 감춰지던 서버 액션 오류 메시지를 폼 결과로 돌려주는 도우미
 */
describe("폼 오류 메시지", () => {
    it("앱이 의도한 한국어 안내는 그대로 보여준다", () => {
        expect(toUserMessage(new Error("초대코드를 입력해주세요."))).toBe(
            "초대코드를 입력해주세요."
        );
    });

    it("DB·라이브러리 내부 오류(영어)는 일반 문구로 바꾼다", () => {
        expect(
            toUserMessage(new Error('duplicate key value violates unique constraint "groups_pkey"'))
        ).toBe(GENERIC_ERROR_MESSAGE);
        expect(toUserMessage("문자열 throw")).toBe(GENERIC_ERROR_MESSAGE);
        expect(toUserMessage(undefined)).toBe(GENERIC_ERROR_MESSAGE);
    });

    it("성공하면 success 상태와 안내 문구를 돌려준다", async () => {
        const state = await runFormAction(async () => {}, "저장했어요.");
        expect(state.status).toBe("success");
        expect(state.message).toBe("저장했어요.");
    });

    it("실패하면 throw 대신 error 상태로 돌려준다", async () => {
        const state = await runFormAction(async () => {
            throw new Error("방장만 초대코드를 다시 만들 수 있습니다.");
        });
        expect(state.status).toBe("error");
        expect(state.message).toBe("방장만 초대코드를 다시 만들 수 있습니다.");
    });

    it("redirect()는 삼키지 않고 그대로 다시 던진다 (계정 탈퇴·초대 참여 이동)", async () => {
        await expect(
            runFormAction(async () => {
                redirect("/auth/login");
            })
        ).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
    });
});
