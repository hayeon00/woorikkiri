import type {
    Metadata,
    Viewport,
} from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
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

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
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
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            {children}
        </ThemeProvider>
        </body>
        </html>
    );
}