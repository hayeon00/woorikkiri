import Link from "next/link";

export default function Page() {
    return (
        <main className="min-h-svh bg-[#f6f6f4]">
            <div className="mx-auto flex min-h-svh w-full max-w-[480px] items-center px-6 py-10 sm:px-8">
                <section className="w-full rounded-[32px] bg-white px-6 py-8 text-center shadow-[0_8px_40px_rgba(0,0,0,0.05)] sm:px-8 sm:py-10">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-[22px] shadow-sm">
                        <img
                            src="/icon-192.png"
                            alt="우리끼리"
                            className="h-full w-full object-cover"
                        />
                    </div>

                    <p className="mt-4 text-[12px] font-bold tracking-[0.18em] text-gray-400">
                        WOORIKKIRI
                    </p>

                    <h1 className="mt-2 text-[28px] font-black tracking-[-0.04em] text-gray-950">
                        거의 다 됐어요!
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-gray-400">
                        가입한 이메일로 확인 메일을 보냈어요.
                        <br />
                        이메일의 링크를 눌러 가입을 완료해주세요.
                    </p>

                    <div className="mt-8 rounded-[22px] bg-[#f7f7f5] px-5 py-5">
                        <p className="text-sm font-bold text-gray-800">
                            이메일을 확인해주세요
                        </p>

                        <p className="mt-2 text-xs leading-5 text-gray-400">
                            메일이 보이지 않는다면
                            <br />
                            스팸 메일함도 확인해주세요.
                        </p>
                    </div>

                    <Link
                        href="/auth/login"
                        className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-[#171717] text-sm font-bold text-white transition hover:bg-black"
                    >
                        로그인 화면으로 돌아가기
                    </Link>

                    <p className="mt-9 text-[11px] leading-5 text-gray-300">
                        친한 사람들과 나누는
                        <br />
                        우리만의 작은 공간
                    </p>
                </section>
            </div>
        </main>
    );
}