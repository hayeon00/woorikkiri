import { describe, expect, it } from "vitest";
import {
    postIdInFilter,
    REALTIME_IN_FILTER_MAX,
    shouldRefreshFeed,
    type FeedRealtimeEvent,
} from "../../lib/realtime-refresh";

/**
 * F1·F2: 피드 실시간 새로고침 판단
 */

const ME = "me-uuid";
const FRIEND = "friend-uuid";

const view = {
    currentUserId: ME,
    postIds: new Set([10, 11]),
    commentIds: new Set([100, 101]),
};

function ev(partial: Partial<FeedRealtimeEvent>): FeedRealtimeEvent {
    return {
        table: "comments",
        eventType: "INSERT",
        new: {},
        old: {},
        ...partial,
    };
}

describe("F1 내가 만든 변경", () => {
    it("내 댓글·좋아요·게시물 추가는 새로고침하지 않는다 (서버 응답으로 이미 반영)", () => {
        for (const table of ["comments", "likes", "posts"] as const) {
            expect(
                shouldRefreshFeed(
                    ev({ table, new: { user_id: ME, post_id: 10, id: 10 } }),
                    view
                )
            ).toBe(false);
        }
    });

    it("내 게시물 수정도 새로고침하지 않는다", () => {
        expect(
            shouldRefreshFeed(
                ev({ table: "posts", eventType: "UPDATE", new: { id: 10, user_id: ME } }),
                view
            )
        ).toBe(false);
    });
});

describe("F2 친구의 변경", () => {
    it("화면에 있는 게시물의 댓글·좋아요는 새로고침한다", () => {
        expect(
            shouldRefreshFeed(ev({ table: "comments", new: { user_id: FRIEND, post_id: 10 } }), view)
        ).toBe(true);
        expect(
            shouldRefreshFeed(ev({ table: "likes", new: { user_id: FRIEND, post_id: 11 } }), view)
        ).toBe(true);
    });

    it("화면에 없는 게시물(다른 공간 등)의 댓글·좋아요는 무시한다", () => {
        expect(
            shouldRefreshFeed(ev({ table: "comments", new: { user_id: FRIEND, post_id: 999 } }), view)
        ).toBe(false);
        expect(
            shouldRefreshFeed(ev({ table: "likes", new: { user_id: FRIEND, post_id: 999 } }), view)
        ).toBe(false);
    });

    it("현재 공간의 새 게시물·수정은 새로고침한다", () => {
        expect(
            shouldRefreshFeed(ev({ table: "posts", new: { id: 12, user_id: FRIEND } }), view)
        ).toBe(true);
        expect(
            shouldRefreshFeed(
                ev({ table: "posts", eventType: "UPDATE", new: { id: 10, user_id: FRIEND } }),
                view
            )
        ).toBe(true);
    });
});

describe("F2 삭제 이벤트 (필터·RLS가 적용되지 않음)", () => {
    it("화면에 있는 게시물·댓글이 지워지면 새로고침한다", () => {
        expect(
            shouldRefreshFeed(ev({ table: "posts", eventType: "DELETE", old: { id: 10 } }), view)
        ).toBe(true);
        expect(
            shouldRefreshFeed(ev({ table: "comments", eventType: "DELETE", old: { id: 101 } }), view)
        ).toBe(true);
    });

    it("화면에 없는 게시물·댓글 삭제는 무시한다", () => {
        expect(
            shouldRefreshFeed(ev({ table: "posts", eventType: "DELETE", old: { id: 999 } }), view)
        ).toBe(false);
        expect(
            shouldRefreshFeed(ev({ table: "comments", eventType: "DELETE", old: { id: 999 } }), view)
        ).toBe(false);
    });

    it("좋아요 취소는 화면에 있는 게시물이어도 새로고침하지 않는다", () => {
        expect(
            shouldRefreshFeed(
                ev({ table: "likes", eventType: "DELETE", old: { post_id: 10, user_id: FRIEND } }),
                view
            )
        ).toBe(false);
    });
});

describe("구독 필터", () => {
    it("게시물 id로 in 필터를 만든다", () => {
        expect(postIdInFilter([10, 11])).toBe("post_id=in.(10,11)");
    });

    it("게시물이 없으면 구독하지 않는다", () => {
        expect(postIdInFilter([])).toBeNull();
    });

    it("최신 100개까지만 넣고, 잘못된 값은 뺀다", () => {
        const ids = Array.from({ length: 150 }, (_, i) => 150 - i);
        const filter = postIdInFilter([0, -1, NaN, ...ids])!;
        const values = filter.slice("post_id=in.(".length, -1).split(",");

        expect(values).toHaveLength(REALTIME_IN_FILTER_MAX);
        expect(values[0]).toBe("150");
        expect(values.at(-1)).toBe("51");
    });
});
