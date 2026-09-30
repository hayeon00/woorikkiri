import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InviteLinkButton } from "@/components/invite-link-button";

import {
    logout,
    updateNickname,
    updateAvatar,
    createGroup,
    joinGroup,
    leaveGroup,
    updateGroupName,
    deleteGroup,
    deleteAccount,
} from "../actions";

async function SettingsContent() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();


    if (!user) {
        redirect("/auth/login");
    }


    // ========================================
    // 프로필
    // ========================================

    const { data: myProfile } = await supabase
        .from("profiles")
        .select("nickname, avatar_url")
        .eq("id", user.id)
        .single();

    let myAvatarUrl: string | null = null;

    if (myProfile?.avatar_url) {
        const { data } =
            await supabase.storage
                .from("avatars")
                .createSignedUrl(
                    myProfile.avatar_url,
                    60 * 60
                );

        myAvatarUrl =
            data?.signedUrl ?? null;
    }

    // ========================================
    // 가입한 그룹
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

    // ========================================
    // 내가 방장인 그룹이 있는지 확인
    // ========================================

    const ownedGroups =
        memberships?.filter(
            (membership: any) =>
                membership.groups?.owner_id ===
                user.id
        ) ?? [];

    const hasOwnedGroups =
        ownedGroups.length > 0;

    return (
        <main className="mx-auto min-h-screen w-full max-w-[720px] border-x border-gray-100 bg-[#f7f7f7] pb-28 text-gray-950">

            {/* HEADER */}
            <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur-xl">
                <div className="flex h-[76px] items-center justify-between px-4 sm:px-7">

                    <div>
                        <p className="text-[11px] font-semibold tracking-wide text-gray-400">
                            우리끼리
                        </p>

                        <h1 className="mt-0.5 text-[21px] font-black tracking-tight sm:text-[23px]">
                            내 정보
                        </h1>
                    </div>

                    <a
                        href="/"
                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold transition hover:bg-gray-50"
                    >
                        완료
                    </a>

                </div>
            </header>

            <div className="space-y-4 px-3 py-4 sm:px-6 sm:py-6">

                {/* ========================================
                    프로필
                ======================================== */}
                <section className="rounded-[26px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.035)] sm:p-7">

                    <div>
                        <p className="text-[10px] font-bold tracking-wider text-gray-400">
                            PROFILE
                        </p>

                        <h2 className="mt-1 text-lg font-black">
                            프로필
                        </h2>
                    </div>

                    <div className="mt-6 flex items-center gap-4 sm:gap-5">

                        {myAvatarUrl ? (
                            <img
                                src={myAvatarUrl}
                                alt="내 프로필 사진"
                                className="h-20 w-20 shrink-0 rounded-full object-cover sm:h-24 sm:w-24"
                            />
                        ) : (
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gray-100 text-3xl sm:h-24 sm:w-24">
                                👤
                            </div>
                        )}

                        <div className="min-w-0">
                            <p className="truncate text-lg font-black sm:text-xl">
                                {myProfile?.nickname ??
                                    "친구"}
                            </p>

                            <p className="mt-1 truncate text-sm text-gray-400">
                                {user.email}
                            </p>
                        </div>
                    </div>

                    {/* 프로필 사진 */}
                    <form
                        action={updateAvatar}
                        className="mt-7"
                    >
                        <label className="text-xs font-bold text-gray-500">
                            프로필 사진 변경
                        </label>

                        <input
                            type="file"
                            name="avatar"
                            accept="image/*"
                            required
                            className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-bold"
                        />

                        <button
                            type="submit"
                            className="mt-3 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold transition hover:bg-gray-50"
                        >
                            사진 변경
                        </button>
                    </form>

                    {/* 닉네임 */}
                    <form
                        action={updateNickname}
                        className="mt-6 border-t border-gray-100 pt-6"
                    >
                        <label className="text-xs font-bold text-gray-500">
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
                            className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-400"
                        />

                        <button
                            type="submit"
                            className="mt-3 w-full rounded-2xl bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
                        >
                            닉네임 저장
                        </button>
                    </form>
                </section>

                {/* ========================================
                    내 공간
                ======================================== */}
                <section className="rounded-[26px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.035)] sm:p-7">

                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-[10px] font-bold tracking-wider text-gray-400">
                                MY SPACES
                            </p>

                            <h2 className="mt-1 text-lg font-black">
                                내 공간
                            </h2>
                        </div>

                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">
                            {memberships?.length ??
                                0}
                            개
                        </span>
                    </div>

                    {!memberships?.length && (
                        <div className="mt-5 rounded-2xl bg-gray-50 px-4 py-8 text-center">
                            <p className="text-sm font-bold">
                                아직 참여한 공간이 없어요
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                                아래에서 새 공간을 만들거나 참여해보세요.
                            </p>
                        </div>
                    )}

                    <div className="mt-5 space-y-3">
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
                                    <details
                                        key={
                                            group.id
                                        }
                                        className="group overflow-hidden rounded-[22px] bg-gray-50"
                                    >
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5">

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-sm font-black sm:text-base">
                                                        {
                                                            group.name
                                                        }
                                                    </p>

                                                    <span
                                                        className={
                                                            isOwner
                                                                ? "shrink-0 rounded-full bg-black px-2 py-0.5 text-[9px] font-bold text-white"
                                                                : "shrink-0 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[9px] font-bold text-gray-500"
                                                        }
                                                    >
                                                        {isOwner
                                                            ? "방장"
                                                            : "멤버"}
                                                    </span>
                                                </div>

                                                <p className="mt-1 text-[11px] text-gray-400">
                                                    초대코드{" "}
                                                    <span className="font-mono font-bold tracking-wider text-gray-600">
                                                        {
                                                            group.invite_code
                                                        }
                                                    </span>
                                                </p>

                                                <div className="mt-3">
                                                    <InviteLinkButton
                                                        inviteCode={
                                                            group.invite_code
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-3">
                                                <a
                                                    href={`/?group=${group.id}`}
                                                    className="rounded-full bg-white px-3 py-2 text-[11px] font-bold shadow-sm"
                                                >
                                                    이동
                                                </a>

                                                <span className="text-sm text-gray-400 transition-transform group-open:rotate-180">
                                                    ↓
                                                </span>
                                            </div>
                                        </summary>

                                        <div className="border-t border-gray-200/70 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">

                                            {isOwner ? (
                                                <>
                                                    {/* 이름 변경 */}
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

                                                        <label className="text-[11px] font-bold text-gray-500">
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
                                                                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                                                            />

                                                            <button
                                                                type="submit"
                                                                className="shrink-0 rounded-xl bg-black px-4 py-2.5 text-xs font-bold text-white"
                                                            >
                                                                변경
                                                            </button>
                                                        </div>
                                                    </form>

                                                    {/* 공간 삭제 */}
                                                    <form
                                                        action={
                                                            deleteGroup
                                                        }
                                                        className="mt-5 border-t border-gray-200/70 pt-4"
                                                    >
                                                        <input
                                                            type="hidden"
                                                            name="group_id"
                                                            value={
                                                                group.id
                                                            }
                                                        />

                                                        <label className="text-[11px] font-bold text-red-500">
                                                            공간 삭제
                                                        </label>

                                                        <p className="mt-1 text-[11px] leading-5 text-gray-400">
                                                            삭제하려면{" "}
                                                            <strong className="text-gray-600">
                                                                {
                                                                    group.name
                                                                }
                                                            </strong>
                                                            을(를) 정확히 입력하세요.
                                                        </p>

                                                        <input
                                                            type="text"
                                                            name="confirm_name"
                                                            required
                                                            autoComplete="off"
                                                            placeholder={
                                                                group.name
                                                            }
                                                            className="mt-2 w-full rounded-xl border border-red-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-300"
                                                        />

                                                        <button
                                                            type="submit"
                                                            className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-xs font-bold text-red-500 transition hover:bg-red-50"
                                                        >
                                                            이 공간 영구 삭제
                                                        </button>
                                                    </form>
                                                </>
                                            ) : (
                                                <form
                                                    action={
                                                        leaveGroup
                                                    }
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
                                                        className="w-full rounded-xl border border-red-100 bg-white px-4 py-3 text-xs font-bold text-red-500"
                                                    >
                                                        이 공간에서 나가기
                                                    </button>

                                                    <p className="mt-2 text-center text-[10px] leading-4 text-gray-400">
                                                        공간에서 나가도 이전에 작성한 게시물과 댓글은 남습니다.
                                                    </p>
                                                </form>
                                            )}
                                        </div>
                                    </details>
                                );
                            }
                        )}
                    </div>
                </section>

                {/* ========================================
                    공간 추가
                ======================================== */}
                <section className="rounded-[26px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.035)] sm:p-7">

                    <div>
                        <p className="text-[10px] font-bold tracking-wider text-gray-400">
                            NEW SPACE
                        </p>

                        <h2 className="mt-1 text-lg font-black">
                            공간 추가
                        </h2>

                        <p className="mt-1 text-xs leading-5 text-gray-400">
                            새로운 공간을 만들거나 친구에게 받은 초대코드로 참여하세요.
                        </p>
                    </div>

                    {/* 새 공간 */}
                    <div className="mt-6">
                        <p className="text-xs font-bold">
                            새 공간 만들기
                        </p>

                        <form
                            action={createGroup}
                            className="mt-2 flex gap-2"
                        >
                            <input
                                type="text"
                                name="name"
                                required
                                maxLength={30}
                                placeholder="공간 이름"
                                className="min-w-0 flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                            />

                            <button
                                type="submit"
                                className="shrink-0 rounded-2xl bg-black px-5 py-3 text-xs font-bold text-white"
                            >
                                만들기
                            </button>
                        </form>
                    </div>

                    {/* 초대코드 */}
                    <div className="mt-6 border-t border-gray-100 pt-6">
                        <p className="text-xs font-bold">
                            초대코드로 참여
                        </p>

                        <p className="mt-1 text-[11px] text-gray-400">
                            친구에게 받은 6자리 코드를 입력하세요.
                        </p>

                        <form
                            action={joinGroup}
                            className="mt-2 flex gap-2"
                        >
                            <input
                                type="text"
                                name="invite_code"
                                required
                                maxLength={6}
                                placeholder="ABC123"
                                className="min-w-0 flex-1 rounded-2xl border border-gray-200 px-4 py-3 font-mono text-sm uppercase tracking-widest outline-none focus:border-gray-400"
                            />

                            <button
                                type="submit"
                                className="shrink-0 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-xs font-bold"
                            >
                                참여
                            </button>
                        </form>
                    </div>
                </section>

                {/* ========================================
                    계정 관리
                ======================================== */}
                <section className="rounded-[26px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.035)] sm:p-7">

                    <p className="text-[10px] font-bold tracking-wider text-gray-400">
                        ACCOUNT
                    </p>

                    <h2 className="mt-1 text-lg font-black">
                        계정 관리
                    </h2>

                    <div className="mt-5 rounded-2xl bg-red-50 p-4">
                        <p className="text-sm font-black text-red-600">
                            계정 탈퇴
                        </p>

                        <p className="mt-2 text-xs leading-5 text-gray-500">
                            계정을 탈퇴하면 다시 로그인할 수 없습니다.
                            이전에 작성한 게시물과 댓글은 공간의 기록으로 남으며,
                            작성자는 &quot;탈퇴한 사용자&quot;로 표시됩니다.
                        </p>

                        {hasOwnedGroups ? (
                            <div className="mt-4 rounded-xl bg-white p-3">
                                <p className="text-xs font-bold text-red-500">
                                    현재 계정을 탈퇴할 수 없습니다.
                                </p>

                                <p className="mt-1 text-[11px] leading-5 text-gray-400">
                                    방장으로 관리 중인 공간이{" "}
                                    <strong className="text-gray-600">
                                        {ownedGroups.length}개
                                    </strong>{" "}
                                    있습니다. 해당 공간을 먼저 삭제한 뒤 탈퇴해주세요.
                                </p>
                            </div>
                        ) : (
                            <form
                                action={deleteAccount}
                                className="mt-4"
                            >
                                <label className="text-[11px] font-bold text-red-500">
                                    확인을 위해 &quot;계정 탈퇴&quot;를 입력하세요.
                                </label>

                                <input
                                    type="text"
                                    name="confirm_text"
                                    required
                                    autoComplete="off"
                                    placeholder="계정 탈퇴"
                                    className="mt-2 w-full rounded-xl border border-red-100 bg-white px-3 py-3 text-sm outline-none focus:border-red-300"
                                />

                                <button
                                    type="submit"
                                    className="mt-2 w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-black text-white transition hover:bg-red-600"
                                >
                                    계정 영구 탈퇴
                                </button>
                            </form>
                        )}
                    </div>
                </section>

                {/* ========================================
                    로그아웃
                ======================================== */}
                <section className="pb-2 pt-2">
                    <form action={logout}>
                        <button
                            type="submit"
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-bold text-gray-500 transition hover:bg-gray-50"
                        >
                            로그아웃
                        </button>
                    </form>

                    <p className="mt-4 text-center text-[10px] font-medium tracking-wider text-gray-300">
                        WOORIKKIRI
                    </p>
                </section>
            </div>

            {/* ========================================
                하단 메뉴
            ======================================== */}
            <nav className="fixed bottom-0 left-1/2 z-30 flex h-[72px] w-full max-w-[720px] -translate-x-1/2 items-center border-x border-t border-gray-100 bg-white/95 px-8 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">

                <a
                    href="/"
                    className="flex flex-1 flex-col items-center justify-center gap-1 text-gray-300"
                >
                    <span className="text-[22px] leading-none">
                        ⌂
                    </span>

                    <span className="text-[10px] font-bold">
                        피드
                    </span>
                </a>

                <a
                    href="/settings"
                    className="flex flex-1 flex-col items-center justify-center gap-1 text-black"
                >
                    <span className="text-[20px] leading-none">
                        ●
                    </span>

                    <span className="text-[10px] font-black">
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
                <main className="mx-auto min-h-screen w-full max-w-[720px] bg-[#f7f7f7] p-6">
                    <div className="animate-pulse">
                        <div className="h-4 w-16 rounded bg-gray-200" />
                        <div className="mt-3 h-7 w-24 rounded bg-gray-200" />
                        <div className="mt-8 h-72 rounded-[26px] bg-gray-100" />
                    </div>
                </main>
            }
        >
            <SettingsContent />
        </Suspense>
    );
}