import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * S3: 로그아웃할 때 현재 기기의 푸시 구독을 해제한다.
 *
 * 서버는 push_subscriptions 테이블에 남은 구독으로만 푸시를 보내므로
 * DB 행 삭제가 핵심이고, 브라우저 구독 해제는 보조 조치다.
 * 이 파일은 서버·클라이언트 어디서나 쓸 수 있도록 순수 함수만 둔다.
 */

const MAX_ENDPOINT_LENGTH = 2048;

export function normalizePushEndpoint(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const endpoint = value.trim();
    if (!endpoint || endpoint.length > MAX_ENDPOINT_LENGTH) return null;
    try {
        const url = new URL(endpoint);
        return url.protocol === "https:" ? endpoint : null;
    } catch {
        return null;
    }
}

/**
 * 로그인한 사용자의 클라이언트로, 그 사용자 소유의 해당 endpoint 구독만 삭제한다.
 * RLS("Users can delete own push subscriptions")와 user_id 조건을 함께 건다.
 * 삭제한 행 수를 돌려준다.
 */
export async function deletePushSubscriptionForEndpoint(
    supabase: SupabaseClient,
    userId: string,
    endpoint: string
): Promise<number> {
    const { data, error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("endpoint", endpoint)
        .select("id");

    if (error) throw error;
    return data?.length ?? 0;
}

type PushSubscriptionLike = {
    endpoint: string;
    unsubscribe(): Promise<boolean>;
};

export type PushEnvironment = {
    getSubscription(): Promise<PushSubscriptionLike | null>;
};

/** 브라우저(서비스워커) 환경에서 현재 기기의 구독을 찾는다. 지원하지 않으면 null. */
export function browserPushEnvironment(): PushEnvironment | null {
    if (
        typeof navigator === "undefined" ||
        !("serviceWorker" in navigator) ||
        typeof window === "undefined" ||
        !("PushManager" in window)
    ) {
        return null;
    }

    return {
        async getSubscription() {
            const registration =
                await navigator.serviceWorker.getRegistration();
            if (!registration) return null;
            return registration.pushManager.getSubscription();
        },
    };
}

/**
 * 현재 기기의 구독 endpoint를 읽는다.
 * 실패해도 로그아웃은 계속되어야 하므로 예외 대신 null을 돌려준다.
 */
export async function readCurrentPushEndpoint(
    env: PushEnvironment | null
): Promise<string | null> {
    if (!env) return null;
    try {
        const subscription = await env.getSubscription();
        return subscription?.endpoint ?? null;
    } catch {
        return null;
    }
}

/** 브라우저 구독을 해제한다. 해제했으면 true. 실패해도 예외를 던지지 않는다. */
export async function unsubscribeCurrentPush(
    env: PushEnvironment | null
): Promise<boolean> {
    if (!env) return false;
    try {
        const subscription = await env.getSubscription();
        if (!subscription) return false;
        return await subscription.unsubscribe();
    } catch {
        return false;
    }
}
