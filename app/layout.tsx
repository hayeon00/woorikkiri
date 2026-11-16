import type {
    Metadata,
    Viewport,
} from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/toaster";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
    metadataBase: new URL(defaultUrl),

    title: {
        default: "우리끼리",
        template: "%s | 우리끼리",
    },

    description:
        "친한 사람들끼리 일상을 나누는 작은 공간",

    applicationName: "우리끼리",

    manifest: "/manifest.webmanifest",

    icons: {
        icon: [
            {
                url: "/icon-192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                url: "/icon-512.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],

        apple: [
            {
                url: "/icon-192.png",
                sizes: "192x192",
                type: "image/png",
            },
        ],
    },

    appleWebApp: {
        capable: true,
        title: "우리끼리",
        statusBarStyle: "default",
    },

    formatDetection: {
        telephone: false,
    },
};

// D1: 확대(두 손가락 줌)를 막지 않는다 (WCAG 1.4.4).
// 대신 iOS의 입력칸 자동 확대를 막기 위해 모든 입력칸은
// 휴대폰에서 글자 16px 이상으로 둔다 (예: text-[16px] sm:text-[14px]).
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: "#f6f6f4",
};

const geistSans = Geist({
    variable: "--font-geist-sans",
    display: "swap",
    subsets: ["latin"],
});

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="ko"
            suppressHydrationWarning
        >
        <body
            className={`${geistSans.className} antialiased`}
        >
        {/* 다크 모드 디자인이 아직 없어 라이트로 고정한다.
            시스템 다크 모드에서 배경·기본 글자색만 바뀌는 문제 방지 */}
        <ThemeProvider
            attribute="class"
            forcedTheme="light"
            enableSystem={false}
            disableTransitionOnChange
        >
            {children}
            <Toaster />
        </ThemeProvider>
        </body>
        </html>
    );
}