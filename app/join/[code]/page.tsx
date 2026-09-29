import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { joinGroupFromLink } from "../../actions";


// ========================================
// 바깥 페이지
// ========================================

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


// ========================================
// 실제 초대 페이지
// ========================================

async function JoinContent({
                               params,
                           }: {
    params: Promise<{
        code: string;
    }>;
}) {
    const { code } = await params;

    const inviteCode =
        decodeURIComponent(code)
            .trim()
            .toUpperCase();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-[720px] items-center justify-center bg-[#f7f7f7] px-4 py-10">

            <section className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.05)] sm:p-8">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-xl font-black text-white">
                    W
                </div>

                <div className="mt-6 text-center">
                    <p className="text-[11px] font-bold tracking-wider text-gray-400">
                        WOORIKKIRI INVITE
                    </p>

                    <h1 className="mt-2 text-2xl font-black tracking-tight">
                        우리끼리 초대
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-gray-400">
                        친구가 우리끼리 공간으로
                        <br />
                        초대했어요.
                    </p>
                </div>

                <div className="mt-7 rounded-2xl bg-gray-50 px-5 py-4 text-center">
                    <p className="text-[10px] font-bold text-gray-400">
                        초대코드
                    </p>

                    <p className="mt-1 font-mono text-lg font-black tracking-[0.2em]">
                        {inviteCode}
                    </p>
                </div>

                {!user ? (
                    <>
                        <a
                            href={`/auth/login?next=${encodeURIComponent(
                                `/join/${inviteCode}`
                            )}`}
                            className="mt-6 flex w-full items-center justify-center rounded-2xl bg-black px-5 py-3.5 text-sm font-bold text-white"
                        >
                            로그인하고 참여하기
                        </a>

                        <p className="mt-3 text-center text-xs leading-5 text-gray-400">
                            우리끼리 계정으로 로그인한 뒤
                            <br />
                            초대에 참여할 수 있어요.
                        </p>
                    </>
                ) : (
                    <>
                        <form
                            action={async (
                                formData: FormData
                            ) => {
                                "use server";

                                const groupId =
                                    await joinGroupFromLink(
                                        formData
                                    );

                                redirect(
                                    `/?group=${groupId}`
                                );
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
                                className="w-full rounded-2xl bg-black px-5 py-3.5 text-sm font-bold text-white"
                            >
                                이 공간에 참여하기
                            </button>
                        </form>

                        <a
                            href="/"
                            className="mt-3 flex w-full items-center justify-center rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-bold text-gray-500"
                        >
                            지금은 참여하지 않기
                        </a>
                    </>
                )}

            </section>

        </main>
    );
}


// ========================================
// 로딩 화면
// ========================================

function JoinLoading() {
    return (
        <main className="mx-auto flex min-h-screen w-full max-w-[720px] items-center justify-center bg-[#f7f7f7] px-4">

            <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-xl font-black text-white">
                    W
                </div>

                <p className="mt-4 text-sm font-bold text-gray-400">
                    초대 정보를 불러오는 중...
                </p>
            </div>

        </main>
    );
}