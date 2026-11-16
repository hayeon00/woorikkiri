"use client";

import {
    useEffect,
    useRef,
    useState,
    useTransition,
} from "react";
import type { FormState } from "@/lib/form-state";
import { friendlyErrorMessage } from "@/lib/friendly-error";
import { toast } from "@/lib/toast";

type PostMenuProps = {
    postId: number;
    currentContent: string;
    updateAction: (
        formData: FormData
    ) => Promise<FormState>;
    deleteAction: (
        formData: FormData
    ) => Promise<FormState>;
};

export function PostMenu({
                             postId,
                             currentContent,
                             updateAction,
                             deleteAction,
                         }: PostMenuProps) {
    const [isMenuOpen, setIsMenuOpen] =
        useState(false);

    const [isEditOpen, setIsEditOpen] =
        useState(false);

    // 수정 실패 안내 (운영 빌드에서도 서버 문구를 보여주기 위해 결과값으로 받음)
    const [editError, setEditError] =
        useState<string | null>(null);

    const [
        isConfirmOpen,
        setIsConfirmOpen,
    ] = useState(false);

    const [editContent, setEditContent] =
        useState(currentContent);

    // 삭제 처리 중 (서버 응답과 피드 갱신이 끝날 때까지 true)
    const [isDeleting, startDeleteTransition] =
        useTransition();

    // 화면이 다시 그려지기 전에 연달아 눌려도 한 번만 요청하도록
    const deleteRequestedRef =
        useRef(false);

    const menuRef =
        useRef<HTMLDivElement>(null);

    // ========================================
    // 메뉴 바깥 클릭
    // ========================================

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

    // ========================================
    // ESC로 모달 닫기
    // ========================================

    useEffect(() => {
        if (
            !isEditOpen &&
            !isConfirmOpen
        ) {
            return;
        }

        function handleEscape(
            event: KeyboardEvent
        ) {
            if (event.key !== "Escape") {
                return;
            }

            if (isEditOpen) {
                setEditContent(
                    currentContent
                );
                setIsEditOpen(false);
            }

            if (isConfirmOpen && !isDeleting) {
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
    }, [
        isEditOpen,
        isConfirmOpen,
        isDeleting,
        currentContent,
    ]);

    // ========================================
    // 수정 열기
    // ========================================

    function openEdit() {
        setEditContent(currentContent);
        setIsMenuOpen(false);
        setIsEditOpen(true);
    }

    function closeEdit() {
        setEditContent(currentContent);
        setEditError(null);
        setIsEditOpen(false);
    }

    // ========================================
    // 삭제 확인 열기
    // ========================================

    function openDeleteConfirm() {
        setIsMenuOpen(false);
        setIsConfirmOpen(true);
    }

    function closeDeleteConfirm() {
        if (isDeleting) {
            return;
        }

        setIsConfirmOpen(false);
    }

    // ========================================
    // 삭제 실행
    //
    // 처리 중에는 버튼을 잠가 두 번 요청되지 않게 하고,
    // 실패하면 화면은 그대로 둔 채 토스트로만 알린다.
    // ========================================

    function handleDelete() {
        if (deleteRequestedRef.current) {
            return;
        }

        deleteRequestedRef.current = true;

        const formData = new FormData();
        formData.set("post_id", String(postId));

        startDeleteTransition(async () => {
            try {
                const result = await deleteAction(formData);

                if (result.status === "error") {
                    toast.error(
                        result.message ??
                            "게시물을 삭제하지 못했어요. 잠시 후 다시 시도해주세요."
                    );
                    return;
                }

                toast.success("게시물을 삭제했어요");
            } catch (error) {
                toast.error(
                    friendlyErrorMessage(
                        error,
                        "게시물을 삭제하지 못했어요. 잠시 후 다시 시도해주세요."
                    )
                );
            } finally {
                deleteRequestedRef.current = false;
            }
        });
    }

    return (
        <>
            {/* ========================================
                게시물 메뉴
            ======================================== */}
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
                    aria-expanded={isMenuOpen}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-50 hover:text-gray-700"
                >
                    <MoreIcon />
                </button>

                {isMenuOpen && (
                    <div className="absolute right-0 top-[calc(100%+4px)] z-40 w-[150px] overflow-hidden rounded-[16px] border border-black/[0.06] bg-white p-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.13)]">

                        {/* 수정 */}
                        <button
                            type="button"
                            onClick={openEdit}
                            className="flex w-full items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-left text-[12px] font-bold text-gray-700 transition hover:bg-gray-50"
                        >
                            <EditIcon />

                            게시물 수정
                        </button>

                        {/* 삭제 */}
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

            {/* ========================================
                게시물 수정 모달
            ======================================== */}
            {isEditOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-5 backdrop-blur-[2px]"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeEdit();
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`edit-post-title-${postId}`}
                        className="w-full max-w-[420px] overflow-hidden rounded-[26px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.25)]"
                    >
                        <form
                            action={async (formData) => {
                                setEditError(null);
                                const result = await updateAction(formData);
                                if (result.status === "error") {
                                    setEditError(result.message);
                                    return;
                                }
                                setIsEditOpen(false);
                            }}
                        >
                            <input
                                type="hidden"
                                name="post_id"
                                value={postId}
                            />

                            <div className="px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
                                <div className="flex items-center justify-between">
                                    <h2
                                        id={`edit-post-title-${postId}`}
                                        className="text-[16px] font-black tracking-[-0.02em]"
                                    >
                                        게시물 수정
                                    </h2>

                                    <button
                                        type="button"
                                        onClick={
                                            closeEdit
                                        }
                                        aria-label="수정 닫기"
                                        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                                    >
                                        <CloseIcon />
                                    </button>
                                </div>

                                <textarea
                                    name="content"
                                    value={
                                        editContent
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setEditContent(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    maxLength={500}
                                    autoFocus
                                    rows={6}
                                    placeholder="내용을 입력해주세요."
                                    className="mt-4 min-h-[150px] w-full resize-none rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] leading-6 outline-none transition placeholder:text-gray-300 focus:border-gray-400 focus:bg-white"
                                />

                                <div className="mt-2 flex items-center justify-between">
                                    <p
                                        className={
                                            editContent.trim()
                                                ? "text-[12px] text-gray-400"
                                                : "text-[12px] font-bold text-red-500"
                                        }
                                    >
                                        {editContent.trim()
                                            ? "사진은 그대로 유지돼요."
                                            : "글을 입력해주세요."}
                                    </p>

                                    <span className="text-[12px] font-medium text-gray-400">
                                        {
                                            editContent.length
                                        }{" "}
                                        / 500
                                    </span>
                                </div>
                            </div>

                            {editError && (
                                <p
                                    role="alert"
                                    className="px-5 pb-3 text-[11px] font-bold text-red-500 sm:px-6"
                                >
                                    {editError}
                                </p>
                            )}

                            <div className="grid grid-cols-2 gap-2 border-t border-gray-100 p-3">
                                <button
                                    type="button"
                                    onClick={
                                        closeEdit
                                    }
                                    className="flex h-11 items-center justify-center rounded-[14px] bg-gray-100 text-[13px] font-black text-gray-600 transition hover:bg-gray-200 active:scale-[0.98]"
                                >
                                    취소
                                </button>

                                <button
                                    type="submit"
                                    disabled={!editContent.trim()}
                                    className="flex h-11 items-center justify-center rounded-[14px] bg-black text-[13px] font-black text-white transition hover:bg-gray-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                                >
                                    저장
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================
                삭제 확인 모달
            ======================================== */}
            {isConfirmOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-5 backdrop-blur-[2px]"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeDeleteConfirm();
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
                                onClick={
                                    closeDeleteConfirm
                                }
                                disabled={isDeleting}
                                className="flex h-11 items-center justify-center rounded-[14px] bg-gray-100 text-[13px] font-black text-gray-600 transition hover:bg-gray-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                취소
                            </button>

                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                aria-busy={isDeleting}
                                className="flex h-11 w-full items-center justify-center rounded-[14px] bg-red-500 text-[13px] font-black text-white transition hover:bg-red-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-red-300"
                            >
                                {isDeleting
                                    ? "삭제 중…"
                                    : "삭제"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ========================================
// 아이콘
// ========================================

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

function EditIcon() {
    return (
        <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            <path
                d="m13.5 6.5 4 4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
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

function CloseIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}