import { describe, expect, it } from "vitest";
import {
    createStableUrlCache,
    signedUrlKey,
    STABLE_URL_MAX_AGE_MS,
} from "../../lib/stable-signed-url";

/**
 * F3: 같은 사진은 아직 유효한 예전 서명 주소를 재사용한다
 */

const BASE =
    "http://127.0.0.1:54321/storage/v1/object/sign/post-images/user-a/photo-1.png";

function signed(path: string, token: string) {
    return `${path}?token=${token}`;
}

describe("서명 주소 키", () => {
    it("token(쿼리)만 다른 주소는 같은 사진으로 본다", () => {
        expect(signedUrlKey(signed(BASE, "aaa"))).toBe(
            signedUrlKey(signed(BASE, "bbb"))
        );
    });

    it("경로가 다르면 다른 사진이다", () => {
        expect(signedUrlKey(signed(BASE, "aaa"))).not.toBe(
            signedUrlKey(signed(BASE.replace("photo-1", "photo-2"), "aaa"))
        );
    });
});

describe("주소 재사용", () => {
    function setup() {
        let time = 1_000_000;
        const cache = createStableUrlCache(STABLE_URL_MAX_AGE_MS, () => time);
        return {
            cache,
            advance: (ms: number) => {
                time += ms;
            },
        };
    }

    it("처음 본 주소는 그대로 쓴다", () => {
        const { cache } = setup();
        expect(cache.resolve(signed(BASE, "first"))).toBe(signed(BASE, "first"));
    });

    it("같은 사진의 새 주소가 와도 50분 안에는 처음 주소를 계속 쓴다", () => {
        const { cache, advance } = setup();
        cache.resolve(signed(BASE, "first"));

        advance(10 * 60 * 1000);
        expect(cache.resolve(signed(BASE, "second"))).toBe(signed(BASE, "first"));

        advance(39 * 60 * 1000);
        expect(cache.resolve(signed(BASE, "third"))).toBe(signed(BASE, "first"));
    });

    it("50분이 지나면 새 주소로 바꾸고, 그때부터 다시 재사용한다", () => {
        const { cache, advance } = setup();
        cache.resolve(signed(BASE, "first"));

        advance(STABLE_URL_MAX_AGE_MS);
        expect(cache.resolve(signed(BASE, "second"))).toBe(signed(BASE, "second"));

        advance(60 * 1000);
        expect(cache.resolve(signed(BASE, "third"))).toBe(signed(BASE, "second"));
    });

    it("다른 사진끼리는 섞이지 않는다", () => {
        const { cache } = setup();
        const other = BASE.replace("photo-1", "photo-2");
        cache.resolve(signed(BASE, "a"));

        expect(cache.resolve(signed(other, "b"))).toBe(signed(other, "b"));
        expect(cache.resolve(signed(BASE, "c"))).toBe(signed(BASE, "a"));
    });

    it("빈 주소는 그대로 돌려준다", () => {
        const { cache } = setup();
        expect(cache.resolve("")).toBe("");
    });
});
