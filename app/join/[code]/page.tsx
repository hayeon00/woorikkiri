import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { joinGroupFromLink } from "../../actions";

export default function JoinPage({
                                     params,
                                 }: {
    params: Promise<{
        code: string;
    }>;
}) {
    return (
        <Suspense fallback={<JoinLoading />}>
            <JoinContent params={params} />
        </Suspense>
    );
}

async function JoinContent({
                               params,
                           }: {
    params: Promise<{
        code: string;
    }>;
}) {
    const { code } = await params;

    const inviteCode = decodeURIComponent(code)
        .trim()
        .toUpperCase();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    return (
        <main className="min-h-svh bg-[#f6f6f4]">
            <div className="mx-auto flex min-h-svh w-full max-w-[480px] items-center px-6 py-10 sm:px-8">
                <section className="w-full rounded-[32px] bg-white px-6 py-8 shadow-[0_8px_40px_rgba(0,0,0,0.05)] sm:px-8 sm:py-10">

                    {/* 브랜드 */}
                    <div className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-[22px] shadow-sm">
                            <img
                                src="/icon-192.png"
                                alt="우리끼리"
                                className="h-full w-full object-cover"
                            />
                        </div>

                        <p className="mt-4 text-[12px] font-bold tracking-[0.18em] text-gray-400">
                            WOORIKKIRI INVITE
                        </p>

                        <h1 className="mt-2 text-[28px] font-black tracking-[-0.04em] text-gray-950">
                            함께할 공간에 초대됐어요
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-gray-400">
                            친구가 우리끼리 공간으로 초대했어요.
                            <br />
                            로그인하고 함께 시작해보세요.
                        </p>
                    </div>

                    {/* 초대 코드 */}
                    <div className="mt-7 rounded-[22px] bg-[#f7f7f5] px-5 py-5 text-center">
                        <p className="text-[11px] font-bold tracking-wide text-gray-400">
                            초대코드
                        </p>

                        <p className="mt-2 font-mono text-lg font-black tracking-[0.2em] text-gray-900">
                            {inviteCode}
                        </p>
                    </div>

                    {!user ? (
                        <>
                            <a
                                href={`/auth/login?next=${encodeURIComponent(
                                    `/join/${inviteCode}`
                                )}`}
                                className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-[#171717] text-sm font-bold text-white shadow-sm transition hover:bg-black"
                            >
                                로그인하고 참여하기
                            </a>

                            <p className="mt-4 text-center text-xs leading-5 text-gray-400">
                                아직 계정이 없다면 로그인 화면에서
                                <br />
                                회원가입을 선택할 수 있어요.
                            </p>
                        </>
                    ) : (
                        <>
                            <form
                                action={async (formData: FormData) => {
                                    "use server";

                                    const groupId =
                                        await joinGroupFromLink(formData);

                                    redirect(`/?group=${groupId}`);
                                }}
                                className="mt-6"
                            >
                                <input
                                    type="hidden"
                                    name="invite_code"
                                    value={inviteCode}
                                />

                                <button
                                    type="submit"
                                    className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#171717] text-sm font-bold text-white shadow-sm transition hover:bg-black"
                                >
                                    이 공간에 참여하기
                                </button>
                            </form>

                            <a
                                href="/"
                                className="mt-3 flex h-14 w-full items-center justify-center rounded-2xl border border-gray-200 bg-white text-sm font-bold text-gray-500 transition hover:bg-gray-50"
                            >
                                지금은 참여하지 않기
                            </a>
                        </>
                    )}

                    <p className="mt-9 text-center text-[11px] leading-5 text-gray-300">
                        친한 사람들과 나누는
                        <br />
                        우리만의 작은 공간
                    </p>
                </section>
            </div>
        </main>
    );
}

function JoinLoading() {
    return (
        <main className="min-h-svh bg-[#f6f6f4]">
            <div className="mx-auto flex min-h-svh w-full max-w-[480px] items-center justify-center px-6">
                <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-[22px] shadow-sm">
                        <img
                            src="/icon-192.png"
                            alt="우리끼리"
                            className="h-full w-full object-cover"
                        />
                    </div>

                    <p className="mt-4 text-sm font-bold text-gray-400">
                        초대 정보를 불러오는 중...
                    </p>
                </div>
            </div>
        </main>
    );
}