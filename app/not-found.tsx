import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex min-h-svh items-center justify-center bg-[#f6f6f4] px-6 py-10">
            <section className="w-full max-w-[420px] rounded-[28px] bg-white px-6 py-10 text-center shadow-[0_8px_40px_rgba(0,0,0,0.05)]">
                <p className="font-mono text-[12px] font-bold text-gray-300">
                    404
                </p>

                <h1 className="mt-3 text-[22px] font-black tracking-[-0.03em] text-gray-950">
                    찾는 화면이 없어요
                </h1>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                    주소가 바뀌었거나 삭제된 화면이에요.
                </p>

                <Link
                    href="/"
                    className="mt-7 flex h-12 items-center justify-center rounded-2xl bg-gray-950 text-sm font-bold text-white transition hover:bg-black"
                >
                    피드로 가기
                </Link>
            </section>
        </main>
    );
}
