import type { SupabaseClient } from "@supabase/supabase-js";
import type { ListPageConfig } from "@/lib/list-pagination";

/**
 * B1: 피드·알림 조회 쿼리
 *
 * page.tsx에 있던 조회를 함수로 분리해 로컬 DB 테스트로 검증할 수 있게 한다.
 * (tests/security/b1-pagination.test.ts)
 */

export const FEED_POST_SELECT = `
    id,
    content,
    image_path,
    created_at,
    user_id,
    group_id,
    post_images (
        id,
        image_path,
        sort_order
    ),

    profiles!posts_user_id_fkey (
        nickname,
        avatar_url
    ),

    likes (
        user_id
    ),

    comments (
        id,
        content,
        created_at,
        user_id,
        parent_id,
        reply_to_user_id,

        profiles!comments_user_id_fkey (
            nickname,
            avatar_url
        ),

        comment_mentions (
            user_id
        )
    )
`;

/** 공간의 최신 게시물을 limit개까지, 전체 개수와 함께 가져온다. */
export async function fetchFeedPage(
    supabase: SupabaseClient,
    groupId: number,
    limit: number
) {
    const { data, count, error } = await supabase
        .from("posts")
        .select(FEED_POST_SELECT, { count: "exact" })
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit);

    return {
        posts: data ?? [],
        total: count ?? null,
        error,
    };
}

/**
 * 알림 딥링크(/?group=&post=)로 들어왔을 때 대상 게시물이
 * 첫 페이지 밖에 있으면, 그 게시물까지 보이도록 limit을 늘린다.
 * 대상이 이 공간에 없거나 볼 수 없으면 limit을 그대로 돌려준다.
 */
export async function limitIncludingPost(
    supabase: SupabaseClient,
    groupId: number,
    postId: number,
    limit: number,
    config: ListPageConfig
): Promise<number> {
    if (!Number.isInteger(postId) || postId <= 0) {
        return limit;
    }

    const { data: target, error } = await supabase
        .from("posts")
        .select("id, created_at")
        .eq("id", postId)
        .eq("group_id", groupId)
        .maybeSingle();

    if (error || !target) {
        return limit;
    }

    // 정렬(created_at desc, id desc)에서 대상보다 앞에 있거나 대상 자신인 행 수
    const createdAt = JSON.stringify(target.created_at);
    const { count, error: countError } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("group_id", groupId)
        .or(
            `created_at.gt.${createdAt},and(created_at.eq.${createdAt},id.gte.${target.id})`
        );

    if (countError || count === null) {
        return limit;
    }

    if (count <= limit) {
        return limit;
    }

    const rounded =
        Math.ceil(count / config.pageSize) * config.pageSize;

    return Math.min(rounded, config.max);
}

export const NOTIFICATION_SELECT = `
    id,
    type,
    post_id,
    comment_id,
    is_read,
    created_at,
    actor_id,

    profiles!notifications_actor_id_fkey (
        nickname,
        avatar_url
    ),

    posts (
        group_id
    )
`;

/** 내 알림을 최신순으로 limit개까지, 전체·읽지 않은 개수와 함께 가져온다. */
export async function fetchNotificationPage(
    supabase: SupabaseClient,
    userId: string,
    limit: number
) {
    const [listResult, unreadResult] = await Promise.all([
        supabase
            .from("notifications")
            .select(NOTIFICATION_SELECT, { count: "exact" })
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(limit),

        supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("is_read", false),
    ]);

    return {
        notifications: listResult.data ?? [],
        total: listResult.count ?? null,
        unreadCount: unreadResult.count ?? 0,
        error: listResult.error ?? unreadResult.error,
    };
}
