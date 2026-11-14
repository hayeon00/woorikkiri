import Link from "next/link";
import { LEGAL_EFFECTIVE_DATE, SERVICE_NAME } from "@/lib/legal";

/** 약관·개인정보처리방침 공통 레이아웃 */
export function LegalDocument({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <main className="min-h-svh bg-[#f6f6f4] px-4 py-8 text-gray-900 sm:px-6 sm:py-12">
            <article className="mx-auto w-full max-w-[720px] rounded-[28px] bg-white px-5 py-8 shadow-[0_8px_40px_rgba(0,0,0,0.04)] sm:px-10 sm:py-12">
                <Link
                    href="/"
                    className="text-[12px] font-bold tracking-[0.12em] text-gray-400"
                >
                    {SERVICE_NAME}
                </Link>

                <h1 className="mt-3 text-[26px] font-black tracking-[-0.03em]">
                    {title}
                </h1>

                <p className="mt-2 text-[13px] text-gray-400">
                    시행일 {LEGAL_EFFECTIVE_DATE}
                </p>

                <div className="legal-body mt-8 space-y-8 text-[14px] leading-7 text-gray-700 [&_h2]:mb-2 [&_h2]:text-[16px] [&_h2]:font-black [&_h2]:text-gray-950 [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal [&_table]:w-full [&_table]:text-left [&_td]:border-t [&_td]:border-gray-100 [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top [&_th]:pb-2 [&_th]:pr-3 [&_th]:text-[12px] [&_th]:text-gray-400">
                    {children}
                </div>

                <nav className="mt-12 flex flex-wrap gap-4 border-t border-gray-100 pt-6 text-[13px] font-bold text-gray-500">
                    <Link href="/terms">이용약관</Link>
                    <Link href="/privacy">개인정보처리방침</Link>
                </nav>
            </article>
        </main>
    );
}
