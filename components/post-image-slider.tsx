"use client";

import {
    useRef,
    useState,
} from "react";

type PostImage = {
    id: number;
    image_url: string;
};

export function PostImageSlider({
                                    images,
                                }: {
    images: PostImage[];
}) {
    const [currentIndex, setCurrentIndex] =
        useState(0);

    const touchStartX =
        useRef<number | null>(null);

    const touchEndX =
        useRef<number | null>(null);

    if (images.length === 0) {
        return null;
    }

    const safeIndex = Math.min(
        currentIndex,
        images.length - 1
    );

    const currentImage =
        images[safeIndex];

    function goPrevious() {
        setCurrentIndex((current) =>
            Math.max(0, current - 1)
        );
    }

    function goNext() {
        setCurrentIndex((current) =>
            Math.min(
                images.length - 1,
                current + 1
            )
        );
    }

    function handleTouchStart(
        event: React.TouchEvent<HTMLDivElement>
    ) {
        touchEndX.current = null;

        touchStartX.current =
            event.targetTouches[0]
                ?.clientX ?? null;
    }

    function handleTouchMove(
        event: React.TouchEvent<HTMLDivElement>
    ) {
        touchEndX.current =
            event.targetTouches[0]
                ?.clientX ?? null;
    }

    function handleTouchEnd() {
        if (
            touchStartX.current === null ||
            touchEndX.current === null
        ) {
            return;
        }

        const distance =
            touchStartX.current -
            touchEndX.current;

        const minimumSwipeDistance = 45;

        if (
            distance >
            minimumSwipeDistance
        ) {
            goNext();
        }

        if (
            distance <
            -minimumSwipeDistance
        ) {
            goPrevious();
        }

        touchStartX.current = null;
        touchEndX.current = null;
    }

    return (
        <div className="px-2 sm:px-3">
            <div
                className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-gray-100"
                onTouchStart={
                    handleTouchStart
                }
                onTouchMove={
                    handleTouchMove
                }
                onTouchEnd={
                    handleTouchEnd
                }
            >
                {/* 현재 사진 */}
                <img
                    src={
                        currentImage.image_url
                    }
                    alt={`게시글 사진 ${
                        safeIndex + 1
                    }`}
                    draggable={false}
                    className="absolute inset-0 h-full w-full select-none object-cover"
                />

                {/* 사진 번호 */}
                {images.length > 1 && (
                    <div className="absolute right-3 top-3 z-10 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                        {safeIndex + 1} /{" "}
                        {images.length}
                    </div>
                )}

                {/* 이전 */}
                {safeIndex > 0 && (
                    <button
                        type="button"
                        onClick={
                            goPrevious
                        }
                        aria-label="이전 사진"
                        className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/65 active:scale-95"
                    >
                        <ChevronLeftIcon />
                    </button>
                )}

                {/* 다음 */}
                {safeIndex <
                    images.length - 1 && (
                        <button
                            type="button"
                            onClick={
                                goNext
                            }
                            aria-label="다음 사진"
                            className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/65 active:scale-95"
                        >
                            <ChevronRightIcon />
                        </button>
                    )}
            </div>

            {/* 페이지 점 */}
            {images.length > 1 && (
                <div className="mt-2.5 flex justify-center gap-1.5">
                    {images.map(
                        (
                            image,
                            index
                        ) => (
                            <button
                                key={
                                    image.id
                                }
                                type="button"
                                onClick={() =>
                                    setCurrentIndex(
                                        index
                                    )
                                }
                                aria-label={`사진 ${
                                    index + 1
                                }번 보기`}
                                className={`h-1.5 rounded-full transition-all ${
                                    index ===
                                    safeIndex
                                        ? "w-4 bg-gray-800"
                                        : "w-1.5 bg-gray-300"
                                }`}
                            />
                        )
                    )}
                </div>
            )}
        </div>
    );
}

function ChevronLeftIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="m15 18-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function ChevronRightIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="m9 18 6-6-6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}