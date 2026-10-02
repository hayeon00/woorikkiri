import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { InviteLinkButton } from "@/components/invite-link-button";
import { ProfileImageViewer } from "@/components/profile-image-viewer";
import { AvatarEditor } from "@/components/avatar-editor";
import { PushNotificationButton } from "@/components/push-notification-button";
import { TestPushButton } from "@/components/test-push-button";

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
} from "../../actions";

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
        const { data } = await supabase.storage
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
    // 내가 방장인 그룹
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

            {/* ========================================
                HEADER
            ======================================== */}
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

                    <Link
                        href="/"
                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold transition hover:bg-gray-50"
                    >
                        완료
                    </Link>
                </div>
            </header>

            <div className="space-y-4 px-3 py-4 sm:px-6 sm:py-6">

                {/* ========================================
                    프로필
                ======================================== */}
                <section className="overflow-hidden rounded-[26px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.035)]">

                    <div className="p-5 sm:p-6">
                        <div className="flex items-center gap-4">

                            {myAvatarUrl ? (
                                <ProfileImageViewer
                                    src={myAvatarUrl}
                                    alt="내 프로필 사진"
                                    className="h-16 w-16 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                    <UserIcon />
                                </div>
                            )}

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[17px] font-black">
                                    {myProfile?.nickname ??
                                        "친구"}
                                </p>

                                <p className="mt-1 truncate text-xs text-gray-400">
                                    {user.email}
                                </p>
                            </div>
                        </div>

                        {/* 내 개인 피드 */}
                        <Link
                            href={`/profile/${user.id}`}
                            className="mt-5 flex h-11 w-full items-center justify-between rounded-[14px] bg-gray-950 px-4 text-[12px] font-black text-white transition hover:bg-gray-800 active:scale-[0.99]"
                        >
                            <span>
                                내 게시물 보기
                            </span>

                            <span className="text-lg font-light text-white/60">
                                ›
                            </span>
                        </Link>
                    </div>

                    {/* 프로필 수정 */}
                    <details className="group border-t border-gray-100">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
                            <span className="text-sm font-bold">
                                프로필 수정
                            </span>

                            <span className="text-gray-300 transition-transform group-open:rotate-180">
                                ↓
                            </span>
                        </summary>

                        <div className="border-t border-gray-100 bg-gray-50/70 px-5 pb-5 pt-4">

                            {/* 프로필 사진 */}
                            <AvatarEditor
                                updateAction={updateAvatar}
                            />

                            {/* 닉네임 */}
                            <form
                                action={
                                    updateNickname
                                }
                                className="mt-5 border-t border-gray-200/70 pt-4"
                            >
                                <label className="text-[11px] font-bold text-gray-500">
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
                                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-[16px] outline-none transition focus:border-gray-400 sm:text-sm"
                                />

                                <button
                                    type="submit"
                                    className="mt-2 w-full rounded-xl bg-black px-4 py-3 text-xs font-bold text-white transition hover:bg-gray-800"
                                >
                                    닉네임 저장
                                </button>
                            </form>
                        </div>
                    </details>
                </section>

                {/* ========================================
                    내 공간
                ======================================== */}
                <section className="overflow-hidden rounded-[26px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.035)]">

                    <div className="flex items-center justify-between px-5 pb-3 pt-5 sm:px-6">
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.12em] text-gray-400">
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

                    {!memberships?.length ? (
                        <div className="mx-5 mb-5 mt-2 rounded-2xl bg-gray-50 px-4 py-8 text-center">
                            <p className="text-sm font-bold">
                                아직 참여한 공간이
                                없어요
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                                새 공간을 만들거나
                                초대코드로
                                참여해보세요.
                            </p>
                        </div>
                    ) : (
                        <div className="px-3 pb-3">
                            {memberships.map(
                                (
                                    membership: any
                                ) => {
                                    const group =
                                        membership.groups;

                                    if (
                                        !group
                                    ) {
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
                                            className="group border-b border-gray-100 last:border-b-0"
                                        >
                                            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-3 py-4 transition hover:bg-gray-50">

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <p className="truncate text-sm font-black">
                                                            {
                                                                group.name
                                                            }
                                                        </p>

                                                        <span
                                                            className={
                                                                isOwner
                                                                    ? "shrink-0 rounded-full bg-black px-2 py-0.5 text-[9px] font-bold text-white"
                                                                    : "shrink-0 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[9px] font-bold text-gray-400"
                                                            }
                                                        >
                                                            {isOwner
                                                                ? "방장"
                                                                : "멤버"}
                                                        </span>
                                                    </div>

                                                    <p className="mt-1 text-[10px] text-gray-400">
                                                        자세히
                                                        보기
                                                    </p>
                                                </div>

                                                <Link
                                                    href={`/?group=${group.id}`}
                                                    className="shrink-0 rounded-full bg-gray-100 px-4 py-2 text-[11px] font-bold transition hover:bg-gray-200"
                                                >
                                                    이동
                                                </Link>

                                                <span className="shrink-0 text-xs text-gray-300 transition-transform group-open:rotate-180">
                                                    ↓
                                                </span>
                                            </summary>

                                            <div className="mx-3 mb-3 rounded-2xl bg-gray-50 p-4">

                                                {/* 초대 코드 */}
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-bold text-gray-400">
                                                            초대코드
                                                        </p>

                                                        <p className="mt-1 truncate font-mono text-sm font-black tracking-widest text-gray-700">
                                                            {
                                                                group.invite_code
                                                            }
                                                        </p>
                                                    </div>

                                                    <div className="shrink-0">
                                                        <InviteLinkButton
                                                            inviteCode={
                                                                group.invite_code
                                                            }
                                                        />
                                                    </div>
                                                </div>

                                                {isOwner ? (
                                                    <div className="mt-5 border-t border-gray-200 pt-4">

                                                        {/* 공간 이름 변경 */}
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
                                                                공간
                                                                이름
                                                                변경
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
                                                                    className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[16px] outline-none transition focus:border-gray-400 sm:text-sm"
                                                                />

                                                                <button
                                                                    type="submit"
                                                                    className="shrink-0 rounded-xl bg-black px-4 text-xs font-bold text-white"
                                                                >
                                                                    변경
                                                                </button>
                                                            </div>
                                                        </form>

                                                        {/* 공간 삭제 */}
                                                        <details className="mt-4 border-t border-gray-200 pt-4">
                                                            <summary className="cursor-pointer list-none text-[11px] font-bold text-red-400">
                                                                공간
                                                                삭제
                                                            </summary>

                                                            <form
                                                                action={
                                                                    deleteGroup
                                                                }
                                                                className="mt-3"
                                                            >
                                                                <input
                                                                    type="hidden"
                                                                    name="group_id"
                                                                    value={
                                                                        group.id
                                                                    }
                                                                />

                                                                <p className="text-[10px] leading-5 text-gray-400">
                                                                    삭제하려면{" "}
                                                                    <strong className="text-gray-600">
                                                                        {
                                                                            group.name
                                                                        }
                                                                    </strong>
                                                                    을(를)
                                                                    정확히
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
                                                                    className="mt-2 w-full rounded-xl border border-red-100 bg-white px-3 py-2.5 text-[16px] outline-none transition focus:border-red-300 sm:text-sm"
                                                                />

                                                                <button
                                                                    type="submit"
                                                                    className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-xs font-bold text-red-500 transition hover:bg-red-50"
                                                                >
                                                                    이
                                                                    공간
                                                                    영구
                                                                    삭제
                                                                </button>
                                                            </form>
                                                        </details>
                                                    </div>
                                                ) : (
                                                    <form
                                                        action={
                                                            leaveGroup
                                                        }
                                                        className="mt-5 border-t border-gray-200 pt-4"
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
                                                            className="w-full rounded-xl border border-red-100 bg-white px-4 py-3 text-xs font-bold text-red-500 transition hover:bg-red-50"
                                                        >
                                                            이
                                                            공간에서
                                                            나가기
                                                        </button>

                                                        <p className="mt-2 text-center text-[10px] leading-4 text-gray-400">
                                                            나가도
                                                            이전에
                                                            작성한
                                                            게시물과
                                                            댓글은
                                                            남습니다.
                                                        </p>
                                                    </form>
                                                )}
                                            </div>
                                        </details>
                                    );
                                }
                            )}
                        </div>
                    )}
                </section>

                {/* ========================================
                    공간 추가
                ======================================== */}
                <section className="overflow-hidden rounded-[26px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.035)]">

                    <div className="px-5 pb-3 pt-5 sm:px-6">
                        <p className="text-[10px] font-bold tracking-[0.12em] text-gray-400">
                            NEW SPACE
                        </p>

                        <h2 className="mt-1 text-lg font-black">
                            공간 추가
                        </h2>
                    </div>

                    {/* 새 공간 만들기 */}
                    <details className="group border-t border-gray-100">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
                            <span className="text-sm font-bold">
                                + 새 공간 만들기
                            </span>

                            <span className="text-gray-300 transition-transform group-open:rotate-180">
                                ↓
                            </span>
                        </summary>

                        <form
                            action={
                                createGroup
                            }
                            className="border-t border-gray-100 bg-gray-50/70 p-4"
                        >
                            <input
                                type="text"
                                name="name"
                                required
                                maxLength={
                                    30
                                }
                                placeholder="공간 이름"
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[16px] outline-none transition focus:border-gray-400 sm:text-sm"
                            />

                            <button
                                type="submit"
                                className="mt-2 w-full rounded-xl bg-black px-4 py-3 text-xs font-bold text-white transition hover:bg-gray-800"
                            >
                                공간 만들기
                            </button>
                        </form>
                    </details>

                    {/* 초대코드 참여 */}
                    <details className="group border-t border-gray-100">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
                            <span className="text-sm font-bold">
                                초대코드로
                                참여하기
                            </span>

                            <span className="text-gray-300 transition-transform group-open:rotate-180">
                                ↓
                            </span>
                        </summary>

                        <form
                            action={
                                joinGroup
                            }
                            className="border-t border-gray-100 bg-gray-50/70 p-4"
                        >
                            <p className="mb-2 text-[11px] leading-5 text-gray-400">
                                친구에게 받은
                                6자리 초대코드를
                                입력하세요.
                            </p>

                            <input
                                type="text"
                                name="invite_code"
                                required
                                maxLength={
                                    6
                                }
                                placeholder="ABC123"
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-[16px] uppercase tracking-widest outline-none transition focus:border-gray-400 sm:text-sm"
                            />

                            <button
                                type="submit"
                                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold transition hover:bg-gray-50"
                            >
                                공간 참여
                            </button>
                        </form>
                    </details>
                </section>

                <section className="rounded-[26px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.035)] sm:p-6">
                    <p className="text-[10px] font-bold tracking-wider text-gray-400">
                        NOTIFICATIONS
                    </p>

                    <h2 className="mt-1 text-lg font-black">
                        푸시 알림
                    </h2>

                    <p className="mt-1 mb-4 text-sm leading-6 text-gray-400">
                        새 게시물, 좋아요, 댓글 소식을
                        휴대폰에서 받아보세요.
                    </p>

                    <PushNotificationButton />

                    <TestPushButton />
                </section>

                {/* ========================================
                    계정
                ======================================== */}
                <section className="overflow-hidden rounded-[26px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.035)]">

                    <div className="px-5 pb-3 pt-5">
                        <p className="text-[10px] font-bold tracking-[0.12em] text-gray-400">
                            ACCOUNT
                        </p>

                        <h2 className="mt-1 text-lg font-black">
                            계정
                        </h2>
                    </div>

                    {/* 로그아웃 */}
                    <form
                        action={
                            logout
                        }
                        className="border-t border-gray-100"
                    >
                        <button
                            type="submit"
                            className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-bold transition hover:bg-gray-50"
                        >
                            <span>
                                로그아웃
                            </span>

                            <span className="text-lg font-light text-gray-300">
                                ›
                            </span>
                        </button>
                    </form>

                    {/* 계정 탈퇴 */}
                    <details className="group border-t border-gray-100">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
                            <span className="text-sm font-bold text-red-500">
                                계정 탈퇴
                            </span>

                            <span className="text-gray-300 transition-transform group-open:rotate-180">
                                ↓
                            </span>
                        </summary>

                        <div className="border-t border-red-50 bg-red-50/60 p-4">
                            <p className="text-xs leading-5 text-gray-500">
                                계정을 탈퇴하면
                                다시 로그인할 수
                                없습니다. 이전에
                                작성한 게시물과
                                댓글은 공간의
                                기록으로 남으며,
                                작성자는
                                &quot;탈퇴한
                                사용자&quot;로
                                표시됩니다.
                            </p>

                            {hasOwnedGroups ? (
                                <div className="mt-3 rounded-xl bg-white p-3">
                                    <p className="text-xs font-bold text-red-500">
                                        현재 계정을
                                        탈퇴할 수
                                        없습니다.
                                    </p>

                                    <p className="mt-1 text-[11px] leading-5 text-gray-400">
                                        방장으로 관리
                                        중인 공간이{" "}
                                        <strong className="text-gray-600">
                                            {
                                                ownedGroups.length
                                            }
                                            개
                                        </strong>{" "}
                                        있습니다. 해당
                                        공간을 먼저
                                        삭제한 뒤
                                        탈퇴해주세요.
                                    </p>
                                </div>
                            ) : (
                                <form
                                    action={
                                        deleteAccount
                                    }
                                    className="mt-3"
                                >
                                    <label className="text-[11px] font-bold text-red-500">
                                        확인을 위해
                                        &quot;계정
                                        탈퇴&quot;를
                                        입력하세요.
                                    </label>

                                    <input
                                        type="text"
                                        name="confirm_text"
                                        required
                                        autoComplete="off"
                                        placeholder="계정 탈퇴"
                                        className="mt-2 w-full rounded-xl border border-red-100 bg-white px-3 py-3 text-[16px] outline-none transition focus:border-red-300 sm:text-sm"
                                    />

                                    <button
                                        type="submit"
                                        className="mt-2 w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-black text-white transition hover:bg-red-600"
                                    >
                                        계정 영구
                                        탈퇴
                                    </button>
                                </form>
                            )}
                        </div>
                    </details>
                </section>

                <p className="pb-2 pt-1 text-center text-[10px] font-medium tracking-[0.16em] text-gray-300">
                    WOORIKKIRI
                </p>
            </div>
        </main>
    );
}

// ========================================
// 아이콘
// ========================================

function UserIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <circle
                cx="12"
                cy="8"
                r="4"
                stroke="currentColor"
                strokeWidth="1.8"
            />

            <path
                d="M4 21a8 8 0 0 1 16 0"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

// ========================================
// PAGE
// ========================================

export default function SettingsPage() {
    return (
        <Suspense
            fallback={
                <main className="mx-auto min-h-screen w-full max-w-[720px] bg-[#f7f7f7] p-6">
                    <div className="animate-pulse">
                        <div className="h-4 w-16 rounded bg-gray-200" />

                        <div className="mt-3 h-7 w-24 rounded bg-gray-200" />

                        <div className="mt-8 h-40 rounded-[26px] bg-gray-100" />

                        <div className="mt-4 h-72 rounded-[26px] bg-gray-100" />
                    </div>
                </main>
            }
        >
            <SettingsContent />
        </Suspense>
    );
}