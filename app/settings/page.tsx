import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

import {
    logout,
    updateNickname,
    updateAvatar,
    createGroup,
    joinGroup,
    leaveGroup,
    updateGroupName,
    deleteGroup,
} from "../actions";

async function SettingsContent() {
    const supabase = await createClient();

    // ========================================
    // 로그인 사용자
    // ========================================

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return (
            <main className="mx-auto min-h-screen max-w-md p-6">
                <h1 className="text-2xl font-bold">
                    우리끼리
                </h1>

                <p className="mt-3 text-gray-500">
                    로그인이 필요합니다.
                </p>

                <a
                    href="/auth/login"
                    className="mt-6 inline-block rounded-xl bg-black px-5 py-3 text-sm text-white"
                >
                    로그인하기
                </a>
            </main>
        );
    }

    // ========================================
    // 내 프로필
    // ========================================

    const {
        data: myProfile,
    } = await supabase
        .from("profiles")
        .select(
            "nickname, avatar_url"
        )
        .eq("id", user.id)
        .single();

    let myAvatarUrl:
        | string
        | null = null;

    if (myProfile?.avatar_url) {
        const { data } =
            await supabase.storage
                .from("avatars")
                .createSignedUrl(
                    myProfile.avatar_url,
                    60 * 60
                );

        myAvatarUrl =
            data?.signedUrl ??
            null;
    }

    // ========================================
    // 내가 가입한 그룹
    // ========================================

    const {
        data: memberships,
        error: membershipError,
    } = await supabase
        .from("group_members")
        .select(`
            group_id,
            joined_at,

            groups (
                id,
                name,
                invite_code,
                owner_id,
                created_at
            )
        `)
        .eq("user_id", user.id)
        .order("joined_at", {
            ascending: true,
        });

    if (membershipError) {
        console.error(
            "그룹 조회 실패:",
            membershipError
        );
    }

    return (
        <main className="mx-auto min-h-screen max-w-md border-x bg-white pb-24">

            {/* ================================= */}
            {/* HEADER */}
            {/* ================================= */}

            <header className="sticky top-0 z-10 border-b bg-white/95 px-5 py-4 backdrop-blur">

                <div className="flex items-center justify-between">

                    <div>

                        <p className="text-xs text-gray-400">
                            우리끼리
                        </p>

                        <h1 className="text-xl font-bold">
                            내 정보
                        </h1>

                    </div>

                    <a
                        href="/"
                        className="rounded-full border px-4 py-2 text-sm"
                    >
                        완료
                    </a>

                </div>

            </header>


            <div className="space-y-6 p-5">

                {/* ================================= */}
                {/* 프로필 */}
                {/* ================================= */}

                <section className="rounded-3xl border p-5">

                    <h2 className="font-bold">
                        프로필
                    </h2>

                    <div className="mt-5 flex items-center gap-4">

                        {myAvatarUrl ? (

                            <img
                                src={myAvatarUrl}
                                alt="내 프로필 사진"
                                className="h-20 w-20 shrink-0 rounded-full object-cover"
                            />

                        ) : (

                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gray-100 text-3xl">
                                👤
                            </div>

                        )}

                        <div className="min-w-0">

                            <p className="truncate text-lg font-bold">
                                {myProfile?.nickname ??
                                    "친구"}
                            </p>

                            <p className="mt-1 truncate text-sm text-gray-400">
                                {user.email}
                            </p>

                        </div>

                    </div>


                    {/* 프로필 사진 변경 */}

                    <form
                        action={updateAvatar}
                        className="mt-5"
                    >

                        <label className="text-sm font-semibold">
                            프로필 사진 변경
                        </label>

                        <input
                            type="file"
                            name="avatar"
                            accept="image/*"
                            required
                            className="mt-2 block w-full rounded-xl border p-2 text-sm"
                        />

                        <button
                            type="submit"
                            className="mt-3 w-full rounded-xl border px-4 py-2.5 text-sm font-semibold"
                        >
                            사진 변경
                        </button>

                    </form>


                    {/* 닉네임 변경 */}

                    <form
                        action={updateNickname}
                        className="mt-6 border-t pt-5"
                    >

                        <label className="text-sm font-semibold">
                            닉네임
                        </label>

                        <input
                            type="text"
                            name="nickname"
                            minLength={2}
                            maxLength={20}
                            required
                            defaultValue={
                                myProfile?.nickname ??
                                ""
                            }
                            className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none"
                        />

                        <button
                            type="submit"
                            className="mt-3 w-full rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white"
                        >
                            닉네임 저장
                        </button>

                    </form>

                </section>


                {/* ================================= */}
                {/* 내 공간 */}
                {/* ================================= */}

                <section className="rounded-3xl border p-5">

                    <div className="flex items-center justify-between">

                        <h2 className="font-bold">
                            내 공간
                        </h2>

                        <span className="text-sm text-gray-400">
                            {memberships?.length ??
                                0}
                            개
                        </span>

                    </div>


                    <div className="mt-4 space-y-3">

                        {memberships?.map(
                            (
                                membership: any
                            ) => {

                                const group =
                                    membership.groups;

                                if (!group) {
                                    return null;
                                }

                                const isOwner =
                                    group.owner_id ===
                                    user.id;

                                return (
                                    <div
                                        key={
                                            group.id
                                        }
                                        className="rounded-2xl bg-gray-50 p-4"
                                    >

                                        <div className="flex items-center justify-between gap-3">

                                            <div className="min-w-0">

                                                <p className="truncate font-semibold">
                                                    {
                                                        group.name
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs text-gray-400">
                                                    초대코드{" "}
                                                    <span className="font-mono font-semibold">
                                                        {
                                                            group.invite_code
                                                        }
                                                    </span>
                                                </p>

                                            </div>

                                            {isOwner ? (

                                                <span className="shrink-0 rounded-full bg-black px-2.5 py-1 text-xs text-white">
                                                    방장
                                                </span>

                                            ) : (

                                                <span className="shrink-0 rounded-full border px-2.5 py-1 text-xs">
                                                    멤버
                                                </span>

                                            )}

                                        </div>


                                        <a
                                            href={`/?group=${group.id}`}
                                            className="mt-3 inline-block text-sm font-semibold"
                                        >
                                            이 공간으로 이동 →
                                        </a>


                                        {/* 방장 */}

                                        {isOwner ? (

                                            <div className="mt-4 border-t pt-4">

                                                <form
                                                    action={
                                                        updateGroupName
                                                    }
                                                >

                                                    <input
                                                        type="hidden"
                                                        name="group_id"
                                                        value={
                                                            group.id
                                                        }
                                                    />

                                                    <label className="text-xs font-semibold text-gray-500">
                                                        공간 이름 변경
                                                    </label>

                                                    <div className="mt-2 flex gap-2">

                                                        <input
                                                            type="text"
                                                            name="name"
                                                            required
                                                            maxLength={
                                                                30
                                                            }
                                                            defaultValue={
                                                                group.name
                                                            }
                                                            className="min-w-0 flex-1 rounded-xl border bg-white px-3 py-2 text-sm outline-none"
                                                        />

                                                        <button
                                                            type="submit"
                                                            className="shrink-0 rounded-xl bg-black px-3 py-2 text-sm text-white"
                                                        >
                                                            변경
                                                        </button>

                                                    </div>

                                                </form>


                                                <form
                                                    action={
                                                        deleteGroup
                                                    }
                                                    className="mt-5"
                                                >

                                                    <input
                                                        type="hidden"
                                                        name="group_id"
                                                        value={
                                                            group.id
                                                        }
                                                    />

                                                    <label className="text-xs font-semibold text-red-600">
                                                        공간 삭제
                                                    </label>

                                                    <p className="mt-1 text-xs leading-5 text-gray-400">
                                                        삭제하려면{" "}
                                                        <strong>
                                                            {
                                                                group.name
                                                            }
                                                        </strong>
                                                        을(를) 정확히
                                                        입력하세요.
                                                    </p>

                                                    <input
                                                        type="text"
                                                        name="confirm_name"
                                                        required
                                                        autoComplete="off"
                                                        placeholder={
                                                            group.name
                                                        }
                                                        className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none"
                                                    />

                                                    <button
                                                        type="submit"
                                                        className="mt-2 w-full rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600"
                                                    >
                                                        이 공간 영구 삭제
                                                    </button>

                                                </form>

                                            </div>

                                        ) : (

                                            <form
                                                action={
                                                    leaveGroup
                                                }
                                                className="mt-4 border-t pt-4"
                                            >

                                                <input
                                                    type="hidden"
                                                    name="group_id"
                                                    value={
                                                        group.id
                                                    }
                                                />

                                                <button
                                                    type="submit"
                                                    className="text-sm text-red-500"
                                                >
                                                    이 공간에서 나가기
                                                </button>

                                            </form>

                                        )}

                                    </div>
                                );
                            }
                        )}

                    </div>

                </section>


                {/* ================================= */}
                {/* 새 공간 만들기 */}
                {/* ================================= */}

                <section className="rounded-3xl border p-5">

                    <h2 className="font-bold">
                        새 공간 만들기
                    </h2>

                    <p className="mt-1 text-sm text-gray-400">
                        새로운 친구 공간을 만들 수 있어요.
                    </p>

                    <form
                        action={createGroup}
                        className="mt-4 flex gap-2"
                    >

                        <input
                            type="text"
                            name="name"
                            required
                            maxLength={30}
                            placeholder="공간 이름"
                            className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none"
                        />

                        <button
                            type="submit"
                            className="shrink-0 rounded-xl bg-black px-4 py-2.5 text-sm text-white"
                        >
                            만들기
                        </button>

                    </form>

                </section>


                {/* ================================= */}
                {/* 초대코드 참여 */}
                {/* ================================= */}

                <section className="rounded-3xl border p-5">

                    <h2 className="font-bold">
                        초대코드로 참여
                    </h2>

                    <p className="mt-1 text-sm text-gray-400">
                        친구에게 받은 6자리 코드를 입력하세요.
                    </p>

                    <form
                        action={joinGroup}
                        className="mt-4 flex gap-2"
                    >

                        <input
                            type="text"
                            name="invite_code"
                            required
                            maxLength={6}
                            placeholder="ABC123"
                            className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm uppercase outline-none"
                        />

                        <button
                            type="submit"
                            className="shrink-0 rounded-xl border px-4 py-2.5 text-sm"
                        >
                            참여
                        </button>

                    </form>

                </section>


                {/* ================================= */}
                {/* 로그아웃 */}
                {/* ================================= */}

                <section className="rounded-3xl border p-5">

                    <form action={logout}>

                        <button
                            type="submit"
                            className="w-full rounded-xl border px-4 py-3 text-sm font-semibold"
                        >
                            로그아웃
                        </button>

                    </form>

                </section>

            </div>


            {/* ================================= */}
            {/* 하단 메뉴 */}
            {/* ================================= */}

            <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 border-t bg-white px-6 py-3">

                <a
                    href="/"
                    className="flex flex-1 flex-col items-center gap-1 text-xs text-gray-400"
                >
                    <span className="text-xl">
                        ⌂
                    </span>

                    <span>
                        피드
                    </span>
                </a>

                <a
                    href="/settings"
                    className="flex flex-1 flex-col items-center gap-1 text-xs font-semibold text-black"
                >
                    <span className="text-xl">
                        ●
                    </span>

                    <span>
                        내 정보
                    </span>
                </a>

            </nav>

        </main>
    );
}

export default function SettingsPage() {
    return (
        <Suspense
            fallback={
                <main className="mx-auto min-h-screen max-w-md border-x bg-white p-6">
                    <h1 className="text-2xl font-bold">
                        우리끼리
                    </h1>

                    <p className="mt-3 text-sm text-gray-400">
                        내 정보를 불러오는 중...
                    </p>
                </main>
            }
        >
            <SettingsContent />
        </Suspense>
    );
}