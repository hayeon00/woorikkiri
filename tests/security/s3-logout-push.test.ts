import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
    deletePushSubscriptionForEndpoint,
    normalizePushEndpoint,
    readCurrentPushEndpoint,
    unsubscribeCurrentPush,
    type PushEnvironment,
} from "../../lib/push-subscription-cleanup";
import { adminClient, createTestUser, rawRest, type TestUser } from "./helpers";

/**
 * S3: 로그아웃 시 푸시 구독 해제
 *
 * 로그아웃 서버 액션(app/actions.ts logout)과 설정 화면(LogoutForm)이 쓰는
 * 함수를 실제 로컬 DB와 가짜 브라우저 환경으로 검증한다.
 */

function fakeEndpoint() {
    return `https://push.example.test/send/${randomUUID()}`;
}

async function registerSubscription(user: TestUser, endpoint: string) {
    // 앱(savePushSubscription)과 같은 RPC로 등록
    const { error } = await user.client.rpc("register_push_subscription", {
        p_endpoint: endpoint,
        p_p256dh: "test-p256dh",
        p_auth: "test-auth",
        p_user_agent: "vitest",
    });
    if (error) throw error;
}

async function subscriptionOwner(endpoint: string) {
    const { data, error } = await adminClient()
        .from("push_subscriptions")
        .select("user_id")
        .eq("endpoint", endpoint)
        .maybeSingle();
    if (error) throw error;
    return data?.user_id ?? null;
}

describe("S3 로그아웃 시 푸시 구독 해제", () => {
    let alice: TestUser;
    let bob: TestUser;

    beforeAll(async () => {
        alice = await createTestUser("push-alice");
        bob = await createTestUser("push-bob");
    });

    describe("DB 구독 삭제", () => {
        it("로그아웃하는 본인의 현재 기기 구독이 삭제된다", async () => {
            const endpoint = fakeEndpoint();
            await registerSubscription(alice, endpoint);
            expect(await subscriptionOwner(endpoint)).toBe(alice.id);

            const deleted = await deletePushSubscriptionForEndpoint(
                alice.client,
                alice.id,
                endpoint
            );

            expect(deleted).toBe(1);
            expect(await subscriptionOwner(endpoint)).toBeNull();
        });

        it("같은 사용자의 다른 기기 구독은 남는다", async () => {
            const thisDevice = fakeEndpoint();
            const otherDevice = fakeEndpoint();
            await registerSubscription(alice, thisDevice);
            await registerSubscription(alice, otherDevice);

            await deletePushSubscriptionForEndpoint(alice.client, alice.id, thisDevice);

            expect(await subscriptionOwner(thisDevice)).toBeNull();
            expect(await subscriptionOwner(otherDevice)).toBe(alice.id);
        });

        it("다른 사용자는 남의 endpoint를 넘겨도 구독을 지울 수 없다", async () => {
            const endpoint = fakeEndpoint();
            await registerSubscription(alice, endpoint);

            const asBob = await deletePushSubscriptionForEndpoint(
                bob.client,
                bob.id,
                endpoint
            );
            const spoofedUserId = await deletePushSubscriptionForEndpoint(
                bob.client,
                alice.id,
                endpoint
            );

            expect(asBob).toBe(0);
            expect(spoofedUserId).toBe(0);
            expect(await subscriptionOwner(endpoint)).toBe(alice.id);
        });

        it("REST로 직접 DELETE해도 남의 구독은 지워지지 않는다", async () => {
            const endpoint = fakeEndpoint();
            await registerSubscription(alice, endpoint);

            await rawRest(
                bob,
                "DELETE",
                `push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`
            );

            expect(await subscriptionOwner(endpoint)).toBe(alice.id);
        });

        it("다음 사용자가 같은 기기에서 다시 알림을 켜면 새 계정으로 등록된다", async () => {
            const endpoint = fakeEndpoint();
            await registerSubscription(alice, endpoint);
            await deletePushSubscriptionForEndpoint(alice.client, alice.id, endpoint);

            await registerSubscription(bob, endpoint);
            expect(await subscriptionOwner(endpoint)).toBe(bob.id);
        });
    });

    describe("endpoint 입력 검증", () => {
        it("https URL만 받는다", () => {
            const endpoint = fakeEndpoint();
            expect(normalizePushEndpoint(`  ${endpoint} `)).toBe(endpoint);
            expect(normalizePushEndpoint("http://push.example.test/x")).toBeNull();
            expect(normalizePushEndpoint("not a url")).toBeNull();
            expect(normalizePushEndpoint("")).toBeNull();
            expect(normalizePushEndpoint(null)).toBeNull();
            expect(normalizePushEndpoint(`https://a.test/${"x".repeat(3000)}`)).toBeNull();
        });
    });

    describe("브라우저 구독 처리 (가짜 서비스워커 환경)", () => {
        it("현재 구독의 endpoint를 읽고 해제한다", async () => {
            const unsubscribe = vi.fn().mockResolvedValue(true);
            const env: PushEnvironment = {
                getSubscription: async () => ({ endpoint: "https://e.test/1", unsubscribe }),
            };

            expect(await readCurrentPushEndpoint(env)).toBe("https://e.test/1");
            expect(await unsubscribeCurrentPush(env)).toBe(true);
            expect(unsubscribe).toHaveBeenCalledOnce();
        });

        it("푸시 미지원·구독 없음·오류에서도 로그아웃을 막지 않는다", async () => {
            const throwing: PushEnvironment = {
                getSubscription: async () => {
                    throw new Error("서비스워커 오류");
                },
            };
            const empty: PushEnvironment = { getSubscription: async () => null };

            expect(await readCurrentPushEndpoint(null)).toBeNull();
            expect(await readCurrentPushEndpoint(throwing)).toBeNull();
            expect(await readCurrentPushEndpoint(empty)).toBeNull();
            expect(await unsubscribeCurrentPush(null)).toBe(false);
            expect(await unsubscribeCurrentPush(throwing)).toBe(false);
            expect(await unsubscribeCurrentPush(empty)).toBe(false);
        });
    });
});
