"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

type LikeButtonProps = {
    postId: number;
    initialLiked: boolean;
    initialCount: number;
    toggleAction: (
        postId: number
    ) => Promise<void>;
};

export function LikeButton({
                               postId,
                               initialLiked,
                               initialCount,
                               toggleAction,
                           }: LikeButtonProps) {
    const [liked, setLiked] =
        useState(initialLiked);

    const [count, setCount] =
        useState(initialCount);

    const likedRef =
        useRef(initialLiked);

    const pendingClicksRef =
        useRef(0);

    const processingRef =
        useRef(false);

    useEffect(() => {
        // 서버 요청 처리 중에는
        // Realtime refresh가 로컬 UI를 덮어쓰지 않게 함
        if (
            processingRef.current ||
            pendingClicksRef.current > 0
        ) {
            return;
        }

        likedRef.current =
            initialLiked;

        setLiked(
            initialLiked
        );

        setCount(
            initialCount
        );
    }, [
        initialLiked,
        initialCount,
    ]);

    async function processQueue() {
        if (processingRef.current) {
            return;
        }

        processingRef.current =
            true;

        while (
            pendingClicksRef.current > 0
            ) {
            pendingClicksRef.current -= 1;

            try {
                await toggleAction(
                    postId
                );
            } catch (error) {
                console.error(
                    "좋아요 처리 실패:",
                    error
                );
            }
        }

        processingRef.current =
            false;
    }

    function handleClick() {
        const nextLiked =
            !likedRef.current;

        likedRef.current =
            nextLiked;

        setLiked(
            nextLiked
        );

        setCount(
            (current) =>
                Math.max(
                    0,
                    current +
                    (nextLiked
                        ? 1
                        : -1)
                )
        );

        // 클릭한 횟수만 기록하고
        // 서버 요청은 순서대로 처리
        pendingClicksRef.current += 1;

        void processQueue();
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={
                liked
                    ? "좋아요 취소"
                    : "좋아요"
            }
            aria-pressed={liked}
            className={
                liked
                    ? "flex items-center gap-1.5 text-red-500 transition active:scale-90"
                    : "flex items-center gap-1.5 text-gray-700 transition hover:text-black active:scale-90"
            }
        >
            <HeartIcon
                filled={liked}
            />

            <span className="text-[11px] font-black tabular-nums">
                {count}
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