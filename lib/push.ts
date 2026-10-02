import "server-only";

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

type PushPayload = {
    title: string;
    body: string;
    url: string;
};

export async function sendPushToUsers(
    userIds: string[],
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

    if (!publicKey || !privateKey || !subject) {
        console.error(
            "Push 발송 실패: VAPID 환경변수가 없습니다."
        );
        return;
    }

    webpush.setVapidDetails(
        subject,
        publicKey,
        privateKey
    );

    const admin = createAdminClient();

    // Admin Client를 사용하는 이유:
    // push_subscriptions는 본인 것만 조회하도록
    // RLS가 걸려 있기 때문에 서버에서만
    // 수신자의 구독 정보를 조회한다.
    const {
        data: subscriptions,
        error,
    } = await admin
        .from("push_subscriptions")
        .select(
            "id, user_id, endpoint, p256dh, auth"
        )
        .in("user_id", uniqueUserIds);

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

                    // 만료/해지된 Push 구독 자동 정리
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