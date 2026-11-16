import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A3: 댓글 등록 실패 이유가 클라이언트까지 전달되는지
 *
 * 등록 래퍼(app/safe-actions.ts)는 실패를 throw 대신 결과값으로 돌려줘야
 * 운영 빌드에서도 댓글 창이 이유를 토스트로 안내하고 입력 내용을 되돌릴 수 있다.
 * 실제 등록 함수(app/actions.ts)는 DB가 필요하므로 가짜로 바꾼다.
 */

const actions = vi.hoisted(() => ({
    createComment: vi.fn(),
}));

vi.mock("../../app/actions", () => ({
    ...actions,
    createPost: vi.fn(),
    updatePost: vi.fn(),
    updateAvatar: vi.fn(),
    deletePost: vi.fn(),
    deleteComment: vi.fn(),
}));

import { createCommentSafe } from "../../app/safe-actions";
import { GENERIC_ERROR_MESSAGE } from "../../lib/form-state";

function replyForm() {
    const formData = new FormData();
    formData.set("post_id", "1");
    formData.set("content", "@친구 고마워");
    formData.set("parent_id", "5");
    formData.append("mention_user_ids", "user-b");
    return formData;
}

beforeEach(() => {
    actions.createComment.mockReset();
});

describe("A3 댓글 등록 래퍼", () => {
    it("받은 폼(답글 대상·멘션 포함)을 그대로 넘기고 성공을 돌려준다", async () => {
        actions.createComment.mockResolvedValue({ commentId: 10 });
        const formData = replyForm();

        const state = await createCommentSafe(formData);

        expect(state.status).toBe("success");
        expect(actions.createComment).toHaveBeenCalledWith(formData);
    });

    it("앱이 의도한 실패 이유(한국어)는 그대로 전달한다", async () => {
        actions.createComment.mockRejectedValue(
            new Error("답글을 작성할 댓글을 찾을 수 없습니다.")
        );

        const state = await createCommentSafe(replyForm());

        expect(state).toMatchObject({
            status: "error",
            message: "답글을 작성할 댓글을 찾을 수 없습니다.",
        });
    });

    it("DB 내부 오류(영어)는 throw하지 않고 일반 문구로 바꾼다", async () => {
        actions.createComment.mockRejectedValue(
            new Error('new row violates row-level security policy for table "comments"')
        );

        const state = await createCommentSafe(replyForm());

        expect(state).toMatchObject({
            status: "error",
            message: GENERIC_ERROR_MESSAGE,
        });
    });
});
