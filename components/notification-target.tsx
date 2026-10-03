"use client";

import {
    useEffect,
} from "react";

import {
    useSearchParams,
} from "next/navigation";

export function NotificationTarget() {
    const searchParams =
        useSearchParams();

    const postId =
        searchParams.get(
            "post"
        );

    const commentId =
        searchParams.get(
            "comment"
        );

    useEffect(() => {
        if (!postId) {
            return;
        }

        let attempts =
            0;

        const maxAttempts =
            30;

        let highlightTimer:
            | number
            | null = null;

        const timer =
            window.setInterval(
                () => {
                    attempts += 1;

                    // ========================================
                    // 댓글 알림인 경우
                    //
                    // 게시물이 먼저 보여도 바로 종료하지 않고
                    // 정확한 댓글 DOM이 나타날 때까지 기다린다.
                    // ========================================

                    if (commentId) {
                        const commentElement =
                            document.getElementById(
                                `comment-${commentId}`
                            );

                        if (
                            commentElement
                        ) {
                            window.clearInterval(
                                timer
                            );

                            commentElement.scrollIntoView(
                                {
                                    behavior:
                                        "smooth",
                                    block:
                                        "center",
                                }
                            );

                            commentElement.classList.add(
                                "notification-target-highlight"
                            );

                            highlightTimer =
                                window.setTimeout(
                                    () => {
                                        commentElement.classList.remove(
                                            "notification-target-highlight"
                                        );
                                    },
                                    2200
                                );

                            return;
                        }

                        // 댓글이 아직 렌더링되지 않았다면
                        // CommentList가 자동으로 펼쳐질 시간을 준다.
                        if (
                            attempts <
                            maxAttempts
                        ) {
                            return;
                        }

                        // ========================================
                        // 끝까지 댓글을 못 찾은 경우
                        // 게시물이라도 보여준다.
                        // ========================================

                        const postElement =
                            document.getElementById(
                                `post-${postId}`
                            );

                        if (
                            postElement
                        ) {
                            window.clearInterval(
                                timer
                            );

                            postElement.scrollIntoView(
                                {
                                    behavior:
                                        "smooth",
                                    block:
                                        "center",
                                }
                            );

                            postElement.classList.add(
                                "notification-target-highlight"
                            );

                            highlightTimer =
                                window.setTimeout(
                                    () => {
                                        postElement.classList.remove(
                                            "notification-target-highlight"
                                        );
                                    },
                                    2200
                                );
                        }

                        return;
                    }

                    // ========================================
                    // 게시물 / 좋아요 알림
                    // ========================================

                    const postElement =
                        document.getElementById(
                            `post-${postId}`
                        );

                    if (
                        postElement
                    ) {
                        window.clearInterval(
                            timer
                        );

                        postElement.scrollIntoView(
                            {
                                behavior:
                                    "smooth",
                                block:
                                    "center",
                            }
                        );

                        postElement.classList.add(
                            "notification-target-highlight"
                        );

                        highlightTimer =
                            window.setTimeout(
                                () => {
                                    postElement.classList.remove(
                                        "notification-target-highlight"
                                    );
                                },
                                2200
                            );

                        return;
                    }

                    if (
                        attempts >=
                        maxAttempts
                    ) {
                        window.clearInterval(
                            timer
                        );
                    }
                },
                150
            );

        return () => {
            window.clearInterval(
                timer
            );

            if (
                highlightTimer !==
                null
            ) {
                window.clearTimeout(
                    highlightTimer
                );
            }
        };
    }, [
        postId,
        commentId,
    ]);

    return null;
}