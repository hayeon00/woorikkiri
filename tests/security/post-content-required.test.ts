import { beforeAll, describe, expect, it } from "vitest";

import { createGroup, createTestUser, uploadImage, type TestUser } from "./helpers";

/**
 * 게시물에는 글이 항상 있어야 한다 (사진만 올리기 불가).
 * 앱(createPost·updatePost)과 DB의 posts_content_check(1~500자)가 같은 규칙인지 확인한다.
 */

describe("게시물 글 필수", () => {
    let user: TestUser;
    let groupId: number;

    beforeAll(async () => {
        user = await createTestUser("content-required");
        groupId = (await createGroup(user, "글 필수 공간")).id;
    });

    it("사진만 있고 글이 없으면 DB가 거부한다", async () => {
        const imagePath = await uploadImage(user);
        const { error } = await user.client.from("posts").insert({
            user_id: user.id,
            group_id: groupId,
            content: "",
            image_path: imagePath,
        });
        expect(error?.message).toMatch(/posts_content_check/);
    });

    it("글과 사진이 함께 있으면 저장된다", async () => {
        const imagePath = await uploadImage(user);
        const { error } = await user.client.from("posts").insert({
            user_id: user.id,
            group_id: groupId,
            content: "사진과 함께",
            image_path: imagePath,
        });
        expect(error).toBeNull();
    });

    it("사진 게시물의 글을 모두 지우는 수정은 거부된다", async () => {
        const imagePath = await uploadImage(user);
        const { data: post } = await user.client
            .from("posts")
            .insert({ user_id: user.id, group_id: groupId, content: "처음 글", image_path: imagePath })
            .select("id")
            .single();

        const { error } = await user.client.from("posts").update({ content: "" }).eq("id", post!.id);
        expect(error?.message).toMatch(/posts_content_check/);
    });
});
