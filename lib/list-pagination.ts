/**
 * B1: 피드·알림 목록 페이지네이션
 *
 * 서버 렌더링 구조를 유지하기 위해 URL의 `limit` 값을 늘리는
 * "더 보기" 방식을 쓴다. 한 번에 읽는 행 수에 상한을 두어
 * Supabase 최대 행 수 제한(기본 1000)에 걸려 목록이 잘리는 일을 막는다.
 */

export type ListPageConfig = {
    pageSize: number;
    max: number;
};

export const FEED_PAGE: ListPageConfig = { pageSize: 20, max: 200 };
export const NOTIFICATION_PAGE: ListPageConfig = { pageSize: 30, max: 300 };

/** URL의 limit 값을 pageSize 단위로 올림하고 [pageSize, max] 범위로 제한한다. */
export function parseListLimit(
    raw: string | string[] | undefined | null,
    config: ListPageConfig
): number {
    const value = Array.isArray(raw) ? raw[0] : raw;
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= config.pageSize) {
        return config.pageSize;
    }

    const rounded =
        Math.ceil(parsed / config.pageSize) * config.pageSize;

    return Math.min(rounded, config.max);
}

/** "더 보기"를 눌렀을 때의 다음 limit. 더 불러올 것이 없으면 null. */
export function nextListLimit(
    currentLimit: number,
    loadedCount: number,
    totalCount: number | null,
    config: ListPageConfig
): number | null {
    const hasMore =
        totalCount !== null
            ? loadedCount < totalCount
            : loadedCount >= currentLimit;

    if (!hasMore || currentLimit >= config.max) {
        return null;
    }

    return Math.min(currentLimit + config.pageSize, config.max);
}
