"use client";

import {
    useEffect,
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
    const [content, setContent] = useState("");
    const [images, setImages] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const objectUrls = images.map((image) =>
            URL.createObjectURL(image)
        );

        setPreviewUrls(objectUrls);

        return () => {
            objectUrls.forEach((url) => {
                URL.revokeObjectURL(url);
            });
        };
    }, [images]);

    useEffect(() => {
        if (!isExpanded) {
            return;
        }

        const timer = window.setTimeout(() => {
            textareaRef.current?.focus();
        }, 100);

        return () => {
            window.clearTimeout(timer);
        };
    }, [isExpanded]);

    function removeImage(index: number) {
        setImages((current) =>
            current.filter(
                (_, imageIndex) =>
                    imageIndex !== index
            )
        );

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    function closeComposer() {
        if (isSubmitting) {
            return;
        }

        setContent("");
        setImages([]);
        setErrorMessage("");
        setIsExpanded(false);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    }

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        const trimmedContent = content.trim();

        if (
            !trimmedContent &&
            images.length === 0
        ) {
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

        if (images.length > 5) {
            setErrorMessage(
                "사진은 최대 5장까지 추가할 수 있습니다."
            );
            return;
        }

        for (const image of images) {
            if (
                !image.type.startsWith(
                    "image/"
                )
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
                    "사진 한 장당 5MB 이하만 업로드할 수 있습니다."
                );
                return;
            }
        }

        setIsSubmitting(true);
        setErrorMessage("");

        const supabase = createClient();

        const uploadedImagePaths: string[] =
            [];

        try {
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

            for (const image of images) {
                const extension =
                    image.name
                        .split(".")
                        .pop()
                        ?.toLowerCase() ||
                    "jpg";

                const imagePath =
                    `${user.id}/${crypto.randomUUID()}.${extension}`;

                const { error: uploadError } =
                    await supabase.storage
                        .from("post-images")
                        .upload(
                            imagePath,
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

                uploadedImagePaths.push(
                    imagePath
                );
            }

            const formData = new FormData();

            formData.set(
                "group_id",
                String(groupId)
            );

            formData.set(
                "content",
                trimmedContent
            );

            uploadedImagePaths.forEach(
                (imagePath) => {
                    formData.append(
                        "image_paths",
                        imagePath
                    );
                }
            );

            await createPost(formData);

            setContent("");
            setImages([]);
            setIsExpanded(false);

            if (fileInputRef.current) {
                fileInputRef.current.value =
                    "";
            }

            if (textareaRef.current) {
                textareaRef.current.style.height =
                    "auto";
            }
        } catch (error) {
            if (
                uploadedImagePaths.length > 0
            ) {
                await supabase.storage
                    .from("post-images")
                    .remove(
                        uploadedImagePaths
                    );
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

    if (!isExpanded) {
        return (
            <button
                type="button"
                onClick={() =>
                    setIsExpanded(true)
                }
                className="flex w-full items-center gap-3 rounded-[22px] border border-black/[0.04] bg-white p-4 text-left shadow-[0_8px_30px_rgba(0,0,0,0.03)] transition hover:border-black/[0.08] hover:shadow-[0_10px_35px_rgba(0,0,0,0.05)] active:scale-[0.995]"
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt="내 프로필"
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                        <UserIcon />
                    </div>
                )}

                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-gray-400">
                    {nickname}님, 오늘은 어땠나요?
                </span>

                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                    <ImageIcon />
                </span>
            </button>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-[24px] border border-black/[0.05] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.055)]"
        >
            {/* 작성창 상단 */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <button
                    type="button"
                    onClick={closeComposer}
                    disabled={isSubmitting}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 disabled:opacity-40"
                    aria-label="작성 취소"
                >
                    <CloseIcon />
                </button>

                <p className="text-[13px] font-black">
                    새 이야기
                </p>

                <div className="h-8 w-8" />
            </div>

            <div className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt="내 프로필"
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                    ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                            <UserIcon />
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
                        <p className="mb-1 text-[12px] font-black">
                            {nickname}
                        </p>

                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(
                                event
                            ) => {
                                setContent(
                                    event.target
                                        .value
                                );

                                event.target.style.height =
                                    "auto";

                                event.target.style.height =
                                    `${Math.min(
                                        event.target
                                            .scrollHeight,
                                        220
                                    )}px`;

                                if (
                                    errorMessage
                                ) {
                                    setErrorMessage(
                                        ""
                                    );
                                }
                            }}
                            placeholder="우리에게 무슨 일이 있었나요?"
                            maxLength={500}
                            rows={3}
                            disabled={isSubmitting}
                            className="max-h-[220px] min-h-[92px] w-full resize-none bg-transparent text-[15px] leading-6 text-gray-900 outline-none placeholder:text-gray-300 disabled:opacity-60"
                        />

                        {content.length >
                            420 && (
                                <div className="mt-1 text-right text-[10px] font-medium text-gray-300">
                                    {
                                        content.length
                                    }
                                    /500
                                </div>
                            )}
                    </div>
                </div>

                {/* 사진 미리보기 */}
                {/* 사진 미리보기 */}
                {previewUrls.length > 0 && (
                    <div
                        className={`mt-4 grid gap-2 ${
                            previewUrls.length === 1
                                ? "grid-cols-1"
                                : "grid-cols-2"
                        }`}
                    >
                        {previewUrls.map(
                            (previewUrl, index) => (
                                <div
                                    key={previewUrl}
                                    className="relative overflow-hidden rounded-[18px] bg-gray-100"
                                >
                                    <img
                                        src={previewUrl}
                                        alt={`선택한 사진 ${
                                            index + 1
                                        }`}
                                        className={
                                            previewUrls.length ===
                                            1
                                                ? "max-h-[440px] w-full object-cover"
                                                : "aspect-square w-full object-cover"
                                        }
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeImage(
                                                index
                                            )
                                        }
                                        disabled={
                                            isSubmitting
                                        }
                                        aria-label={`${
                                            index + 1
                                        }번째 사진 제거`}
                                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white shadow-sm backdrop-blur transition hover:bg-black/80 disabled:opacity-50"
                                    >
                                        <CloseIcon />
                                    </button>
                                </div>
                            )
                        )}
                    </div>
                )}

                {errorMessage && (
                    <div className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-500">
                        {errorMessage}
                    </div>
                )}
            </div>

            {/* 작성창 하단 */}
            <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2.5 sm:px-4">

                <label
                    className={
                        isSubmitting
                            ? "flex cursor-not-allowed items-center gap-2 rounded-full px-3 py-2 text-[13px] font-bold text-gray-300"
                            : "flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-[13px] font-bold text-gray-600 transition hover:bg-gray-50 active:scale-95"
                    }
                >
                    <ImageIcon />

                    <span>
    {images.length > 0
        ? `사진 추가 (${images.length}/5)`
        : "사진 추가"}
</span>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={
                            isSubmitting ||
                            images.length >= 5
                        }
                        className="hidden"
                        onChange={(event) => {
                            const selectedFiles =
                                Array.from(
                                    event.target.files ?? []
                                );

                            if (
                                selectedFiles.length === 0
                            ) {
                                return;
                            }

                            if (
                                images.length +
                                selectedFiles.length >
                                5
                            ) {
                                setErrorMessage(
                                    "사진은 최대 5장까지 추가할 수 있습니다."
                                );

                                event.target.value = "";
                                return;
                            }

                            const invalidFile =
                                selectedFiles.find(
                                    (file) =>
                                        !file.type.startsWith(
                                            "image/"
                                        )
                                );

                            if (invalidFile) {
                                setErrorMessage(
                                    "이미지 파일만 선택해주세요."
                                );

                                event.target.value = "";
                                return;
                            }

                            const oversizedFile =
                                selectedFiles.find(
                                    (file) =>
                                        file.size >
                                        5 * 1024 * 1024
                                );

                            if (oversizedFile) {
                                setErrorMessage(
                                    "사진 한 장당 5MB 이하만 업로드할 수 있습니다."
                                );

                                event.target.value = "";
                                return;
                            }

                            setImages((current) => [
                                ...current,
                                ...selectedFiles,
                            ]);

                            setErrorMessage("");

                            event.target.value = "";
                        }}
                    />
                </label>

                <button
                    type="submit"
                    disabled={
                        isSubmitting ||
                        (!content.trim() &&
                            images.length === 0)
                    }
                    className="flex h-10 min-w-[82px] items-center justify-center rounded-full bg-gray-950 px-5 text-[13px] font-black text-white transition hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                >
                    {isSubmitting ? (
                        <span className="flex items-center gap-2">
                            <LoadingIcon />
                            공유 중
                        </span>
                    ) : (
                        "공유하기"
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
            <path
                d="M20 21a8 8 0 0 0-16 0"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />

            <circle
                cx="12"
                cy="7"
                r="4"
                stroke="currentColor"
                strokeWidth="1.8"
            />
        </svg>
    );
}

function ImageIcon() {
    return (
        <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.7"
            />

            <circle
                cx="9"
                cy="9"
                r="1.7"
                stroke="currentColor"
                strokeWidth="1.7"
            />

            <path
                d="m5.5 18 4.6-4.8a2 2 0 0 1 2.9 0l1.6 1.7 1.2-1.2a2 2 0 0 1 2.8 0L21 16.2"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="m7 7 10 10M17 7 7 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

function LoadingIcon() {
    return (
        <svg
            className="h-3.5 w-3.5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="3"
                className="opacity-25"
            />

            <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="opacity-90"
            />
        </svg>
    );
}