"use client";

import { useState } from "react";

type CommentDeleteButtonProps = {
    commentId: number;
    deleteAction: (
        formData: FormData
    ) => void | Promise<void>;
};

export function CommentDeleteButton({
                                        commentId,
                                        deleteAction,
                                    }: CommentDeleteButtonProps) {
    const [isConfirming, setIsConfirming] =
        useState(false);

    if (!isConfirming) {
        return (
            <button
                type="button"
                onClick={() =>
                    setIsConfirming(true)
                }
                className="mt-1 text-[9px] font-medium text-gray-300 transition hover:text-red-400"
            >
                삭제
            </button>
        );
    }

    return (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[9px] font-medium text-gray-400">
                이 댓글을 삭제할까요?
            </span>

            <button
                type="button"
                onClick={() =>
                    setIsConfirming(false)
                }
                className="rounded-full bg-gray-100 px-2.5 py-1 text-[9px] font-bold text-gray-500 transition hover:bg-gray-200 active:scale-95"
            >
                취소
            </button>

            <form
                action={deleteAction}
                className="inline-flex"
            >
                <input
                    type="hidden"
                    name="comment_id"
                    value={commentId}
                />

                <button
                    type="submit"
                    className="rounded-full bg-red-50 px-2.5 py-1 text-[9px] font-black text-red-500 transition hover:bg-red-100 active:scale-95"
                >
                    삭제
                </button>
            </form>
        </div>
    );
}