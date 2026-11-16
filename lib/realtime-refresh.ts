/**
 * F1·F2: 피드 실시간 새로고침 판단
 *
 * 예전에는 posts·comments·likes의 모든 변경마다 피드 전체를 다시 그렸다.
 *   - 내가 한 행동은 서버 응답(revalidatePath)으로 이미 갱신됐는데 한 번 더 (F1)
 *   - 보고 있지 않은 공간의 댓글·좋아요에도 (F2)
 *   - 삭제(DELETE) 이벤트는 Supabase가 필터·RLS를 적용하지 않아
 *     서비스 어디서든 무언가 지워지면 모든 사용자가 (F2)
 *
 * 이 파일은 "이 이벤트로 새로고침할지"만 판단하는 순수 함수라
 * 유닛 테스트로 검증한다 (tests/security/realtime-refresh.test.ts).
 */

/** Supabase `in` 필터에 넣을 수 있는 값의 최대 개수 */
export const REALTIME_IN_FILTER_MAX = 100;

export type FeedTable = "posts" | "comments" | "likes";

export type FeedRealtimeEvent = {
    table: FeedTable;
    eventType: "INSERT" | "UPDATE" | "DELETE";
    new: Record<string, unknown>;
    old: Record<string, unknown>;
};

export type FeedView = {
    currentUserId: string;
    /** 지금 피드에 보이는 게시물 id */
    postIds: ReadonlySet<number>;
    /** 지금 피드에 보이는 댓글 id */
    commentIds: ReadonlySet<number>;
};

export function shouldRefreshFeed(
    event: FeedRealtimeEvent,
    view: FeedView
): boolean {
    // 삭제 이벤트에는 지워진 행의 기본 키만 온다 (작성자 정보 없음).
    // 화면에 있는 게시물·댓글이 지워졌을 때만 새로고침한다.
    if (event.eventType === "DELETE") {
        if (event.table === "posts") {
            return view.postIds.has(Number(event.old.id));
        }

        if (event.table === "comments") {
            return view.commentIds.has(Number(event.old.id));
        }

        // 좋아요 취소는 구독하지 않는다 (다른 공간 사용자에게도
        // 누가 어느 게시물 좋아요를 취소했는지 전달되기 때문).
        return false;
    }

    // 내가 만든 변경은 서버 응답으로 이미 화면에 반영됐다.
    if (event.new.user_id === view.currentUserId) {
        return false;
    }

    // 게시물은 현재 공간(group_id)으로 걸러서 구독한다.
    if (event.table === "posts") {
        return true;
    }

    // 댓글·좋아요는 화면에 있는 게시물의 것만
    return view.postIds.has(Number(event.new.post_id));
}

/**
 * 댓글·좋아요 추가 이벤트를 화면의 최근 게시물로 거르는 필터.
 * 게시물이 없으면 null (구독하지 않음).
 */
export function postIdInFilter(postIds: readonly number[]): string | null {
    const ids = postIds
        .filter((id) => Number.isInteger(id) && id > 0)
        .slice(0, REALTIME_IN_FILTER_MAX);

    if (ids.length === 0) {
        return null;
    }

    return `post_id=in.(${ids.join(",")})`;
}
