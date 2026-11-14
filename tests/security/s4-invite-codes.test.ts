import { beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
    adminClient,
    createGroup,
    createTestUser,
    joinGroup,
    localEnv,
    rawRest,
    type TestUser,
} from "./helpers";

/**
 * S4: 초대코드 만료·재발급·시도 제한
 */

async function tryJoin(user: TestUser, code: string) {
    const { data, error } = await user.client.rpc("join_group_by_invite_code", {
        code,
    });
    return { groupId: (data as number | null) ?? null, error };
}

async function isMember(groupId: number, userId: string) {
    const { data } = await adminClient()
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .maybeSingle();
    return Boolean(data);
}

async function groupRow(groupId: number) {
    const { data, error } = await adminClient()
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();
    if (error) throw error;
    return data;
}

describe("S4 초대코드", () => {
    let owner: TestUser;
    let member: TestUser;
    let group: { id: number; inviteCode: string };

    beforeAll(async () => {
        owner = await createTestUser("inv-owner");
        member = await createTestUser("inv-member");
        group = await createGroup(owner, "초대 공간");
        await joinGroup(member, group.inviteCode);
    });

    describe("코드 생성", () => {
        it("새 공간의 코드는 8자리이고 7일 뒤 만료된다", async () => {
            const row = await groupRow(group.id);
            expect(row.invite_code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);

            const expiresIn =
                Date.parse(row.invite_code_expires_at) - Date.now();
            const day = 24 * 60 * 60 * 1000;
            expect(expiresIn).toBeGreaterThan(6.9 * day);
            expect(expiresIn).toBeLessThan(7.1 * day);
        });
    });

    describe("만료", () => {
        it("만료된 코드로는 새로 참여할 수 없다", async () => {
            const g = await createGroup(owner, "만료 공간");
            await adminClient()
                .from("groups")
                .update({ invite_code_expires_at: new Date(Date.now() - 1000).toISOString() })
                .eq("id", g.id);

            const newcomer = await createTestUser("inv-late");
            const result = await tryJoin(newcomer, g.inviteCode);

            expect(result.groupId).toBeNull();
            expect(await isMember(g.id, newcomer.id)).toBe(false);
        });

        it("이미 멤버인 사람은 만료된 링크로 들어와도 그 공간으로 이동한다", async () => {
            const g = await createGroup(owner, "기존 멤버 공간");
            const existing = await createTestUser("inv-existing");
            await joinGroup(existing, g.inviteCode);
            await adminClient()
                .from("groups")
                .update({ invite_code_expires_at: new Date(Date.now() - 1000).toISOString() })
                .eq("id", g.id);

            const result = await tryJoin(existing, g.inviteCode);
            expect(result.error).toBeNull();
            expect(result.groupId).toBe(g.id);
        });
    });

    describe("재발급", () => {
        it("방장이 재발급하면 이전 코드는 무효, 새 코드는 유효하다", async () => {
            const g = await createGroup(owner, "재발급 공간");
            const { data: newCode, error } = await owner.client.rpc(
                "regenerate_invite_code",
                { p_group_id: g.id }
            );
            expect(error).toBeNull();
            expect(newCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
            expect(newCode).not.toBe(g.inviteCode);

            const late = await createTestUser("inv-old-link");
            expect((await tryJoin(late, g.inviteCode)).groupId).toBeNull();

            const fresh = await createTestUser("inv-new-link");
            expect((await tryJoin(fresh, newCode as string)).groupId).toBe(g.id);
        });

        it("방장이 아닌 멤버는 재발급할 수 없다 (REST 직접 호출)", async () => {
            const before = await groupRow(group.id);
            const result = await rawRest(member, "POST", "rpc/regenerate_invite_code", {
                p_group_id: group.id,
            });
            expect(result.status).toBeGreaterThanOrEqual(400);
            expect((await groupRow(group.id)).invite_code).toBe(before.invite_code);
        });

        it("로그인하지 않은 요청은 재발급·참여를 할 수 없다", async () => {
            const env = localEnv();
            const anon = createClient(env.apiUrl, env.anonKey, {
                auth: { persistSession: false },
            });
            const regen = await anon.rpc("regenerate_invite_code", { p_group_id: group.id });
            const join = await anon.rpc("join_group_by_invite_code", { code: group.inviteCode });
            expect(regen.error).not.toBeNull();
            expect(join.error).not.toBeNull();
        });
    });

    describe("REST로 코드·만료일 직접 변경 차단", () => {
        it("방장도 invite_code를 원하는 값으로 바꿀 수 없다", async () => {
            const before = await groupRow(group.id);
            await rawRest(owner, "PATCH", `groups?id=eq.${group.id}`, {
                invite_code: "A",
            });
            expect((await groupRow(group.id)).invite_code).toBe(before.invite_code);
        });

        it("방장도 만료일을 임의로 늘릴 수 없다", async () => {
            const before = await groupRow(group.id);
            await rawRest(owner, "PATCH", `groups?id=eq.${group.id}`, {
                invite_code_expires_at: "2099-01-01T00:00:00Z",
            });
            expect((await groupRow(group.id)).invite_code_expires_at).toBe(
                before.invite_code_expires_at
            );
        });

        it("방장은 공간 이름을 계속 바꿀 수 있다 (앱 updateGroupName)", async () => {
            const { error } = await owner.client
                .from("groups")
                .update({ name: "새 이름" })
                .eq("id", group.id)
                .eq("owner_id", owner.id);
            expect(error).toBeNull();
            expect((await groupRow(group.id)).name).toBe("새 이름");
        });
    });

    describe("시도 제한", () => {
        it("틀린 코드를 10번 입력하면 맞는 코드도 잠시 막힌다", async () => {
            const guesser = await createTestUser("inv-guesser");

            for (let i = 0; i < 10; i += 1) {
                const result = await tryJoin(guesser, `WRONG${i}XX`);
                expect(result.groupId).toBeNull();
            }

            const blocked = await tryJoin(guesser, group.inviteCode);
            expect(blocked.groupId).toBeNull();
            expect(blocked.error?.message ?? "").toMatch(/잠시 후|다시 시도/);
            expect(await isMember(group.id, guesser.id)).toBe(false);
        });

        it("다른 사용자는 영향을 받지 않는다", async () => {
            const normal = await createTestUser("inv-normal");
            const result = await tryJoin(normal, group.inviteCode);
            expect(result.error).toBeNull();
            expect(result.groupId).toBe(group.id);
        });

        it("몇 번 틀려도 한도 전에는 정상 참여할 수 있다", async () => {
            const typo = await createTestUser("inv-typo");
            await tryJoin(typo, "TYPO1234");
            await tryJoin(typo, "TYPO5678");
            const result = await tryJoin(typo, group.inviteCode.toLowerCase());
            expect(result.groupId).toBe(group.id);
        });
    });
});
