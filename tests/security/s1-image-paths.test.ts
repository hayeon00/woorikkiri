import { beforeAll, describe, expect, it } from "vitest";
import {
    adminClient,
    canReadImage,
    createGroup,
    createPostWithImages,
    createTestUser,
    ensureBuckets,
    imageExists,
    joinGroup,
    rawRest,
    uploadImage,
    type TestUser,
} from "./helpers";

/**
 * S1: 사진 경로 소유권, 삭제·열람 권한
 *
 * 등장인물
 * - victim:   공간 G1의 방장. 사진이 있는 게시물을 올린다.
 * - member:   G1의 일반 멤버 (정상 열람 확인용)
 * - attacker: G1 멤버였다가 자기 공간 G2를 만든다.
 */
describe("S1 사진 경로 소유권", () => {
    let victim: TestUser;
    let member: TestUser;
    let attacker: TestUser;
    let g1: { id: number; inviteCode: string };
    let g2: { id: number; inviteCode: string };

    beforeAll(async () => {
        await ensureBuckets();
        victim = await createTestUser("victim");
        member = await createTestUser("member");
        attacker = await createTestUser("attacker");

        g1 = await createGroup(victim, "피해자 공간");
        await joinGroup(member, g1.inviteCode);
        await joinGroup(attacker, g1.inviteCode);
        g2 = await createGroup(attacker, "공격자 공간");
    });

    describe("우회 시도는 차단된다", () => {
        it("남의 사진 경로로 posts를 직접 INSERT할 수 없다 (REST 직접 호출)", async () => {
            const victimPath = await uploadImage(victim);
            await createPostWithImages(victim, g1.id, [victimPath]);

            const result = await rawRest(attacker, "POST", "posts", {
                user_id: attacker.id,
                group_id: g2.id,
                content: "planted",
                image_path: victimPath,
            });

            expect(result.rows).toHaveLength(0);
            expect(result.status).toBeGreaterThanOrEqual(400);
        });

        it("심은 게시물로 방장 권한을 얻어 남의 원본 사진을 삭제할 수 없다", async () => {
            const victimPath = await uploadImage(victim);
            await createPostWithImages(victim, g1.id, [victimPath]);

            // 1단계: 내 공간에 남의 경로를 가진 게시물 심기 (차단돼야 함)
            await attacker.client.from("posts").insert({
                user_id: attacker.id,
                group_id: g2.id,
                content: "planted",
                image_path: victimPath,
            });

            // 2단계: 내 공간의 방장 자격으로 삭제 시도
            await attacker.client.storage.from("post-images").remove([victimPath]);

            expect(await imageExists(victimPath)).toBe(true);
        });

        it("내 게시물의 image_path를 남의 경로로 UPDATE할 수 없다", async () => {
            const victimPath = await uploadImage(victim);
            const ownPost = await createPostWithImages(attacker, g2.id, []);

            const result = await rawRest(
                attacker,
                "PATCH",
                `posts?id=eq.${ownPost}`,
                { image_path: victimPath }
            );

            expect(result.rows).toHaveLength(0);
            const { data } = await adminClient()
                .from("posts")
                .select("image_path")
                .eq("id", ownPost)
                .single();
            expect(data?.image_path).toBeNull();
        });

        it("내 게시물에 남의 경로로 post_images를 INSERT할 수 없다", async () => {
            const victimPath = await uploadImage(victim);
            const ownPost = await createPostWithImages(attacker, g2.id, []);

            const result = await rawRest(attacker, "POST", "post_images", {
                post_id: ownPost,
                image_path: victimPath,
                sort_order: 0,
            });

            expect(result.rows).toHaveLength(0);
            expect(result.status).toBeGreaterThanOrEqual(400);
        });

        it("공간을 나간 뒤에는 심은 행으로 남의 사진을 계속 열람할 수 없다", async () => {
            // 이 테스트 전용 공간과 사용자 (다른 테스트의 멤버십에 영향 없도록)
            const owner = await createTestUser("leave-owner");
            const leaver = await createTestUser("leaver");
            const shared = await createGroup(owner, "나갈 공간");
            await joinGroup(leaver, shared.inviteCode);
            const leaverOwn = await createGroup(leaver, "나간 사람 공간");

            const ownerPath = await uploadImage(owner);
            await createPostWithImages(owner, shared.id, [ownerPath]);
            expect(await canReadImage(leaver, ownerPath)).toBe(true);

            // 나가기 전에 자기 공간 게시물에 남의 경로를 심어 두는 시도
            const ownPost = await createPostWithImages(leaver, leaverOwn.id, []);
            await rawRest(leaver, "POST", "post_images", {
                post_id: ownPost,
                image_path: ownerPath,
                sort_order: 0,
            });
            await rawRest(leaver, "POST", "posts", {
                user_id: leaver.id,
                group_id: leaverOwn.id,
                content: "planted",
                image_path: ownerPath,
            });

            const { error } = await leaver.client
                .from("group_members")
                .delete()
                .eq("group_id", shared.id)
                .eq("user_id", leaver.id);
            expect(error).toBeNull();

            expect(await canReadImage(leaver, ownerPath)).toBe(false);
        });

        it("수정 전에 이미 심어진 행이 있어도 열람·삭제 권한을 주지 않는다", async () => {
            const victimPath = await uploadImage(victim);
            await createPostWithImages(victim, g1.id, [victimPath]);

            const outsider = await createTestUser("outsider");
            const g3 = await createGroup(outsider, "외부인 공간");

            // 운영 DB에 이미 존재할 수 있는 악성 행을 관리자 권한으로 재현
            const admin = adminClient();
            const { data: planted, error } = await admin
                .from("posts")
                .insert({
                    user_id: outsider.id,
                    group_id: g3.id,
                    content: "legacy planted",
                    image_path: victimPath,
                })
                .select("id")
                .single();
            expect(error).toBeNull();
            await admin.from("post_images").insert({
                post_id: planted!.id,
                image_path: victimPath,
                sort_order: 0,
            });

            expect(await canReadImage(outsider, victimPath)).toBe(false);
            await outsider.client.storage.from("post-images").remove([victimPath]);
            expect(await imageExists(victimPath)).toBe(true);
        });
    });

    describe("정상 사용은 유지된다", () => {
        it("내 사진으로 게시물과 여러 장의 post_images를 만들 수 있다", async () => {
            const paths = [await uploadImage(victim), await uploadImage(victim)];
            const postId = await createPostWithImages(victim, g1.id, paths);
            expect(postId).toBeGreaterThan(0);
        });

        it("같은 공간 멤버는 사진을 열람할 수 있다", async () => {
            const victimPath = await uploadImage(victim);
            await createPostWithImages(victim, g1.id, [victimPath]);

            expect(await canReadImage(victim, victimPath)).toBe(true);
            expect(await canReadImage(member, victimPath)).toBe(true);
        });

        it("다른 공간 사용자는 열람할 수 없다", async () => {
            const victimPath = await uploadImage(victim);
            await createPostWithImages(victim, g1.id, [victimPath]);
            const stranger = await createTestUser("stranger");
            expect(await canReadImage(stranger, victimPath)).toBe(false);
        });

        it("게시물 내용 수정은 기존 사진 경로를 유지한 채 성공한다", async () => {
            const victimPath = await uploadImage(victim);
            const postId = await createPostWithImages(victim, g1.id, [victimPath]);

            const { data, error } = await victim.client
                .from("posts")
                .update({ content: "수정됨" })
                .eq("id", postId)
                .select("content");
            expect(error).toBeNull();
            expect(data?.[0]?.content).toBe("수정됨");
        });

        it("작성자는 자기 게시물 사진을 삭제할 수 있다", async () => {
            const victimPath = await uploadImage(victim);
            await createPostWithImages(victim, g1.id, [victimPath]);

            const { error } = await victim.client.storage
                .from("post-images")
                .remove([victimPath]);
            expect(error).toBeNull();
            expect(await imageExists(victimPath)).toBe(false);
        });

        it("방장은 공간 삭제 시 다른 멤버 게시물의 모든 사진(2장째 포함)을 지울 수 있다", async () => {
            const owner = await createTestUser("owner");
            const writer = await createTestUser("writer");
            const g = await createGroup(owner, "삭제될 공간");
            await joinGroup(writer, g.inviteCode);

            const paths = [await uploadImage(writer), await uploadImage(writer)];
            await createPostWithImages(writer, g.id, paths);

            await owner.client.storage.from("post-images").remove(paths);

            expect(await imageExists(paths[0])).toBe(false);
            expect(await imageExists(paths[1])).toBe(false);
        });

        it("탈퇴한 작성자(user_id = NULL)의 사진은 공간 멤버가 계속 볼 수 있다", async () => {
            const leaving = await createTestUser("leaving");
            await joinGroup(leaving, g1.inviteCode);
            const leavingPath = await uploadImage(leaving);
            await createPostWithImages(leaving, g1.id, [leavingPath]);

            const { error } = await adminClient().auth.admin.deleteUser(leaving.id);
            expect(error).toBeNull();

            expect(await canReadImage(member, leavingPath)).toBe(true);
        });
    });
});
