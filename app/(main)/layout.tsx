import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/bottom-nav";

async function AuthenticatedBottomNav() {
    const supabase =
        await createClient();

    const {
        data: { user },
    } =
        await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    return (
        <BottomNav
            currentUserId={
                user.id
            }
        />
    );
}

export default function MainLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            {children}

            <Suspense fallback={null}>
                <AuthenticatedBottomNav />
            </Suspense>
        </>
    );
}