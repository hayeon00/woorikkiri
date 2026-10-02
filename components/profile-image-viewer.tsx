"use client";

import { useEffect, useState } from "react";

type ProfileImageViewerProps = {
    src: string;
    alt?: string;
    className?: string;
};

export function ProfileImageViewer({
                                       src,
                                       alt = "프로필 사진",
                                       className = "",
                                   }: ProfileImageViewerProps) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        const previousOverflow =
            document.body.style.overflow;

        document.body.style.overflow = "hidden";

        function handleKeyDown(
            event: KeyboardEvent
        ) {
            if (event.key === "Escape") {
                setOpen(false);
            }
        }

        window.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            document.body.style.overflow =
                previousOverflow;

            window.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [open]);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={`${alt} 크게 보기`}
                className="block shrink-0 cursor-zoom-in rounded-full"
            >
                <img
                    src={src}
                    alt={alt}
                    className={className}
                />
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-5 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label="프로필 사진 크게 보기"
                    onClick={() => setOpen(false)}
                >
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        aria-label="닫기"
                        className="absolute right-5 top-[calc(20px+env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl font-light text-white backdrop-blur transition hover:bg-white/20"
                    >
                        ×
                    </button>

                    <img
                        src={src}
                        alt={alt}
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                        className="h-[min(82vw,420px)] w-[min(82vw,420px)] rounded-full object-cover object-center shadow-2xl"
                    />
                </div>
            )}
        </>
    );
}