import { beforeAll, describe, expect, it } from "vitest";
import {
    FEED_PAGE,
    NOTIFICATION_PAGE,
    nextListLimit,
    parseListLimit,
} from "../../lib/list-pagination";
import {
    fetchFeedPage,
    fetchNotificationPage,
    limitIncludingPost,
} from "../../lib/feed-query";
import {
    adminClient,
    createGroup,
    createTestUser,
    joinGroup,
    type TestUser,
} from "./helpers";

/**
 * B1: 피드·알림 페이지네이션
 *
 * 앱(page.tsx)이 쓰는 조회 함수를 로컬 DB에 그대로 실행해 검증한다.
 */

describe("B1 limit 계산", () => {
    it("URL limit을 pageSize 단위로 올림하고 범위를 제한한다", () => {
        expect(parseListLimit(undefined, FEED_PAGE)).toBe(20);
        expect(parseListLimit("abc", FEED_PAGE)).toBe(20);
        expect(parseListLimit("-5", FEED_PAGE)).toBe(20);
        expect(parseListLimit("21", FEED_PAGE)).toBe(40);
        expect(parseListLimit("40", FEED_PAGE)).toBe(40);
        expect(parseListLimit("999999", FEED_PAGE)).toBe(200);
        expect(parseListLimit(["60", "80"], FEED_PAGE)).toBe(60);
    });

    it("더 불러올 것이 있을 때만 다음 limit을 준다", () => {
        expect(nextListLimit(20, 20, 45, FEED_PAGE)).toBe(40);
        expect(nextListLimit(40, 45, 45, FEED_PAGE)).toBeNull();
        expect(nextListLimit(20, 7, 7, FEED_PAGE)).toBeNull();
        expect(nextListLimit(200, 200, 500, FEED_PAGE)).toBeNull();
        // 전체 개수를 모를 때는 꽉 찼으면 더 있다고 본다
        expect(nextListLimit(20, 20, null, FEED_PAGE)).toBe(40);
    });
});

describe("B1 피드 조회 (로컬 DB)", () => {
    let owner: TestUser;
    let member: TestUser;
    let outsider: TestUser;
    let groupId: number;
    let otherGroupId: number;
    const postIdsNewestFirst: number[] = [];
    const TOTAL = 45;

    beforeAll(async () => {
        owner = await createTestUser("feed-owner");
        member = await createTestUser("feed-member");
        outsider = await createTestUser("feed-outsider");
        const group = await createGroup(owner, "페이지 공간");
        await joinGroup(member, group.inviteCode);
        groupId = group.id;
        otherGroupId = (await createGroup(outsider, "다른 공간")).id;

        // 시간 순서가 확실하도록 created_at을 직접 지정해 관리자 권한으로 만든다.
        // 마지막 5개는 같은 시각으로 만들어 동시각 정렬(id desc)도 검증한다.
        const base = Date.parse("2026-01-01T00:00:00Z");
        const rows = Array.from({ length: TOTAL }, (_, index) => ({
            user_id: owner.id,
            group_id: groupId,
            content: `게시물 ${index}`,
            created_at: new Date(
                base + Math.min(index, TOTAL - 5) * 60_000
            ).toISOString(),
        }));
        const { data, error } = await adminClient()
            .from("posts")
            .insert(rows)
            .select("id, created_at");
        if (error) throw error;

        const sorted = [...data!].sort((a, b) =>
            a.created_at === b.created_at
                ? b.id - a.id
                : b.created_at.localeCompare(a.created_at)
        );
        postIdsNewestFirst.push(...sorted.map((row) => row.id));

        await adminClient().from("posts").insert({
            user_id: outsider.id,
            group_id: otherGroupId,
            content: "다른 공간 글",
        });
    });

    it("첫 페이지는 최신 20개와 전체 개수를 준다", async () => {
        const page = await fetchFeedPage(member.client, groupId, 20);
        expect(page.error).toBeNull();
        expect(page.total).toBe(TOTAL);
        expect(page.posts.map((post: { id: number }) => post.id)).toEqual(
            postIdsNewestFirst.slice(0, 20)
        );
    });

    it("limit을 늘리면 앞 페이지를 포함해 순서가 유지된다 (동시각 게시물 포함)", async () => {
        const page = await fetchFeedPage(member.client, groupId, 60);
        expect(page.posts.map((post: { id: number }) => post.id)).toEqual(
            postIdsNewestFirst
        );
    });

    it("페이지네이션 후에도 다른 공간의 글은 보이지 않는다", async () => {
        const page = await fetchFeedPage(outsider.client, groupId, 60);
        expect(page.posts).toHaveLength(0);
    });

    it("딥링크 대상이 첫 페이지 밖이면 그 게시물까지 포함하도록 limit을 늘린다", async () => {
        const oldest = postIdsNewestFirst[TOTAL - 1];
        const limit = await limitIncludingPost(
            member.client,
            groupId,
            oldest,
            20,
            FEED_PAGE
        );
        expect(limit).toBe(60);

        const page = await fetchFeedPage(member.client, groupId, limit);
        expect(page.posts.some((post: { id: number }) => post.id === oldest)).toBe(true);
    });

    it("동시각 게시물 사이의 딥링크도 정확히 계산한다", async () => {
        // 정렬상 21번째(인덱스 20)의 게시물 → 40개가 필요
        const target = postIdsNewestFirst[20];
        expect(
            await limitIncludingPost(member.client, groupId, target, 20, FEED_PAGE)
        ).toBe(40);
        // 첫 페이지 안의 게시물이면 그대로
        expect(
            await limitIncludingPost(member.client, groupId, postIdsNewestFirst[3], 20, FEED_PAGE)
        ).toBe(20);
    });

    it("다른 공간이거나 볼 수 없는 게시물 딥링크는 limit을 바꾸지 않는다", async () => {
        expect(
            await limitIncludingPost(outsider.client, groupId, postIdsNewestFirst[44], 20, FEED_PAGE)
        ).toBe(20);
        expect(
            await limitIncludingPost(member.client, groupId, 999999999, 20, FEED_PAGE)
        ).toBe(20);
    });
});

describe("B1 알림 조회 (로컬 DB)", () => {
    it("최신순 limit개와 전체·읽지 않은 개수를 따로 준다", async () => {
        const receiver = await createTestUser("notif-receiver");
        const actor = await createTestUser("notif-actor");
        const group = await createGroup(actor, "알림 페이지 공간");
        await joinGroup(receiver, group.inviteCode);

        const { data: post } = await adminClient()
            .from("posts")
            .insert({ user_id: actor.id, group_id: group.id, content: "글" })
            .select("id")
            .single();

        const base = Date.parse("2026-02-01T00:00:00Z");
        const rows = Array.from({ length: 35 }, (_, index) => ({
            user_id: receiver.id,
            actor_id: actor.id,
            type: "post",
            post_id: post!.id,
            is_read: index < 10, // 가장 오래된 10개만 읽음
            created_at: new Date(base + index * 1000).toISOString(),
        }));
        const { error } = await adminClient().from("notifications").insert(rows);
        expect(error).toBeNull();

        const page = await fetchNotificationPage(
            receiver.client,
            receiver.id,
            NOTIFICATION_PAGE.pageSize
        );
        expect(page.error).toBeNull();
        expect(page.notifications).toHaveLength(30);
        expect(page.total).toBe(35);
        expect(page.unreadCount).toBe(25);

        const times = page.notifications.map(
            (n: { created_at: string }) => Date.parse(n.created_at)
        );
        expect([...times].sort((a, b) => b - a)).toEqual(times);
    });
});
