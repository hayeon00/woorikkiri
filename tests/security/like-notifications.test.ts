import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
    adminClient,
    createGroup,
    createTestUser,
    joinGroup,
    rawRest,
    type TestUser,
} from "./helpers";

/**
 * 좋아요 알림 정리
 *
 * 알림 삭제 권한(RLS)은 받는 사람에게만 있어서, 좋아요를 취소한 사람이
 * 알림을 지우려던 앱 코드는 늘 조용히 실패했다. 그래서
 *   - 좋아요를 취소해도 "좋아했어요" 알림이 남았고
 *   - 좋아요 → 취소 → 좋아요를 반복하면 알림이 쌓였고
 *   - 좋아요를 누른 상태에서는 REST로 알림을 원하는 만큼 넣을 수 있었다.
 * DB가 직접 정리(트리거)하고 한 건만 허용(유일 인덱스)하는지 확인한다.
 */
describe("좋아요 알림 정리", () => {
    let owner: TestUser; // 게시물 작성자 (알림 받는 사람)
    let liker: TestUser; // 좋아요 누르는 친구
    let other: TestUser; // 같은 공간의 다른 친구
    let postId: number;

    async function likeNotificationCount(actorId = liker.id) {
        const { count, error } = await adminClient()
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", owner.id)
            .eq("actor_id", actorId)
            .eq("post_id", postId)
            .eq("type", "like");
        if (error) throw error;
        return count ?? 0;
    }

    /** 앱(setLike)과 같은 순서: 좋아요 저장 → 알림 저장 */
    async function like(user: TestUser = liker) {
        const { error } = await user.client
            .from("likes")
            .insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
        return user.client.from("notifications").insert({
            user_id: owner.id,
            actor_id: user.id,
            type: "like",
            post_id: postId,
        });
    }

    async function unlike(user: TestUser = liker) {
        const { error } = await user.client
            .from("likes")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", user.id);
        if (error) throw error;
    }

    beforeAll(async () => {
        owner = await createTestUser("like-noti-owner");
        liker = await createTestUser("like-noti-liker");
        other = await createTestUser("like-noti-other");

        const group = await createGroup(owner, "좋아요 알림 공간");
        await joinGroup(liker, group.inviteCode);
        await joinGroup(other, group.inviteCode);

        const { data, error } = await owner.client
            .from("posts")
            .insert({
                user_id: owner.id,
                group_id: group.id,
                content: "좋아요 알림 테스트",
            })
            .select("id")
            .single();
        if (error) throw error;
        postId = data.id;
    });

    beforeEach(async () => {
        const admin = adminClient();
        await admin.from("likes").delete().eq("post_id", postId);
        await admin.from("notifications").delete().eq("post_id", postId);
    });

    it("좋아요하면 알림이 1건 생긴다", async () => {
        const { error } = await like();
        expect(error).toBeNull();
        expect(await likeNotificationCount()).toBe(1);
    });

    it("좋아요를 취소하면 그 알림도 사라진다", async () => {
        await like();
        await unlike();
        expect(await likeNotificationCount()).toBe(0);
    });

    it("좋아요 → 취소 → 좋아요를 반복해도 알림은 1건이다", async () => {
        for (let i = 0; i < 3; i++) {
            await like();
            await unlike();
        }
        await like();
        expect(await likeNotificationCount()).toBe(1);
    });

    it("좋아요를 누른 상태에서 REST로 알림을 반복해 넣을 수 없다", async () => {
        await like();

        const payload = {
            user_id: owner.id,
            actor_id: liker.id,
            type: "like",
            post_id: postId,
        };
        for (let i = 0; i < 3; i++) {
            const result = await rawRest(liker, "POST", "notifications", payload, {
                returnRows: false,
            });
            expect(result.status).toBeGreaterThanOrEqual(400);
        }

        expect(await likeNotificationCount()).toBe(1);
    });

    it("다른 친구의 좋아요 알림은 내 취소와 상관없이 남는다", async () => {
        await like(liker);
        await like(other);
        await unlike(liker);

        expect(await likeNotificationCount(liker.id)).toBe(0);
        expect(await likeNotificationCount(other.id)).toBe(1);
    });

    it("받는 사람은 여전히 자기 알림을 지울 수 있고, 다른 사람은 지울 수 없다", async () => {
        await like();

        await other.client
            .from("notifications")
            .delete()
            .eq("post_id", postId);
        expect(await likeNotificationCount()).toBe(1);

        const { error } = await owner.client
            .from("notifications")
            .delete()
            .eq("post_id", postId)
            .eq("actor_id", liker.id);
        expect(error).toBeNull();
        expect(await likeNotificationCount()).toBe(0);
    });

    it("게시물을 삭제하면 좋아요·알림도 함께 정리된다", async () => {
        const { data, error } = await owner.client
            .from("posts")
            .insert({
                user_id: owner.id,
                group_id: (
                    await adminClient()
                        .from("posts")
                        .select("group_id")
                        .eq("id", postId)
                        .single()
                ).data!.group_id,
                content: "곧 지울 게시물",
            })
            .select("id")
            .single();
        if (error) throw error;
        const tempPostId = data.id;

        await liker.client
            .from("likes")
            .insert({ post_id: tempPostId, user_id: liker.id });
        await liker.client.from("notifications").insert({
            user_id: owner.id,
            actor_id: liker.id,
            type: "like",
            post_id: tempPostId,
        });

        const { error: deleteError } = await owner.client
            .from("posts")
            .delete()
            .eq("id", tempPostId);
        expect(deleteError).toBeNull();

        const { count } = await adminClient()
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("post_id", tempPostId);
        expect(count ?? 0).toBe(0);
    });
});
