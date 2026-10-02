import { Suspense } from "react";

import { BottomNav } from "@/components/bottom-nav";

export default function MainLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            {children}

            <Suspense fallback={null}>
                <BottomNav />
            </Suspense>
        </>
    );
}