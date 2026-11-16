import { describe, expect, it, vi } from "vitest";
import { createPendingCommentStore } from "../../lib/pending-comments";

/**
 * A7: 게시물별 "보내는 중인 내 댓글 수" 기록장
 */

describe("보내는 중인 댓글 수 기록장", () => {
    it("기록이 없으면 0이다", () => {
        const store = createPendingCommentStore();
        expect(store.get(1)).toBe(0);
    });

    it("게시물별로 따로 적고 읽는다", () => {
        const store = createPendingCommentStore();
        store.set(1, 2);
        store.set(2, 1);

        expect(store.get(1)).toBe(2);
        expect(store.get(2)).toBe(1);
    });

    it("바뀔 때만 구독자에게 알린다", () => {
        const store = createPendingCommentStore();
        const listener = vi.fn();
        store.subscribe(listener);

        store.set(1, 1);
        store.set(1, 1);
        store.set(1, 0);

        expect(listener).toHaveBeenCalledTimes(2);
    });

    it("구독을 해제하면 더 알리지 않는다", () => {
        const store = createPendingCommentStore();
        const listener = vi.fn();
        const unsubscribe = store.subscribe(listener);

        unsubscribe();
        store.set(1, 3);

        expect(listener).not.toHaveBeenCalled();
    });

    it("음수는 0으로 본다", () => {
        const store = createPendingCommentStore();
        store.set(1, -2);
        expect(store.get(1)).toBe(0);
    });
});
