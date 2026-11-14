import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 계정 탈퇴 시 사용자 콘텐츠 정리
 *
 * 개인정보처리방침(app/privacy)의 "탈퇴 시 처리"와 같은 동작이다.
 *   - 사진(게시물·프로필): Storage에서 사용자 폴더 전체 삭제
 *   - 게시물: 삭제 (댓글·좋아요·사진 행·관련 알림은 FK CASCADE로 함께 삭제)
 *   - 다른 사람 게시물에 쓴 댓글: 대화 흐름을 위해 행은 남기고 내용만 대체
 *     (작성자는 프로필 삭제 시 FK SET NULL로 '탈퇴한 사용자'가 된다)
 * 좋아요·멤버십·알림 설정·푸시 구독 등은 auth 사용자 삭제 시 CASCADE로 지워진다.
 *
 * 반드시 서버에서 서비스 키 클라이언트로 호출한다. 사용자가 이미 나간 공간의
 * 게시물은 RLS로는 지울 수 없기 때문이다. 여러 번 실행해도 안전하다.
 */

export const DELETED_COMMENT_CONTENT = "탈퇴한 사용자의 댓글입니다.";

const STORAGE_BUCKETS = ["post-images", "avatars"] as const;
const LIST_PAGE = 1000;

async function removeUserFolder(
    admin: SupabaseClient,
    bucket: string,
    userId: string
) {
    let removed = 0;

    // 지운 만큼 목록이 줄어들므로 항상 처음부터 다시 읽는다.
    for (;;) {
        const { data, error } = await admin.storage
            .from(bucket)
            .list(userId, { limit: LIST_PAGE });

        if (error) throw error;

        const paths = (data ?? [])
            .filter((item) => item.id !== null)
            .map((item) => `${userId}/${item.name}`);

        if (paths.length === 0) return removed;

        const { error: removeError } = await admin.storage
            .from(bucket)
            .remove(paths);

        if (removeError) throw removeError;

        removed += paths.length;
    }
}

export async function purgeUserContent(
    admin: SupabaseClient,
    userId: string
) {
    if (!userId) {
        throw new Error("사용자 정보가 없습니다.");
    }

    const removedFiles: Record<string, number> = {};
    for (const bucket of STORAGE_BUCKETS) {
        removedFiles[bucket] = await removeUserFolder(admin, bucket, userId);
    }

    const { error: postsError, count: deletedPosts } = await admin
        .from("posts")
        .delete({ count: "exact" })
        .eq("user_id", userId);

    if (postsError) throw postsError;

    const { error: commentsError, count: anonymizedComments } = await admin
        .from("comments")
        .update({ content: DELETED_COMMENT_CONTENT }, { count: "exact" })
        .eq("user_id", userId);

    if (commentsError) throw commentsError;

    const { error: profileError } = await admin
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);

    if (profileError) throw profileError;

    return {
        removedFiles,
        deletedPosts: deletedPosts ?? 0,
        anonymizedComments: anonymizedComments ?? 0,
    };
}
