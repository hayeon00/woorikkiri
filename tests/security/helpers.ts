import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

type LocalEnv = {
    apiUrl: string;
    anonKey: string;
    serviceKey: string;
};

let cachedEnv: LocalEnv | null = null;

/**
 * 로컬 Supabase(`supabase start`)의 접속 정보만 읽는다.
 * .env.local 등 운영 환경변수는 절대 읽지 않으며,
 * API 주소가 로컬이 아니면 즉시 중단한다.
 */
export function localEnv(): LocalEnv {
    if (cachedEnv) return cachedEnv;

    const output = execFileSync(
        path.join(here, "node_modules/.bin/supabase"),
        ["status", "--workdir", repoRoot, "-o", "env"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );

    const values = new Map<string, string>();
    for (const line of output.split("\n")) {
        const match = line.match(/^([A-Z_]+)="?(.*?)"?$/);
        if (match) values.set(match[1], match[2]);
    }

    const apiUrl = values.get("API_URL") ?? "";
    const host = new URL(apiUrl).hostname;
    if (host !== "127.0.0.1" && host !== "localhost") {
        throw new Error(
            "보안 테스트는 로컬 Supabase에서만 실행할 수 있습니다."
        );
    }

    const anonKey = values.get("ANON_KEY") ?? "";
    const serviceKey = values.get("SERVICE_ROLE_KEY") ?? "";
    if (!anonKey || !serviceKey) {
        throw new Error("로컬 Supabase 키를 읽지 못했습니다. `npm run db:start`를 먼저 실행하세요.");
    }

    cachedEnv = { apiUrl, anonKey, serviceKey };
    return cachedEnv;
}

export function adminClient(): SupabaseClient {
    const env = localEnv();
    return createClient(env.apiUrl, env.serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

export type TestUser = {
    id: string;
    email: string;
    client: SupabaseClient;
    accessToken: string;
};

/** 테스트 전용 계정을 만들고 로그인한 클라이언트를 돌려준다. */
export async function createTestUser(label: string): Promise<TestUser> {
    const env = localEnv();
    const admin = adminClient();
    const email = `sec-${label}-${randomUUID().slice(0, 8)}@test.local`;
    const password = `pw-${randomUUID()}`;

    const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nickname: label },
    });
    if (error || !data.user) throw error ?? new Error("사용자 생성 실패");

    const client = createClient(env.apiUrl, env.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: session, error: signInError } =
        await client.auth.signInWithPassword({ email, password });
    if (signInError || !session.session) {
        throw signInError ?? new Error("로그인 실패");
    }

    return {
        id: data.user.id,
        email,
        client,
        accessToken: session.session.access_token,
    };
}

/** 로컬 테스트 DB에 앱이 쓰는 버킷이 없으면 만든다. */
export async function ensureBuckets() {
    const admin = adminClient();
    for (const bucket of ["post-images", "avatars"]) {
        const { error } = await admin.storage.getBucket(bucket);
        if (error) {
            const { error: createError } = await admin.storage.createBucket(
                bucket,
                { public: false }
            );
            if (createError && !/already exists/i.test(createError.message)) {
                throw createError;
            }
        }
    }
}

export async function createGroup(owner: TestUser, name: string) {
    const { data, error } = await owner.client.rpc("create_group", {
        group_name: name,
    });
    if (error) throw error;
    const groupId = data as number;

    const { data: group, error: groupError } = await owner.client
        .from("groups")
        .select("invite_code")
        .eq("id", groupId)
        .single();
    if (groupError) throw groupError;

    return { id: groupId, inviteCode: group.invite_code as string };
}

export async function joinGroup(user: TestUser, inviteCode: string) {
    const { error } = await user.client.rpc("join_group_by_invite_code", {
        code: inviteCode,
    });
    if (error) throw error;
}

const PNG_BYTES = Uint8Array.from(
    Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
    )
);

/** 사용자 본인 폴더에 사진을 올리고 경로를 돌려준다. */
export async function uploadImage(user: TestUser): Promise<string> {
    const imagePath = `${user.id}/${randomUUID()}.png`;
    const { error } = await user.client.storage
        .from("post-images")
        .upload(imagePath, PNG_BYTES, { contentType: "image/png" });
    if (error) throw error;
    return imagePath;
}

/** 관리자 권한으로 파일이 실제로 남아 있는지 확인한다. */
export async function imageExists(imagePath: string): Promise<boolean> {
    const admin = adminClient();
    const folder = imagePath.split("/").slice(0, -1).join("/");
    const name = imagePath.split("/").pop();
    const { data, error } = await admin.storage
        .from("post-images")
        .list(folder, { search: name });
    if (error) throw error;
    return (data ?? []).some((file) => file.name === name);
}

/** 사용자가 이 경로의 사진을 열람(서명 URL 발급)할 수 있는지 */
export async function canReadImage(user: TestUser, imagePath: string) {
    const { data, error } = await user.client.storage
        .from("post-images")
        .createSignedUrl(imagePath, 60);
    return !error && Boolean(data?.signedUrl);
}

/** 앱의 createPost와 같은 방식으로 게시물과 사진 행을 만든다. */
export async function createPostWithImages(
    user: TestUser,
    groupId: number,
    imagePaths: string[]
) {
    const { data: post, error } = await user.client
        .from("posts")
        .insert({
            user_id: user.id,
            group_id: groupId,
            content: "테스트 게시물",
            image_path: imagePaths[0] ?? null,
        })
        .select("id")
        .single();
    if (error) throw error;

    if (imagePaths.length > 0) {
        const { error: imagesError } = await user.client
            .from("post_images")
            .insert(
                imagePaths.map((imagePath, index) => ({
                    post_id: post.id,
                    image_path: imagePath,
                    sort_order: index,
                }))
            );
        if (imagesError) throw imagesError;
    }

    return post.id as number;
}

/**
 * supabase-js를 거치지 않고 PostgREST에 직접 요청한다.
 * 브라우저 개발자 도구나 curl로 서버 액션을 우회하는 상황을 재현한다.
 */
export async function rawRest(
    user: TestUser,
    method: "POST" | "PATCH" | "DELETE" | "GET",
    pathAndQuery: string,
    body?: unknown,
    options: { returnRows?: boolean } = {}
) {
    const returnRows = options.returnRows ?? true;
    const env = localEnv();
    const response = await fetch(`${env.apiUrl}/rest/v1/${pathAndQuery}`, {
        method,
        headers: {
            apikey: env.anonKey,
            Authorization: `Bearer ${user.accessToken}`,
            "Content-Type": "application/json",
            // 앱(supabase-js insert without select)은 return=minimal을 쓴다.
            // 행을 돌려받으려면 SELECT 권한까지 필요하므로 상황에 맞게 고른다.
            Prefer: returnRows ? "return=representation" : "return=minimal",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return {
        status: response.status,
        rows: response.ok && text ? (JSON.parse(text) as unknown[]) : [],
        body: text,
    };
}
