import "server-only";

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushType =
    | "post"
    | "like"
    | "comment";

type PushPayload = {
    title: string;
    body: string;
    url: string;
};

export async function sendPushToUsers(
    userIds: string[],
    type: PushType,
    payload: PushPayload
) {
    const uniqueUserIds = Array.from(
        new Set(userIds.filter(Boolean))
    );

    if (uniqueUserIds.length === 0) {
        return;
    }

    const publicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    const privateKey =
        process.env.VAPID_PRIVATE_KEY;

    const subject =
        process.env.VAPID_SUBJECT;

    if (
        !publicKey ||
        !privateKey ||
        !subject
    ) {
        console.error(
            "Push 발송 실패: VAPID 환경변수가 없습니다."
        );
        return;
    }

    const admin = createAdminClient();

    // ========================================
    // 사용자별 Push 설정 확인
    //
    // 설정 행이 없는 기존 사용자는
    // 모든 Push를 허용한 것으로 처리한다.
    // ========================================

    const {
        data: preferences,
        error: preferenceError,
    } = await admin
        .from("notification_preferences")
        .select(
            "user_id, push_enabled, post_enabled, like_enabled, comment_enabled"
        )
        .in("user_id", uniqueUserIds);

    if (preferenceError) {
        console.error(
            "Push 설정 조회 실패:",
            preferenceError
        );
        return;
    }

    const preferenceMap = new Map(
        (preferences ?? []).map(
            (preference) => [
                preference.user_id,
                preference,
            ]
        )
    );

    const allowedUserIds =
        uniqueUserIds.filter((userId) => {
            const preference =
                preferenceMap.get(userId);

            // 기존 사용자처럼 설정 행이 없으면
            // 기본값은 모두 ON
            if (!preference) {
                return true;
            }

            if (!preference.push_enabled) {
                return false;
            }

            if (
                type === "post" &&
                !preference.post_enabled
            ) {
                return false;
            }

            if (
                type === "like" &&
                !preference.like_enabled
            ) {
                return false;
            }

            if (
                type === "comment" &&
                !preference.comment_enabled
            ) {
                return false;
            }

            return true;
        });

    if (allowedUserIds.length === 0) {
        return;
    }

    // ========================================
    // 허용된 사용자들의 기기 구독 조회
    // ========================================

    const {
        data: subscriptions,
        error,
    } = await admin
        .from("push_subscriptions")
        .select(
            "id, user_id, endpoint, p256dh, auth"
        )
        .in("user_id", allowedUserIds);

    if (error) {
        console.error(
            "Push 구독 조회 실패:",
            error
        );
        return;
    }

    if (!subscriptions?.length) {
        return;
    }

    webpush.setVapidDetails(
        subject,
        publicKey,
        privateKey
    );

    const message =
        JSON.stringify(payload);

    await Promise.allSettled(
        subscriptions.map(
            async (subscription) => {
                try {
                    await webpush.sendNotification(
                        {
                            endpoint:
                            subscription.endpoint,
                            keys: {
                                p256dh:
                                subscription.p256dh,
                                auth:
                                subscription.auth,
                            },
                        },
                        message,
                        {
                            TTL: 60 * 60,
                            urgency: "high",
                        }
                    );
                } catch (error: unknown) {
                    const statusCode =
                        typeof error === "object" &&
                        error !== null &&
                        "statusCode" in error
                            ? Number(
                                (
                                    error as {
                                        statusCode?: unknown;
                                    }
                                ).statusCode
                            )
                            : undefined;

                    console.error(
                        "Push 발송 실패:",
                        statusCode ?? error
                    );

                    if (
                        statusCode === 404 ||
                        statusCode === 410
                    ) {
                        const {
                            error: deleteError,
                        } = await admin
                            .from(
                                "push_subscriptions"
                            )
                            .delete()
                            .eq(
                                "id",
                                subscription.id
                            );

                        if (deleteError) {
                            console.error(
                                "만료 Push 구독 삭제 실패:",
                                deleteError
                            );
                        }
                    }
                }
            }
        )
    );
}