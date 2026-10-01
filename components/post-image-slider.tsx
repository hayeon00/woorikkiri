"use client";

import {
    useEffect,
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
    const sliderRef =
        useRef<HTMLDivElement>(null);

    const [currentIndex, setCurrentIndex] =
        useState(0);

    const scrollTimer =
        useRef<ReturnType<
            typeof setTimeout
        > | null>(null);

    useEffect(() => {
        return () => {
            if (scrollTimer.current) {
                clearTimeout(
                    scrollTimer.current
                );
            }
        };
    }, []);

    if (images.length === 0) {
        return null;
    }

    function updateCurrentIndex() {
        const slider =
            sliderRef.current;

        if (!slider) {
            return;
        }

        const width =
            slider.clientWidth;

        if (width <= 0) {
            return;
        }

        const index = Math.round(
            slider.scrollLeft / width
        );

        setCurrentIndex(
            Math.max(
                0,
                Math.min(
                    images.length - 1,
                    index
                )
            )
        );
    }

    function handleScroll() {
        if (scrollTimer.current) {
            clearTimeout(
                scrollTimer.current
            );
        }

        scrollTimer.current =
            setTimeout(() => {
                updateCurrentIndex();
            }, 40);
    }

    function goToImage(index: number) {
        const slider =
            sliderRef.current;

        if (!slider) {
            return;
        }

        const safeIndex = Math.max(
            0,
            Math.min(
                images.length - 1,
                index
            )
        );

        slider.scrollTo({
            left:
                slider.clientWidth *
                safeIndex,
            behavior: "smooth",
        });

        setCurrentIndex(safeIndex);
    }

    function goPrevious() {
        goToImage(currentIndex - 1);
    }

    function goNext() {
        goToImage(currentIndex + 1);
    }

    return (
        <div className="relative w-full">

            {/* ========================================
                사진 영역
            ======================================== */}

            <div
                className="
                    group
                    relative
                    aspect-square
                    w-full
                    overflow-hidden
                    bg-gray-100
                    sm:rounded-[16px]
                "
            >
                {/* ========================================
                    슬라이더
                ======================================== */}

                <div
                    ref={sliderRef}
                    onScroll={handleScroll}
                    className="
                        flex
                        h-full
                        w-full
                        snap-x
                        snap-mandatory
                        overflow-x-auto
                        overscroll-x-contain
                        [scrollbar-width:none]
                        [-ms-overflow-style:none]
                        [&::-webkit-scrollbar]:hidden
                    "
                    style={{
                        WebkitOverflowScrolling:
                            "touch",
                    }}
                >
                    {images.map(
                        (
                            image,
                            index
                        ) => (
                            <div
                                key={
                                    image.id
                                }
                                className="
                                    relative
                                    h-full
                                    min-w-full
                                    shrink-0
                                    snap-center
                                    snap-always
                                    overflow-hidden
                                    bg-gray-100
                                "
                            >
                                <img
                                    src={
                                        image.image_url
                                    }
                                    alt={`게시글 사진 ${
                                        index +
                                        1
                                    }`}
                                    draggable={
                                        false
                                    }
                                    className="
                                        h-full
                                        w-full
                                        select-none
                                        object-cover
                                    "
                                />
                            </div>
                        )
                    )}
                </div>

                {/* ========================================
                    사진 번호
                ======================================== */}

                {images.length > 1 && (
                    <div
                        className="
                            pointer-events-none
                            absolute
                            right-3
                            top-3
                            z-20
                            rounded-full
                            bg-black/55
                            px-2.5
                            py-1.5
                            text-[10px]
                            font-bold
                            leading-none
                            text-white
                            shadow-sm
                            backdrop-blur-md
                        "
                    >
                        {currentIndex + 1}

                        <span className="mx-1 opacity-60">
                            /
                        </span>

                        {images.length}
                    </div>
                )}

                {/* ========================================
                    PC 이전 버튼
                ======================================== */}

                {images.length > 1 &&
                    currentIndex > 0 && (
                        <button
                            type="button"
                            onClick={
                                goPrevious
                            }
                            aria-label="이전 사진"
                            className="
                                absolute
                                left-3
                                top-1/2
                                z-20
                                hidden
                                h-10
                                w-10
                                -translate-y-1/2
                                items-center
                                justify-center
                                rounded-full
                                bg-black/45
                                text-white
                                opacity-0
                                shadow-md
                                backdrop-blur-md
                                transition-all
                                duration-200
                                hover:bg-black/60
                                group-hover:opacity-100
                                sm:flex
                            "
                        >
                            <ChevronLeftIcon />
                        </button>
                    )}

                {/* ========================================
                    PC 다음 버튼
                ======================================== */}

                {images.length > 1 &&
                    currentIndex <
                    images.length - 1 && (
                        <button
                            type="button"
                            onClick={
                                goNext
                            }
                            aria-label="다음 사진"
                            className="
                                absolute
                                right-3
                                top-1/2
                                z-20
                                hidden
                                h-10
                                w-10
                                -translate-y-1/2
                                items-center
                                justify-center
                                rounded-full
                                bg-black/45
                                text-white
                                opacity-0
                                shadow-md
                                backdrop-blur-md
                                transition-all
                                duration-200
                                hover:bg-black/60
                                group-hover:opacity-100
                                sm:flex
                            "
                        >
                            <ChevronRightIcon />
                        </button>
                    )}
            </div>

            {/* ========================================
                페이지 표시 점
            ======================================== */}

            {images.length > 1 && (
                <div
                    className="
                        flex
                        h-7
                        items-center
                        justify-center
                        gap-1.5
                    "
                >
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
                                    goToImage(
                                        index
                                    )
                                }
                                aria-label={`사진 ${
                                    index + 1
                                }번 보기`}
                                className={`rounded-full transition-all duration-200 ${
                                    index ===
                                    currentIndex
                                        ? "h-1.5 w-4 bg-gray-800"
                                        : "h-1.5 w-1.5 bg-gray-300"
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
            width="20"
            height="20"
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
            width="20"
            height="20"
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