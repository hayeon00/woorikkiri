/**
 * F3: 같은 사진은 아직 유효한 예전 서명 주소를 계속 쓴다 (브라우저 전용)
 *
 * 비공개 사진은 서버가 피드를 그릴 때마다 서명 주소(1시간)를 새로 만든다.
 * 사진은 같아도 주소 뒤의 token이 매번 달라서, 브라우저는 처음 보는 사진으로
 * 여기고 다시 내려받았다 (친구 댓글로 피드가 다시 그려질 때마다 화면의 사진 전부).
 *
 * 주소에서 token을 뺀 경로를 키로, 처음 받은 주소를 50분 동안 재사용한다.
 * 서명 주소 유효시간(60분)보다 짧게 잡아 만료된 주소를 쓰지 않게 한다.
 * 볼 권한은 지금처럼 서버가 주소를 만들 때 확인된다.
 */

export const STABLE_URL_MAX_AGE_MS = 50 * 60 * 1000;

type Entry = {
    url: string;
    firstSeenAt: number;
};

/** 서명 주소에서 token(쿼리)을 뺀 사진 경로 */
export function signedUrlKey(url: string): string {
    try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}`;
    } catch {
        return url;
    }
}

export function createStableUrlCache(
    maxAgeMs = STABLE_URL_MAX_AGE_MS,
    now: () => number = () => Date.now()
) {
    const entries = new Map<string, Entry>();

    return {
        resolve(url: string): string {
            if (!url) {
                return url;
            }

            const key = signedUrlKey(url);
            const current = now();
            const cached = entries.get(key);

            if (cached && current - cached.firstSeenAt < maxAgeMs) {
                return cached.url;
            }

            entries.set(key, { url, firstSeenAt: current });
            return url;
        },
    };
}

// 서버에서는 그대로 돌려준다 (요청마다 새로 그리므로 재사용할 대상이 없음).
// 브라우저 첫 렌더에서도 그대로라 서버 HTML과 어긋나지 않는다.
const browserCache =
    typeof window === "undefined" ? null : createStableUrlCache();

export function stableSignedUrl(url: string): string {
    return browserCache ? browserCache.resolve(url) : url;
}
