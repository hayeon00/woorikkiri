import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { adminClient, createTestUser, type TestUser } from "./helpers";

/**
 * S6: 사진 버킷 형식·크기 제한 (마이그레이션 20261114150000)
 * 클라이언트 검사를 거치지 않고 Storage API로 직접 올리는 경우를 검증한다.
 */

const PNG = Uint8Array.from(
    Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
    )
);
const SVG = new TextEncoder().encode(
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
);

async function upload(user: TestUser, bucket: string, body: Uint8Array, contentType: string, ext: string) {
    const path = `${user.id}/${randomUUID()}.${ext}`;
    const { error } = await user.client.storage
        .from(bucket)
        .upload(path, body, { contentType });
    return { path, error };
}

describe("S6 업로드 제한", () => {
    let user: TestUser;

    beforeAll(async () => {
        user = await createTestUser("upload");
    });

    it("버킷 설정이 마이그레이션대로 적용됐다", async () => {
        for (const id of ["post-images", "avatars"]) {
            const { data, error } = await adminClient().storage.getBucket(id);
            expect(error).toBeNull();
            expect(data?.public).toBe(false);
            expect(data?.file_size_limit).toBe(5242880);
            expect(data?.allowed_mime_types).not.toContain("image/svg+xml");
            expect(data?.allowed_mime_types).toContain("image/heic");
        }
    });

    it("SVG는 게시물·프로필 버킷 모두 거부된다", async () => {
        for (const bucket of ["post-images", "avatars"]) {
            const result = await upload(user, bucket, SVG, "image/svg+xml", "svg");
            expect(result.error).not.toBeNull();
        }
    });

    it("이미지가 아닌 형식은 거부된다", async () => {
        const result = await upload(user, "post-images", new TextEncoder().encode("hello"), "text/html", "html");
        expect(result.error).not.toBeNull();
    });

    it("5MB를 넘는 파일은 거부된다", async () => {
        const big = new Uint8Array(5 * 1024 * 1024 + 1);
        const result = await upload(user, "post-images", big, "image/jpeg", "jpg");
        expect(result.error).not.toBeNull();
    });

    it("PNG·JPEG·HEIC 사진은 올라간다", async () => {
        expect((await upload(user, "post-images", PNG, "image/png", "png")).error).toBeNull();
        expect((await upload(user, "post-images", PNG, "image/jpeg", "jpg")).error).toBeNull();
        expect((await upload(user, "avatars", PNG, "image/heic", "heic")).error).toBeNull();
    });
});
