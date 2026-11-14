import { beforeAll, describe, expect, it } from "vitest";
import {
    adminClient,
    createGroup,
    createPostWithImages,
    createTestUser,
    joinGroup,
    rawRest,
    type TestUser,
} from "./helpers";

/**
 * S2: 알림 생성 권한
 *
 * 앱(서버 액션)이 만드는 알림은 모두 허용하고,
 * REST API를 직접 호출해 만드는 위조·스팸 알림은 막는다.
 */
describe("S2 알림 생성 권한", () => {
    let owner: TestUser;   // G1 방장, 게시물 작성자
    let member: TestUser;  // G1 멤버 (공격자 역할도 겸함)
    let buddy: TestUser;   // G1 멤버 (멘션 대상)
    let outsider: TestUser; // G1과 무관한 사용자
    let g1: { id: number; inviteCode: string };
    let postId: number;

    /**
     * 앱과 같이 return=minimal로 INSERT하고,
     * 실제로 행이 생겼는지는 관리자 권한으로 다시 센다.
     */
    async function insertNotification(actor: TestUser, row: Record<string, unknown>) {
        const payload = { actor_id: actor.id, post_id: postId, ...row };
        const before = await countNotifications(payload);
        const result = await rawRest(actor, "POST", "notifications", payload, {
            returnRows: false,
        });
        const after = await countNotifications(payload);
        return { status: result.status, created: after - before };
    }

    async function countNotifications(row: Record<string, unknown>) {
        let query = adminClient()
            .from("notifications")
            .select("id", { count: "exact", head: true });
        for (const [key, value] of Object.entries(row)) {
            query = query.eq(key, value as string);
        }
        const { count, error } = await query;
        if (error) throw error;
        return count ?? 0;
    }

    async function createComment(
        author: TestUser,
        fields: { parent_id?: number; reply_to_user_id?: string } = {}
    ) {
        const { data, error } = await author.client
            .from("comments")
            .insert({
                post_id: postId,
                user_id: author.id,
                content: "댓글",
                ...fields,
            })
            .select("id")
            .single();
        if (error) throw error;
        return data.id as number;
    }

    beforeAll(async () => {
        owner = await createTestUser("n-owner");
        member = await createTestUser("n-member");
        buddy = await createTestUser("n-buddy");
        outsider = await createTestUser("n-outsider");

        g1 = await createGroup(owner, "알림 공간");
        await joinGroup(member, g1.inviteCode);
        await joinGroup(buddy, g1.inviteCode);
        await createGroup(outsider, "외부 공간");

        postId = await createPostWithImages(owner, g1.id, []);
    });

    describe("위조·스팸 알림은 차단된다 (REST 직접 호출)", () => {
        it("공간 멤버가 아닌 사용자에게 알림을 보낼 수 없다", async () => {
            const result = await insertNotification(member, {
                user_id: outsider.id,
                type: "comment",
            });
            expect(result.status).toBeGreaterThanOrEqual(400);
            expect(result.created).toBe(0);
        });

        it("좋아요를 누르지 않고 'like' 알림을 만들 수 없다", async () => {
            const result = await insertNotification(buddy, {
                user_id: owner.id,
                type: "like",
            });
            expect(result.status).toBeGreaterThanOrEqual(400);
            expect(result.created).toBe(0);
        });

        it("'like' 알림은 게시물 작성자에게만 보낼 수 있다", async () => {
            await member.client.from("likes").insert({ post_id: postId, user_id: member.id });
            const result = await insertNotification(member, {
                user_id: buddy.id,
                type: "like",
            });
            expect(result.status).toBeGreaterThanOrEqual(400);
            expect(result.created).toBe(0);
        });

        it("남이 쓴 게시물로 'post' 알림을 만들 수 없다", async () => {
            const result = await insertNotification(member, {
                user_id: buddy.id,
                type: "post",
            });
            expect(result.status).toBeGreaterThanOrEqual(400);
            expect(result.created).toBe(0);
        });

        it("댓글 없이 'comment' 알림을 만들 수 없다", async () => {
            const result = await insertNotification(member, {
                user_id: owner.id,
                type: "comment",
            });
            expect(result.status).toBeGreaterThanOrEqual(400);
            expect(result.created).toBe(0);
        });

        it("남이 쓴 댓글로 'comment' 알림을 만들 수 없다", async () => {
            const buddyComment = await createComment(buddy);
            const result = await insertNotification(member, {
                user_id: owner.id,
                type: "comment",
                comment_id: buddyComment,
            });
            expect(result.status).toBeGreaterThanOrEqual(400);
            expect(result.created).toBe(0);
        });

        it("멘션하지 않은 사람에게 'mention' 알림을 만들 수 없다", async () => {
            const ownComment = await createComment(member);
            const result = await insertNotification(member, {
                user_id: buddy.id,
                type: "mention",
                comment_id: ownComment,
            });
            expect(result.status).toBeGreaterThanOrEqual(400);
            expect(result.created).toBe(0);
        });

        it("답글 대상이 아닌 사람에게 'reply' 알림을 만들 수 없다", async () => {
            const parent = await createComment(owner);
            const reply = await createComment(member, {
                parent_id: parent,
                reply_to_user_id: owner.id,
            });
            const result = await insertNotification(member, {
                user_id: buddy.id,
                type: "reply",
                comment_id: reply,
            });
            expect(result.status).toBeGreaterThanOrEqual(400);
            expect(result.created).toBe(0);
        });

        it("다른 게시물의 댓글을 끌어와 알림을 만들 수 없다", async () => {
            const otherPost = await createPostWithImages(member, g1.id, []);
            const { data: otherComment } = await member.client
                .from("comments")
                .insert({ post_id: otherPost, user_id: member.id, content: "다른 글 댓글" })
                .select("id")
                .single();
            const result = await insertNotification(member, {
                user_id: owner.id,
                type: "comment",
                comment_id: otherComment!.id,
            });
            expect(result.status).toBeGreaterThanOrEqual(400);
            expect(result.created).toBe(0);
        });

        it("다른 사람을 행위자(actor)로 사칭할 수 없다", async () => {
            const payload = {
                user_id: buddy.id,
                actor_id: owner.id,
                type: "post",
                post_id: postId,
            };
            const before = await countNotifications(payload);
            const result = await rawRest(member, "POST", "notifications", payload, {
                returnRows: false,
            });
            expect(result.status).toBeGreaterThanOrEqual(400);
            expect(await countNotifications(payload)).toBe(before);
        });
    });

    describe("앱이 만드는 정상 알림은 그대로 동작한다", () => {
        it("새 게시물: 작성자가 공간 멤버에게 'post' 알림", async () => {
            const result = await insertNotification(owner, {
                user_id: member.id,
                type: "post",
            });
            expect(result.status).toBe(201);
            expect(result.created).toBe(1);
        });

        it("좋아요: 좋아요를 누른 사람이 작성자에게 'like' 알림", async () => {
            await buddy.client.from("likes").insert({ post_id: postId, user_id: buddy.id });
            const result = await insertNotification(buddy, {
                user_id: owner.id,
                type: "like",
            });
            expect(result.status).toBe(201);
            expect(result.created).toBe(1);
        });

        it("댓글: 댓글 작성자가 게시물 작성자에게 'comment' 알림", async () => {
            const comment = await createComment(member);
            const result = await insertNotification(member, {
                user_id: owner.id,
                type: "comment",
                comment_id: comment,
            });
            expect(result.status).toBe(201);
            expect(result.created).toBe(1);
        });

        it("답글: 답글 대상에게 'reply' 알림", async () => {
            const parent = await createComment(member);
            const reply = await createComment(owner, {
                parent_id: parent,
                reply_to_user_id: member.id,
            });
            const result = await insertNotification(owner, {
                user_id: member.id,
                type: "reply",
                comment_id: reply,
            });
            expect(result.status).toBe(201);
            expect(result.created).toBe(1);
        });

        it("멘션: 멘션된 사람에게 'mention' 알림", async () => {
            const comment = await createComment(member);
            const { error } = await member.client
                .from("comment_mentions")
                .insert({ comment_id: comment, user_id: buddy.id });
            expect(error).toBeNull();

            const result = await insertNotification(member, {
                user_id: buddy.id,
                type: "mention",
                comment_id: comment,
            });
            expect(result.status).toBe(201);
            expect(result.created).toBe(1);
        });

        it("받은 사람은 알림을 조회하고 읽음 처리할 수 있다", async () => {
            const { data, error } = await member.client
                .from("notifications")
                .update({ is_read: true })
                .eq("user_id", member.id)
                .select("id");
            expect(error).toBeNull();
            expect((data ?? []).length).toBeGreaterThan(0);
        });
    });
});
