"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";
import type { FormState } from "@/lib/form-state";
import { friendlyErrorMessage } from "@/lib/friendly-error";
import { toast } from "@/lib/toast";

type LikeButtonProps = {
    postId: number;
    initialLiked: boolean;
    initialCount: number;
    /** 좋아요를 원하는 상태(켜기/끄기)로 맞춘다 */
    setLikeAction: (
        postId: number,
        liked: boolean
    ) => Promise<FormState>;
};

const LIKE_FAILED_MESSAGE =
    "좋아요를 반영하지 못했어요. 잠시 후 다시 시도해주세요.";

/**
 * 좋아요 버튼 (A2)
 *
 * - 누르면 하트·숫자를 즉시 바꾼다.
 * - 서버에는 "마지막으로 원한 상태" 하나만 맞춘다. 보내는 중에 더 눌리면
 *   응답 뒤 최종 상태만 다시 보내므로, 연타해도 요청은 최대 2번이다.
 * - 실패하면 서버가 마지막으로 확인해 준 상태로 되돌리고 토스트로 안내한다.
 */
export function LikeButton({
                               postId,
                               initialLiked,
                               initialCount,
                               setLikeAction,
                           }: LikeButtonProps) {
    const [liked, setLiked] =
        useState(initialLiked);

    const [count, setCount] =
        useState(initialCount);

    // 서버가 마지막으로 확인해 준 상태 (실패 시 여기로 되돌린다)
    const confirmedRef = useRef({
        liked: initialLiked,
        count: initialCount,
    });

    // 사용자가 마지막으로 원한 상태
    const desiredRef =
        useRef(initialLiked);

    const syncingRef =
        useRef(false);

    useEffect(() => {
        // 서버와 맞추는 중에는 새로고침 값이 로컬 화면을 덮어쓰지 않게 함
        if (syncingRef.current) {
            return;
        }

        confirmedRef.current = {
            liked: initialLiked,
            count: initialCount,
        };

        desiredRef.current =
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

    async function syncWithServer() {
        if (syncingRef.current) {
            return;
        }

        syncingRef.current = true;

        try {
            while (
                desiredRef.current !==
                confirmedRef.current.liked
                ) {
                const target =
                    desiredRef.current;

                let failure: string | null =
                    null;

                try {
                    const result =
                        await setLikeAction(
                            postId,
                            target
                        );

                    if (result.status === "error") {
                        failure =
                            result.message ??
                            LIKE_FAILED_MESSAGE;
                    }
                } catch (error) {
                    failure =
                        friendlyErrorMessage(
                            error,
                            LIKE_FAILED_MESSAGE
                        );
                }

                if (failure) {
                    console.error(
                        "좋아요 처리 실패:",
                        failure
                    );

                    // 서버가 확인해 준 상태로 되돌린다
                    const confirmed =
                        confirmedRef.current;

                    desiredRef.current =
                        confirmed.liked;

                    setLiked(
                        confirmed.liked
                    );

                    setCount(
                        confirmed.count
                    );

                    toast.error(failure);
                    break;
                }

                confirmedRef.current = {
                    liked: target,
                    count: Math.max(
                        0,
                        confirmedRef.current.count +
                        (target ? 1 : -1)
                    ),
                };
            }
        } finally {
            syncingRef.current = false;
        }
    }

    function handleClick() {
        const nextLiked =
            !desiredRef.current;

        desiredRef.current =
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

        void syncWithServer();
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