"use client";

import {
    useRef,
    useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { createPost } from "@/app/actions";

type CreatePostFormProps = {
    groupId: number;
    nickname: string;
    avatarUrl: string | null;
};

export function CreatePostForm({
                                   groupId,
                                   nickname,
                                   avatarUrl,
                               }: CreatePostFormProps) {
    const [content, setContent] =
        useState("");

    const [image, setImage] =
        useState<File | null>(null);

    const [imageName, setImageName] =
        useState("");

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [errorMessage, setErrorMessage] =
        useState("");

    const fileInputRef =
        useRef<HTMLInputElement>(null);

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        const trimmedContent =
            content.trim();

        if (!trimmedContent && !image) {
            setErrorMessage(
                "글이나 사진을 추가해주세요."
            );
            return;
        }

        if (trimmedContent.length > 500) {
            setErrorMessage(
                "글은 500자 이하로 입력해주세요."
            );
            return;
        }

        if (image) {
            if (
                !image.type.startsWith("image/")
            ) {
                setErrorMessage(
                    "이미지 파일만 업로드할 수 있습니다."
                );
                return;
            }

            if (
                image.size >
                5 * 1024 * 1024
            ) {
                setErrorMessage(
                    "사진은 5MB 이하만 업로드할 수 있습니다."
                );
                return;
            }
        }

        setIsSubmitting(true);
        setErrorMessage("");

        const supabase =
            createClient();

        let uploadedImagePath:
            | string
            | null = null;

        try {
            // 현재 로그인 사용자 확인
            const {
                data: { user },
                error: userError,
            } =
                await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error(
                    "로그인이 필요합니다."
                );
            }

            // 사진이 있으면 브라우저에서
            // Supabase Storage로 직접 업로드
            if (image) {
                const extension =
                    image.name
                        .split(".")
                        .pop()
                        ?.toLowerCase() ||
                    "jpg";

                uploadedImagePath =
                    `${user.id}/${crypto.randomUUID()}.${extension}`;

                const {
                    error: uploadError,
                } =
                    await supabase.storage
                        .from(
                            "post-images"
                        )
                        .upload(
                            uploadedImagePath,
                            image,
                            {
                                contentType:
                                image.type,
                                upsert: false,
                            }
                        );

                if (uploadError) {
                    throw new Error(
                        uploadError.message
                    );
                }
            }

            // Server Action에는 사진 파일을
            // 보내지 않고 경로만 전송
            const formData =
                new FormData();

            formData.set(
                "group_id",
                String(groupId)
            );

            formData.set(
                "content",
                trimmedContent
            );

            if (uploadedImagePath) {
                formData.set(
                    "image_path",
                    uploadedImagePath
                );
            }

            await createPost(formData);

            setContent("");
            setImage(null);
            setImageName("");

            if (fileInputRef.current) {
                fileInputRef.current.value =
                    "";
            }
        } catch (error) {
            // 사진 업로드는 성공했는데
            // 게시글 저장이 실패한 경우
            // 고아 파일이 남지 않도록 정리
            if (uploadedImagePath) {
                await supabase.storage
                    .from("post-images")
                    .remove([
                        uploadedImagePath,
                    ]);
            }

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "게시글을 등록하지 못했습니다."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-[26px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.035)] sm:p-7"
        >
            <div className="flex items-start gap-3 sm:gap-4">
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt="내 프로필"
                        className="h-10 w-10 shrink-0 rounded-full object-cover sm:h-11 sm:w-11"
                    />
                ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 sm:h-11 sm:w-11">
                        👤
                    </div>
                )}

                <textarea
                    value={content}
                    onChange={(event) =>
                        setContent(
                            event.target.value
                        )
                    }
                    placeholder={`${nickname}님, 무슨 일이 있었나요?`}
                    maxLength={500}
                    disabled={isSubmitting}
                    className="min-h-[88px] min-w-0 flex-1 resize-none pt-2 text-[15px] leading-6 outline-none placeholder:text-gray-300 disabled:opacity-60 sm:text-base"
                />
            </div>

            {imageName && (
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="min-w-0 truncate text-xs font-semibold text-gray-500">
                        사진: {imageName}
                    </p>

                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                            setImage(null);
                            setImageName("");

                            if (
                                fileInputRef.current
                            ) {
                                fileInputRef.current.value =
                                    "";
                            }
                        }}
                        className="ml-3 shrink-0 text-xs font-bold text-gray-400"
                    >
                        취소
                    </button>
                </div>
            )}

            {errorMessage && (
                <p className="mt-3 text-xs font-semibold text-red-500">
                    {errorMessage}
                </p>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-full px-2 py-2 text-[13px] font-bold text-gray-600 transition hover:bg-gray-50">
                    <span className="text-lg">
                        ▣
                    </span>

                    사진

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        disabled={isSubmitting}
                        className="hidden"
                        onChange={(event) => {
                            const file =
                                event.target
                                    .files?.[0] ??
                                null;

                            if (!file) {
                                setImage(null);
                                setImageName("");
                                return;
                            }

                            if (
                                !file.type.startsWith(
                                    "image/"
                                )
                            ) {
                                setErrorMessage(
                                    "이미지 파일만 선택해주세요."
                                );
                                event.target.value =
                                    "";
                                return;
                            }

                            if (
                                file.size >
                                5 * 1024 * 1024
                            ) {
                                setErrorMessage(
                                    "사진은 5MB 이하만 업로드할 수 있습니다."
                                );
                                event.target.value =
                                    "";
                                return;
                            }

                            setImage(file);
                            setImageName(
                                file.name
                            );
                            setErrorMessage("");
                        }}
                    />
                </label>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-full bg-black px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-gray-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSubmitting
                        ? "공유 중..."
                        : "공유하기"}
                </button>
            </div>
        </form>
    );
}