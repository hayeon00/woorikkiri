import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A2: 좋아요는 "원하는 상태"를 보내고, 실패는 결과값으로 돌려받는다
 *
 * 좋아요 버튼은 실패 결과를 받아 하트를 서버가 확인한 상태로 되돌린다.
 * 실제 setLike(app/actions.ts)는 DB가 필요하므로 가짜로 바꾼다.
 */

const actions = vi.hoisted(() => ({
    setLike: vi.fn(),
}));

vi.mock("../../app/actions", () => ({
    ...actions,
    createComment: vi.fn(),
    createPost: vi.fn(),
    updatePost: vi.fn(),
    updateAvatar: vi.fn(),
    deletePost: vi.fn(),
    deleteComment: vi.fn(),
}));

import { setLikeSafe } from "../../app/safe-actions";
import { GENERIC_ERROR_MESSAGE } from "../../lib/form-state";

beforeEach(() => {
    actions.setLike.mockReset();
});

describe("A2 좋아요 래퍼", () => {
    it("원하는 상태(켜기/끄기)를 그대로 넘기고 성공을 돌려준다", async () => {
        actions.setLike.mockResolvedValue(undefined);

        expect((await setLikeSafe(3, true)).status).toBe("success");
        expect((await setLikeSafe(3, false)).status).toBe("success");

        expect(actions.setLike).toHaveBeenNthCalledWith(1, 3, true);
        expect(actions.setLike).toHaveBeenNthCalledWith(2, 3, false);
    });

    it("앱이 의도한 실패 이유(한국어)는 그대로 전달한다", async () => {
        actions.setLike.mockRejectedValue(
            new Error("게시글을 찾을 수 없습니다.")
        );

        expect(await setLikeSafe(3, true)).toMatchObject({
            status: "error",
            message: "게시글을 찾을 수 없습니다.",
        });
    });

    it("DB 내부 오류(영어)는 throw하지 않고 일반 문구로 바꾼다", async () => {
        actions.setLike.mockRejectedValue(
            new Error("connection terminated unexpectedly")
        );

        expect(await setLikeSafe(3, true)).toMatchObject({
            status: "error",
            message: GENERIC_ERROR_MESSAGE,
        });
    });
});
