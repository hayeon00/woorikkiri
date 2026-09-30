"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

type PostMenuProps = {
    postId: number;
    deleteAction: (
        formData: FormData
    ) => void | Promise<void>;
};

export function PostMenu({
                             postId,
                             deleteAction,
                         }: PostMenuProps) {
    const [isMenuOpen, setIsMenuOpen] =
        useState(false);

    const [
        isConfirmOpen,
        setIsConfirmOpen,
    ] = useState(false);

    const menuRef =
        useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleOutsideClick(
            event: MouseEvent
        ) {
            if (
                menuRef.current &&
                !menuRef.current.contains(
                    event.target as Node
                )
            ) {
                setIsMenuOpen(false);
            }
        }

        document.addEventListener(
            "mousedown",
            handleOutsideClick
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );
        };
    }, []);

    useEffect(() => {
        if (!isConfirmOpen) {
            return;
        }

        function handleEscape(
            event: KeyboardEvent
        ) {
            if (event.key === "Escape") {
                setIsConfirmOpen(false);
            }
        }

        document.addEventListener(
            "keydown",
            handleEscape
        );

        return () => {
            document.removeEventListener(
                "keydown",
                handleEscape
            );
        };
    }, [isConfirmOpen]);

    function openDeleteConfirm() {
        setIsMenuOpen(false);
        setIsConfirmOpen(true);
    }

    return (
        <>
            <div
                ref={menuRef}
                className="relative"
            >
                <button
                    type="button"
                    onClick={() =>
                        setIsMenuOpen(
                            (value) => !value
                        )
                    }
                    aria-label="게시글 메뉴"
                    aria-expanded={
                        isMenuOpen
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-50 hover:text-gray-700"
                >
                    <MoreIcon />
                </button>

                {isMenuOpen && (
                    <div className="absolute right-0 top-[calc(100%+4px)] z-40 w-[150px] overflow-hidden rounded-[16px] border border-black/[0.06] bg-white p-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.13)]">
                        <button
                            type="button"
                            onClick={
                                openDeleteConfirm
                            }
                            className="flex w-full items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-left text-[12px] font-bold text-red-500 transition hover:bg-red-50"
                        >
                            <TrashIcon />

                            게시물 삭제
                        </button>
                    </div>
                )}
            </div>

            {isConfirmOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-5 backdrop-blur-[2px]"
                    onMouseDown={(
                        event
                    ) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setIsConfirmOpen(
                                false
                            );
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`delete-post-title-${postId}`}
                        className="w-full max-w-[360px] overflow-hidden rounded-[26px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.25)]"
                    >
                        <div className="px-6 pb-5 pt-6 text-center">
                            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-500">
                                <TrashIcon />
                            </div>

                            <h2
                                id={`delete-post-title-${postId}`}
                                className="mt-4 text-[16px] font-black tracking-[-0.02em]"
                            >
                                게시물을
                                삭제할까요?
                            </h2>

                            <p className="mt-2 text-[12px] leading-5 text-gray-400">
                                삭제한 게시물은
                                다시 복구할 수
                                없어요.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t border-gray-100 p-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setIsConfirmOpen(
                                        false
                                    )
                                }
                                className="flex h-11 items-center justify-center rounded-[14px] bg-gray-100 text-[13px] font-black text-gray-600 transition hover:bg-gray-200 active:scale-[0.98]"
                            >
                                취소
                            </button>

                            <form
                                action={
                                    deleteAction
                                }
                            >
                                <input
                                    type="hidden"
                                    name="post_id"
                                    value={postId}
                                />

                                <button
                                    type="submit"
                                    className="flex h-11 w-full items-center justify-center rounded-[14px] bg-red-500 text-[13px] font-black text-white transition hover:bg-red-600 active:scale-[0.98]"
                                >
                                    삭제
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function MoreIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <circle
                cx="5"
                cy="12"
                r="1.4"
                fill="currentColor"
            />

            <circle
                cx="12"
                cy="12"
                r="1.4"
                fill="currentColor"
            />

            <circle
                cx="19"
                cy="12"
                r="1.4"
                fill="currentColor"
            />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M3 6h18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />

            <path
                d="M8 6V4h8v2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            <path
                d="M19 6l-1 14H6L5 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            <path
                d="M10 10v6M14 10v6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}