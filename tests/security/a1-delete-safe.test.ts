import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A1: 게시글·댓글 삭제 실패가 화면 전체 오류로 번지지 않는지
 *
 * 삭제 래퍼(app/safe-actions.ts)는 실패를 throw 대신 결과값으로 돌려줘야
 * 클라이언트가 피드를 그대로 두고 토스트만 띄울 수 있다.
 * 실제 삭제 함수(app/actions.ts)는 DB가 필요하므로 가짜로 바꾼다.
 */

const actions = vi.hoisted(() => ({
    deletePost: vi.fn(),
    deleteComment: vi.fn(),
}));

vi.mock("../../app/actions", () => ({
    ...actions,
    createPost: vi.fn(),
    updatePost: vi.fn(),
    updateAvatar: vi.fn(),
}));

import { deleteCommentSafe, deletePostSafe } from "../../app/safe-actions";
import { GENERIC_ERROR_MESSAGE } from "../../lib/form-state";

function form(name: string, value: string) {
    const formData = new FormData();
    formData.set(name, value);
    return formData;
}

beforeEach(() => {
    actions.deletePost.mockReset();
    actions.deleteComment.mockReset();
});

describe("A1 게시글 삭제 래퍼", () => {
    it("성공하면 success를 돌려주고 숫자 ID로 삭제한다", async () => {
        actions.deletePost.mockResolvedValue(undefined);

        const state = await deletePostSafe(form("post_id", "42"));

        expect(state.status).toBe("success");
        expect(actions.deletePost).toHaveBeenCalledWith(42);
    });

    it("이미 지워진 게시물(두 번 누름)도 throw하지 않고 안내 문구를 돌려준다", async () => {
        actions.deletePost.mockRejectedValue(
            new Error("삭제할 수 없는 게시글입니다.")
        );

        const state = await deletePostSafe(form("post_id", "42"));

        expect(state).toMatchObject({
            status: "error",
            message: "삭제할 수 없는 게시글입니다.",
        });
    });

    it("DB 내부 오류(영어)는 일반 문구로 바꾼다", async () => {
        actions.deletePost.mockRejectedValue(
            new Error("connection terminated unexpectedly")
        );

        const state = await deletePostSafe(form("post_id", "42"));

        expect(state).toMatchObject({
            status: "error",
            message: GENERIC_ERROR_MESSAGE,
        });
    });

    it("잘못된 ID는 기존처럼 삭제를 시도하지 않고 조용히 끝낸다", async () => {
        for (const bad of ["", "0", "-1", "1.5", "abc"]) {
            const state = await deletePostSafe(form("post_id", bad));
            expect(state.status).toBe("success");
        }

        expect(actions.deletePost).not.toHaveBeenCalled();
    });
});

describe("A1 댓글 삭제 래퍼", () => {
    it("성공하면 success를 돌려주고 숫자 ID로 삭제한다", async () => {
        actions.deleteComment.mockResolvedValue(undefined);

        const state = await deleteCommentSafe(form("comment_id", "7"));

        expect(state.status).toBe("success");
        expect(actions.deleteComment).toHaveBeenCalledWith(7);
    });

    it("실패해도 throw하지 않고 error 상태를 돌려준다", async () => {
        actions.deleteComment.mockRejectedValue(
            new Error("로그인이 필요합니다.")
        );

        const state = await deleteCommentSafe(form("comment_id", "7"));

        expect(state).toMatchObject({
            status: "error",
            message: "로그인이 필요합니다.",
        });
    });

    it("잘못된 ID는 삭제를 시도하지 않는다", async () => {
        const state = await deleteCommentSafe(form("comment_id", "x"));

        expect(state.status).toBe("success");
        expect(actions.deleteComment).not.toHaveBeenCalled();
    });
});
