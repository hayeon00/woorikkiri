import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signUrlsByPath } from "../../lib/signed-url-batch";

/**
 * F4: 서명 주소 일괄 생성 도우미
 */

type Item = { path: string | null; signedUrl: string; error: string | null };

function fakeSupabase(result: { data: Item[] | null; error: unknown }) {
    const createSignedUrls = vi.fn(async () => result);
    const from = vi.fn(() => ({ createSignedUrls }));
    return {
        client: { storage: { from } } as unknown as SupabaseClient,
        from,
        createSignedUrls,
    };
}

describe("서명 주소 일괄 생성", () => {
    it("빈 경로·중복을 걸러 한 번만 요청하고, 경로별로 돌려준다", async () => {
        const fake = fakeSupabase({
            data: [
                { path: "a.png", signedUrl: "https://x/a?token=1", error: null },
                { path: "b.png", signedUrl: "https://x/b?token=2", error: null },
            ],
            error: null,
        });

        const urls = await signUrlsByPath(
            fake.client,
            "avatars",
            ["a.png", null, "b.png", undefined, "", "a.png"],
            3600
        );

        expect(fake.from).toHaveBeenCalledWith("avatars");
        expect(fake.createSignedUrls).toHaveBeenCalledTimes(1);
        expect(fake.createSignedUrls).toHaveBeenCalledWith(["a.png", "b.png"], 3600);
        expect(urls.get("a.png")).toBe("https://x/a?token=1");
        expect(urls.get("b.png")).toBe("https://x/b?token=2");
    });

    it("경로가 없으면 요청하지 않는다", async () => {
        const fake = fakeSupabase({ data: [], error: null });

        const urls = await signUrlsByPath(fake.client, "avatars", [null, ""], 3600);

        expect(fake.createSignedUrls).not.toHaveBeenCalled();
        expect(urls.size).toBe(0);
    });

    it("일부 경로만 실패하면 그 경로만 빠진다", async () => {
        const fake = fakeSupabase({
            data: [
                { path: "a.png", signedUrl: "https://x/a?token=1", error: null },
                { path: null, signedUrl: "", error: "Either the object does not exist" },
            ],
            error: null,
        });

        const urls = await signUrlsByPath(fake.client, "post-images", ["a.png", "gone.png"], 3600);

        expect(urls.get("a.png")).toBe("https://x/a?token=1");
        expect(urls.has("gone.png")).toBe(false);
    });

    it("요청 전체가 실패하면 빈 결과를 돌려준다 (화면은 기본 아이콘)", async () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const fake = fakeSupabase({ data: null, error: new Error("boom") });

        const urls = await signUrlsByPath(fake.client, "avatars", ["a.png"], 3600);

        expect(urls.size).toBe(0);
        errorSpy.mockRestore();
    });
});
