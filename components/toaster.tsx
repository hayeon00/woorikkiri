"use client";

import { useEffect, useState } from "react";

import { subscribeToasts, type ToastItem } from "@/lib/toast";

const DURATION_MS = 3200;
const MAX_VISIBLE = 3;

export function Toaster() {
    const [items, setItems] = useState<ToastItem[]>([]);

    useEffect(() => {
        return subscribeToasts((item) => {
            setItems((current) => [...current, item].slice(-MAX_VISIBLE));

            window.setTimeout(() => {
                setItems((current) =>
                    current.filter((existing) => existing.id !== item.id)
                );
            }, item.kind === "error" ? DURATION_MS + 1500 : DURATION_MS);
        });
    }, []);

    return (
        <div
            aria-live="polite"
            // D3: 넓은 화면에서도 하단 내비게이션(64px) 위에 뜨도록 위치를 통일한다
            className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-[100] flex flex-col items-center gap-2 px-4"
        >
            {items.map((item) => (
                <div
                    key={item.id}
                    role={item.kind === "error" ? "alert" : "status"}
                    className="toast-enter pointer-events-auto flex max-w-[420px] items-center gap-2.5 rounded-[16px] bg-gray-950/95 px-4 py-3 text-[13px] font-bold leading-5 text-white shadow-[0_12px_40px_rgba(0,0,0,0.25)] backdrop-blur-md"
                >
                    <span
                        aria-hidden="true"
                        className={
                            item.kind === "error"
                                ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-[12px]"
                                : item.kind === "success"
                                    ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[12px]"
                                    : "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[12px]"
                        }
                    >
                        {item.kind === "error" ? "!" : item.kind === "success" ? "✓" : "i"}
                    </span>
                    <span>{item.message}</span>
                </div>
            ))}
        </div>
    );
}
