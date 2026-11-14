import { beforeAll, describe, expect, it } from "vitest";
import {
    DELETED_COMMENT_CONTENT,
    purgeUserContent,
} from "../../lib/account-deletion";
import {
    adminClient,
    createGroup,
    createPostWithImages,
    createTestUser,
    ensureBuckets,
    imageExists,
    joinGroup,
    uploadImage,
    type TestUser,
} from "./helpers";

/**
 * 탈퇴 시 콘텐츠 정리 (app/actions.ts deleteAccount → purgeUserContent)
 */
describe("탈퇴 시 콘텐츠 정리", () => {
    let leaving: TestUser;
    let friend: TestUser;
    let groupId: number;
    let leftGroupId: number;
    let leavingPaths: string[];
    let friendPath: string;
    let friendPostId: number;
    let leavingCommentId: number;
    let friendReplyId: number;

    beforeAll(async () => {
        await ensureBuckets();
        leaving = await createTestUser("leaving-user");
        friend = await createTestUser("leaving-friend");

        const group = await createGroup(friend, "탈퇴 공간");
        groupId = group.id;
        await joinGroup(leaving, group.inviteCode);

        // 사진 2장 게시물 + 이미 나간 공간에 남긴 게시물
        leavingPaths = [await uploadImage(leaving), await uploadImage(leaving)];
        await createPostWithImages(leaving, groupId, leavingPaths);

        const left = await createGroup(friend, "이미 나간 공간");
        leftGroupId = left.id;
        await joinGroup(leaving, left.inviteCode);
        await createPostWithImages(leaving, leftGroupId, []);
        await leaving.client
            .from("group_members")
            .delete()
            .eq("group_id", leftGroupId)
            .eq("user_id", leaving.id);

        // 친구 게시물에 남긴 댓글과, 그 댓글에 달린 친구의 답글
        friendPath = await uploadImage(friend);
        friendPostId = await createPostWithImages(friend, groupId, [friendPath]);
        const { data: comment } = await leaving.client
            .from("comments")
            .insert({ post_id: friendPostId, user_id: leaving.id, content: "개인적인 이야기" })
            .select("id")
            .single();
        leavingCommentId = comment!.id;
        const { data: reply } = await friend.client
            .from("comments")
            .insert({
                post_id: friendPostId,
                user_id: friend.id,
                content: "답글",
                parent_id: leavingCommentId,
                reply_to_user_id: leaving.id,
            })
            .select("id")
            .single();
        friendReplyId = reply!.id;

        // 프로필 사진
        const avatarPath = `${leaving.id}/avatar.png`;
        await leaving.client.storage
            .from("avatars")
            .upload(avatarPath, new Uint8Array([137, 80, 78, 71]), { contentType: "image/png" });
        await adminClient().from("profiles").update({ avatar_url: avatarPath }).eq("id", leaving.id);
    });

    it("정리 후 계정을 삭제하면 게시물·사진·프로필 사진이 모두 사라진다", async () => {
        const admin = adminClient();
        const result = await purgeUserContent(admin, leaving.id);
        expect(result.deletedPosts).toBe(2);
        expect(result.anonymizedComments).toBe(1);

        const { error } = await admin.auth.admin.deleteUser(leaving.id);
        expect(error).toBeNull();

        const { count: posts } = await admin
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", leaving.id);
        expect(posts).toBe(0);

        for (const path of leavingPaths) {
            expect(await imageExists(path)).toBe(false);
        }

        const { data: avatars } = await admin.storage.from("avatars").list(leaving.id);
        expect(avatars ?? []).toHaveLength(0);
    });

    it("이미 나간 공간의 게시물도 삭제된다", async () => {
        const { count } = await adminClient()
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("group_id", leftGroupId);
        expect(count).toBe(0);
    });

    it("친구 게시물의 댓글은 내용만 대체되고, 친구의 답글은 남는다", async () => {
        const admin = adminClient();
        const { data: comment } = await admin
            .from("comments")
            .select("content, user_id")
            .eq("id", leavingCommentId)
            .single();
        expect(comment?.content).toBe(DELETED_COMMENT_CONTENT);
        expect(comment?.user_id).toBeNull();

        const { data: reply } = await admin
            .from("comments")
            .select("id")
            .eq("id", friendReplyId)
            .maybeSingle();
        expect(reply?.id).toBe(friendReplyId);
    });

    it("다른 사람의 게시물과 사진은 그대로다", async () => {
        expect(await imageExists(friendPath)).toBe(true);
        const { data } = await adminClient()
            .from("posts")
            .select("id")
            .eq("id", friendPostId)
            .maybeSingle();
        expect(data?.id).toBe(friendPostId);
    });

    it("다시 실행해도 오류 없이 끝난다", async () => {
        const result = await purgeUserContent(adminClient(), leaving.id);
        expect(result.deletedPosts).toBe(0);
    });
});
