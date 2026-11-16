"use client";

import type { FormState } from "@/lib/form-state";
import { useRef, useState, useTransition } from "react";
import { friendlyErrorMessage } from "@/lib/friendly-error";
import { toast } from "@/lib/toast";

type CommentDeleteButtonProps = {
    commentId: number;
    deleteAction: (
        formData: FormData
    ) => Promise<FormState>;
};

const DELETE_FAILED_MESSAGE =
    "댓글을 삭제하지 못했어요. 잠시 후 다시 시도해주세요.";

export function CommentDeleteButton({
                                        commentId,
                                        deleteAction,
                                    }: CommentDeleteButtonProps) {
    const [isConfirming, setIsConfirming] =
        useState(false);

    // 삭제 처리 중 (서버 응답과 목록 갱신이 끝날 때까지 true)
    const [isDeleting, startDeleteTransition] =
        useTransition();

    // 화면이 다시 그려지기 전에 연달아 눌려도 한 번만 요청하도록
    const deleteRequestedRef =
        useRef(false);

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
        formData.set("comment_id", String(commentId));

        startDeleteTransition(async () => {
            try {
                const result = await deleteAction(formData);

                if (result.status === "error") {
                    toast.error(
                        result.message ?? DELETE_FAILED_MESSAGE
                    );
                }
            } catch (error) {
                toast.error(
                    friendlyErrorMessage(
                        error,
                        DELETE_FAILED_MESSAGE
                    )
                );
            } finally {
                deleteRequestedRef.current = false;
            }
        });
    }

    if (!isConfirming) {
        return (
            <button
                type="button"
                onClick={() =>
                    setIsConfirming(true)
                }
                className="mt-1 text-[11px] font-medium text-gray-300 transition hover:text-red-400"
            >
                삭제
            </button>
        );
    }

    return (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-medium text-gray-400">
                이 댓글을 삭제할까요?
            </span>

            <button
                type="button"
                onClick={() =>
                    setIsConfirming(false)
                }
                disabled={isDeleting}
                className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500 transition hover:bg-gray-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
                취소
            </button>

            <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                aria-busy={isDeleting}
                className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-500 transition hover:bg-red-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isDeleting ? "삭제 중…" : "삭제"}
            </button>
        </div>
    );
}
