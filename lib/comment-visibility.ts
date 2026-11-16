/**
 * 댓글 목록에서 처음에 보여줄 범위
 *
 * 예전에는 가장 오래된 댓글 3개만 보여줘서, 새로 쓴 댓글(내 것·친구 것)이
 * 저장되자마자 "더 보기" 안으로 숨었다 (보였다가 사라지고 화면이 위로 튐).
 *
 * 이제는 가장 최근 댓글 3개를 보여주고 오래된 댓글을 접는다.
 * 접는 개수는 화면을 처음 그릴 때 정해 두고, 그 뒤에 달린 새 댓글은
 * 아래에 더해지기만 한다 (보이던 댓글이 접히며 화면이 줄어드는 일이 없다).
 * 순서는 오래된 → 최신 그대로다.
 */

export const INITIAL_THREAD_COUNT = 3;

/**
 * 접혀 있을 때 숨기는 (가장 오래된) 최상위 댓글 수
 *
 * @param baselineHidden 화면을 처음 그릴 때 숨긴 수. 주면 새 댓글이
 *   늘어도 그보다 많이 숨기지 않는다 (삭제로 줄면 함께 줄어든다).
 */
export function hiddenRootCount(
    rootCount: number,
    expanded: boolean,
    baselineHidden?: number,
    visibleCount = INITIAL_THREAD_COUNT
): number {
    if (expanded) {
        return 0;
    }

    const byWindow = Math.max(rootCount - visibleCount, 0);

    return baselineHidden === undefined
        ? byWindow
        : Math.min(baselineHidden, byWindow);
}

/**
 * 알림으로 들어온 댓글(의 최상위 댓글)이 접힌 쪽에 있으면 펼쳐야 한다.
 * targetRootIndex는 오래된 순 정렬에서의 위치 (-1이면 없음).
 */
export function shouldExpandForTarget(
    targetRootIndex: number,
    hiddenCount: number
): boolean {
    return targetRootIndex >= 0 && targetRootIndex < hiddenCount;
}
