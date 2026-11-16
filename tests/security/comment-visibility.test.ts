import { describe, expect, it } from "vitest";
import {
    hiddenRootCount,
    INITIAL_THREAD_COUNT,
    shouldExpandForTarget,
} from "../../lib/comment-visibility";

/**
 * 댓글 목록: 가장 최근 댓글 3개를 보여주고 오래된 댓글을 접는다.
 * 접는 개수는 화면을 처음 그릴 때 정하고, 새 댓글은 아래에 더해지기만 한다.
 */

describe("처음 접는 댓글 수", () => {
    it("3개 이하면 숨기지 않는다", () => {
        for (const count of [0, 1, 2, INITIAL_THREAD_COUNT]) {
            expect(hiddenRootCount(count, false)).toBe(0);
        }
    });

    it("3개를 넘으면 오래된 댓글부터 숨긴다 (최근 3개는 보임)", () => {
        expect(hiddenRootCount(5, false)).toBe(2);
        expect(hiddenRootCount(8, false)).toBe(5);
    });

    it("펼치면 모두 보인다", () => {
        expect(hiddenRootCount(8, true)).toBe(0);
        expect(hiddenRootCount(8, true, 5)).toBe(0);
    });
});

describe("화면을 연 뒤 댓글이 바뀔 때", () => {
    it("새 댓글이 달려도 접는 수는 늘지 않는다 (보이던 댓글이 접히지 않음)", () => {
        const baseline = hiddenRootCount(5, false); // 2
        expect(hiddenRootCount(6, false, baseline)).toBe(2);
        expect(hiddenRootCount(9, false, baseline)).toBe(2);
    });

    it("댓글이 지워져 줄면 최근 3개는 계속 보이도록 접는 수도 줄인다", () => {
        const baseline = hiddenRootCount(5, false); // 2
        expect(hiddenRootCount(4, false, baseline)).toBe(1);
        expect(hiddenRootCount(3, false, baseline)).toBe(0);
    });

    it("처음에 3개 이하였던 글은 새 댓글이 와도 접지 않는다", () => {
        const baseline = hiddenRootCount(2, false); // 0
        expect(hiddenRootCount(7, false, baseline)).toBe(0);
    });
});

describe("알림으로 들어온 댓글 자동 펼치기", () => {
    it("접힌 쪽(오래된 댓글)에 있으면 펼친다", () => {
        expect(shouldExpandForTarget(0, 3)).toBe(true);
        expect(shouldExpandForTarget(2, 3)).toBe(true);
    });

    it("보이는 쪽에 있으면 펼치지 않는다", () => {
        expect(shouldExpandForTarget(3, 3)).toBe(false);
        expect(shouldExpandForTarget(5, 3)).toBe(false);
    });

    it("대상이 없거나 접힌 댓글이 없으면 펼치지 않는다", () => {
        expect(shouldExpandForTarget(-1, 3)).toBe(false);
        expect(shouldExpandForTarget(0, 0)).toBe(false);
    });
});
