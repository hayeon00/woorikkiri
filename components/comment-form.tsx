"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

type Member = {
    userId: string;
    nickname: string;
    avatarUrl: string | null;
};

type ReplyTarget = {
    commentId: number;
    userId: string;
    nickname: string;
} | null;

export type OptimisticCommentInput = {
    tempId: string;
    content: string;
    createdAt: string;

    parentId: number | null;

    replyToUser: {
        userId: string;
        nickname: string;
    } | null;

    mentions: {
        userId: string;
        nickname: string;
    }[];
};

type CommentFormProps = {
    postId: number;
    avatarUrl: string | null;
    currentUserId: string;
    members: Member[];

    createAction: (
        formData: FormData
    ) =>
        | void
        | Promise<
        | {
        commentId: number;
    }
        | undefined
    >;

    replyTarget?: ReplyTarget;

    onCancelReply?: () => void;

    onSubmitted?: (
        comment: OptimisticCommentInput
    ) => void;

    onSubmitFailed?: (
        tempId: string
    ) => void;
};

export function CommentForm({
                                postId,
                                avatarUrl,
                                currentUserId,
                                members,
                                createAction,
                                replyTarget = null,
                                onCancelReply,
                                onSubmitted,
                                onSubmitFailed,
                            }: CommentFormProps) {
    const formRef =
        useRef<HTMLFormElement>(null);

    const inputRef =
        useRef<HTMLInputElement>(null);

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        mentionQuery,
        setMentionQuery,
    ] = useState<
        string | null
    >(null);

    const [
        selectedMentions,
        setSelectedMentions,
    ] = useState<Member[]>([]);

    // ========================================
    // 답글 선택
    // ========================================

    useEffect(() => {
        if (!replyTarget) {
            return;
        }

        const input =
            inputRef.current;

        if (!input) {
            return;
        }

        input.value =
            `@${replyTarget.nickname} `;

        setSelectedMentions(
            []
        );

        setMentionQuery(
            null
        );

        input.focus();

        const length =
            input.value.length;

        input.setSelectionRange(
            length,
            length
        );
    }, [replyTarget]);

    // ========================================
    // 멘션 후보
    // ========================================

    const mentionCandidates =
        mentionQuery === null
            ? []
            : members
                .filter(
                    (member) => {
                        if (
                            member.userId ===
                            currentUserId
                        ) {
                            return false;
                        }

                        const query =
                            mentionQuery
                                .trim()
                                .toLowerCase();

                        if (!query) {
                            return true;
                        }

                        return member.nickname
                            .toLowerCase()
                            .includes(
                                query
                            );
                    }
                )
                .slice(0, 5);

    // ========================================
    // 입력 변경
    // ========================================

    function handleInputChange(
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        const value =
            event.target.value;

        setSelectedMentions(
            (current) =>
                current.filter(
                    (member) =>
                        value.includes(
                            `@${member.nickname}`
                        )
                )
        );

        const cursor =
            event.target
                .selectionStart ??
            value.length;

        const beforeCursor =
            value.slice(
                0,
                cursor
            );

        const match =
            beforeCursor.match(
                /(?:^|\s)@([^\s@]*)$/
            );

        if (!match) {
            setMentionQuery(
                null
            );

            return;
        }

        setMentionQuery(
            match[1]
        );
    }

    // ========================================
    // 멘션 선택
    // ========================================

    function selectMention(
        member: Member
    ) {
        const input =
            inputRef.current;

        if (!input) {
            return;
        }

        const value =
            input.value;

        const cursor =
            input.selectionStart ??
            value.length;

        const before =
            value.slice(
                0,
                cursor
            );

        const after =
            value.slice(
                cursor
            );

        const replaced =
            before.replace(
                /(?:^|\s)@([^\s@]*)$/,
                (match) => {
                    const prefix =
                        match.startsWith(
                            " "
                        )
                            ? " "
                            : "";

                    return `${prefix}@${member.nickname} `;
                }
            );

        input.value =
            replaced + after;

        setSelectedMentions(
            (current) => {
                if (
                    current.some(
                        (item) =>
                            item.userId ===
                            member.userId
                    )
                ) {
                    return current;
                }

                return [
                    ...current,
                    member,
                ];
            }
        );

        setMentionQuery(
            null
        );

        requestAnimationFrame(
            () => {
                input.focus();

                const position =
                    replaced.length;

                input.setSelectionRange(
                    position,
                    position
                );
            }
        );
    }

    // ========================================
    // 답글 취소
    // ========================================

    function handleCancelReply() {
        formRef.current?.reset();

        setSelectedMentions(
            []
        );

        setMentionQuery(
            null
        );

        onCancelReply?.();
    }

    // ========================================
    // 댓글 등록
    // ========================================

    async function handleSubmit(
        formData: FormData
    ) {
        if (isSubmitting) {
            return;
        }

        const content =
            String(
                formData.get(
                    "content"
                ) ?? ""
            ).trim();

        if (!content) {
            return;
        }

        const submittedReplyTarget =
            replyTarget;

        const submittedMentions = [
            ...selectedMentions,
        ];

        const tempId =
            crypto.randomUUID();

        // ========================================
        // 서버보다 먼저 화면에 댓글 표시
        // ========================================

        onSubmitted?.({
            tempId,
            content,

            createdAt:
                new Date().toISOString(),

            parentId:
                submittedReplyTarget
                    ?.commentId ??
                null,

            replyToUser:
                submittedReplyTarget
                    ? {
                        userId:
                        submittedReplyTarget.userId,

                        nickname:
                        submittedReplyTarget.nickname,
                    }
                    : null,

            mentions:
                submittedMentions.map(
                    (member) => ({
                        userId:
                        member.userId,

                        nickname:
                        member.nickname,
                    })
                ),
        });

        setIsSubmitting(
            true
        );

        formRef.current?.reset();

        setSelectedMentions(
            []
        );

        setMentionQuery(
            null
        );

        try {
            await createAction(
                formData
            );
        } catch (error) {
            console.error(
                "댓글 등록 실패:",
                error
            );

            // 임시 댓글 제거
            onSubmitFailed?.(
                tempId
            );

            // 작성 내용 복구
            const input =
                inputRef.current;

            if (input) {
                input.value =
                    content;

                input.focus();

                const length =
                    input.value.length;

                input.setSelectionRange(
                    length,
                    length
                );
            }
        } finally {
            setIsSubmitting(
                false
            );
        }
    }

    return (
        <div className="sticky bottom-0 z-20 mt-4 border-t border-black/[0.05] bg-white/95 px-1 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-3 backdrop-blur-xl">
            {/* 답글 작성 중 */}

            {replyTarget && (
                <div className="mb-2 ml-9 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                    <p className="min-w-0 truncate text-[10px] text-gray-500">
                        <strong className="font-black text-blue-500">
                            @{replyTarget.nickname}
                        </strong>

                        <span>
                            {" "}
                            님에게 답글 작성 중
                        </span>
                    </p>

                    <button
                        type="button"
                        onClick={
                            handleCancelReply
                        }
                        className="ml-3 shrink-0 text-[10px] font-bold text-gray-400 transition hover:text-gray-700"
                    >
                        취소
                    </button>
                </div>
            )}

            {/* 멘션 자동완성 */}

            {mentionCandidates.length >
                0 && (
                    <div className="absolute bottom-[calc(100%+6px)] left-9 right-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                        {mentionCandidates.map(
                            (member) => (
                                <button
                                    key={
                                        member.userId
                                    }
                                    type="button"
                                    onMouseDown={(
                                        event
                                    ) => {
                                        event.preventDefault();
                                    }}
                                    onClick={() =>
                                        selectMention(
                                            member
                                        )
                                    }
                                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-gray-50"
                                >
                                    {member.avatarUrl ? (
                                        <img
                                            src={
                                                member.avatarUrl
                                            }
                                            alt=""
                                            className="h-7 w-7 shrink-0 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                            <UserIcon />
                                        </div>
                                    )}

                                    <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-gray-700">
                                    {
                                        member.nickname
                                    }
                                </span>

                                    <span className="shrink-0 text-[11px] font-black text-blue-500">
                                    @
                                </span>
                                </button>
                            )
                        )}
                    </div>
                )}

            {/* 댓글 입력 */}

            <form
                ref={
                    formRef
                }
                action={
                    handleSubmit
                }
                className="flex items-center gap-2"
            >
                <input
                    type="hidden"
                    name="post_id"
                    value={
                        postId
                    }
                />

                {replyTarget && (
                    <input
                        type="hidden"
                        name="parent_id"
                        value={
                            replyTarget.commentId
                        }
                    />
                )}

                {selectedMentions.map(
                    (member) => (
                        <input
                            key={
                                member.userId
                            }
                            type="hidden"
                            name="mention_user_ids"
                            value={
                                member.userId
                            }
                        />
                    )
                )}

                {avatarUrl ? (
                    <img
                        src={
                            avatarUrl
                        }
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
                        ref={
                            inputRef
                        }
                        type="text"
                        name="content"
                        maxLength={
                            300
                        }
                        required
                        disabled={
                            isSubmitting
                        }
                        onChange={
                            handleInputChange
                        }
                        placeholder={
                            isSubmitting
                                ? "등록 중..."
                                : replyTarget
                                    ? `${replyTarget.nickname}님에게 답글...`
                                    : "댓글 남기기..."
                        }
                        autoComplete="off"
                        className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[16px] outline-none placeholder:text-gray-400 disabled:opacity-60 sm:text-[13px]"
                    />

                    <button
                        type="submit"
                        disabled={
                            isSubmitting
                        }
                        aria-label={
                            isSubmitting
                                ? "댓글 등록 중"
                                : replyTarget
                                    ? "답글 등록"
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
        </div>
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