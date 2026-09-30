import { UpdatePasswordForm } from "@/components/update-password-form";

export default function Page() {
    return (
        <main className="min-h-svh bg-[#f6f6f4]">
            <div className="mx-auto flex min-h-svh w-full max-w-[480px] items-center px-6 py-10 sm:px-8">
                <div className="w-full rounded-[32px] bg-white px-6 py-8 shadow-[0_8px_40px_rgba(0,0,0,0.05)] sm:px-8 sm:py-10">
                    <UpdatePasswordForm />
                </div>
            </div>
        </main>
    );
}