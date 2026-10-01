"use client";

import {
    useOptimistic,
    useState,
    useTransition,
} from "react";

type LikeButtonProps = {
    postId: number;
    initialLiked: boolean;
    initialCount: number;
    toggleAction: (
        postId: number
    ) => Promise<void>;
};

type LikeState = {
    liked: boolean;
    count: number;
};

export function LikeButton({
                               postId,
                               initialLiked,
                               initialCount,
                               toggleAction,
                           }: LikeButtonProps) {
    const [serverState, setServerState] =
        useState<LikeState>({
            liked: initialLiked,
            count: initialCount,
        });

    const [optimisticState, setOptimisticState] =
        useOptimistic(
            serverState,
            (
                current: LikeState,
                nextLiked: boolean
            ) => ({
                liked: nextLiked,
                count: Math.max(
                    0,
                    current.count +
                    (nextLiked ? 1 : -1)
                ),
            })
        );

    const [isPending, startTransition] =
        useTransition();

    function handleClick() {
        if (isPending) {
            return;
        }

        const nextLiked =
            !optimisticState.liked;

        startTransition(async () => {
            setOptimisticState(nextLiked);

            try {
                await toggleAction(postId);

                setServerState({
                    liked: nextLiked,
                    count: Math.max(
                        0,
                        serverState.count +
                        (nextLiked ? 1 : -1)
                    ),
                });
            } catch (error) {
                console.error(
                    "좋아요 처리 실패:",
                    error
                );
            }
        });
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={
                optimisticState.liked
                    ? "좋아요 취소"
                    : "좋아요"
            }
            aria-pressed={
                optimisticState.liked
            }
            className={
                optimisticState.liked
                    ? "flex items-center gap-1.5 text-red-500 transition active:scale-90"
                    : "flex items-center gap-1.5 text-gray-700 transition hover:text-black active:scale-90"
            }
        >
            <HeartIcon
                filled={
                    optimisticState.liked
                }
            />

            <span className="text-[11px] font-black tabular-nums">
                {optimisticState.count}
            </span>
        </button>
    );
}

function HeartIcon({
                       filled,
                   }: {
    filled: boolean;
}) {
    return (
        <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill={
                filled
                    ? "currentColor"
                    : "none"
            }
            aria-hidden="true"
        >
            <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}