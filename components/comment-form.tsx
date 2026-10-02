"use client";

import {
    useRef,
    useState,
} from "react";

type CommentFormProps = {
    postId: number;
    avatarUrl: string | null;
    createAction: (
        formData: FormData
    ) => void | Promise<void>;
};

export function CommentForm({
                                postId,
                                avatarUrl,
                                createAction,
                            }: CommentFormProps) {
    const formRef =
        useRef<HTMLFormElement>(null);

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    async function handleSubmit(
        formData: FormData
    ) {
        if (isSubmitting) {
            return;
        }

        const content = String(
            formData.get("content") ?? ""
        ).trim();

        if (!content) {
            return;
        }

        setIsSubmitting(true);

        try {
            await createAction(formData);

            formRef.current?.reset();
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form
            ref={formRef}
            action={handleSubmit}
            className="mt-4 flex items-center gap-2"
        >
            <input
                type="hidden"
                name="post_id"
                value={postId}
            />

            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt="내 프로필"
                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                />
            ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                    <UserIcon />
                </div>
            )}

            <div className="flex min-w-0 flex-1 items-center rounded-full bg-[#f5f5f5]">
                <input
                    type="text"
                    name="content"
                    maxLength={300}
                    required
                    disabled={isSubmitting}
                    placeholder={
                        isSubmitting
                            ? "등록 중..."
                            : "댓글 남기기..."
                    }
                    className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[16px] sm:text-[13px] outline-none placeholder:text-gray-400 disabled:opacity-60"
                />

                <button
                    type="submit"
                    disabled={isSubmitting}
                    aria-label={
                        isSubmitting
                            ? "댓글 등록 중"
                            : "댓글 등록"
                    }
                    className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-950 text-white transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {isSubmitting ? (
                        <LoadingIcon />
                    ) : (
                        <ArrowUpIcon />
                    )}
                </button>
            </div>
        </form>
    );
}

function UserIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <circle
                cx="12"
                cy="8"
                r="4"
                stroke="currentColor"
                strokeWidth="1.8"
            />

            <path
                d="M4 21a8 8 0 0 1 16 0"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

function ArrowUpIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M12 19V5M5 12l7-7 7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function LoadingIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="animate-spin"
        >
            <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2"
                className="opacity-25"
            />

            <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}