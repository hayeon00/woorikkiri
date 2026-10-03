"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push";

export async function createPost(formData: FormData) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error(
            "로그인이 필요합니다."
        );
    }

    const content = String(
        formData.get("content") ?? ""
    ).trim();

    const imagePaths = formData
        .getAll("image_paths")
        .map((value) =>
            String(value).trim()
        )
        .filter(Boolean);

    const groupId = Number(
        formData.get("group_id")
    );

    // 그룹 ID 검사
    if (
        !Number.isInteger(groupId) ||
        groupId <= 0
    ) {
        throw new Error(
            "잘못된 그룹입니다."
        );
    }

    // 실제로 내가 이 그룹 멤버인지 확인
    const {
        data: membership,
        error: membershipError,
    } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (membershipError) {
        throw new Error(
            membershipError.message
        );
    }

    if (!membership) {
        throw new Error(
            "참여하지 않은 그룹입니다."
        );
    }

    // 글 또는 사진이 하나는 있어야 함
    if (
        !content &&
        imagePaths.length === 0
    ) {
        throw new Error(
            "글이나 사진을 추가해주세요."
        );
    }

    if (content.length > 500) {
        throw new Error(
            "글은 500자 이하로 입력해주세요."
        );
    }

    // 서버에서도 최대 5장 제한
    if (imagePaths.length > 5) {
        throw new Error(
            "사진은 최대 5장까지 추가할 수 있습니다."
        );
    }

    // 다른 사용자의 Storage 경로를
    // 임의로 저장하지 못하도록 전부 검사
    const hasInvalidImagePath =
        imagePaths.some(
            (imagePath) =>
                !imagePath.startsWith(
                    `${user.id}/`
                )
        );

    if (hasInvalidImagePath) {
        throw new Error(
            "잘못된 사진 경로입니다."
        );
    }

    // ========================================
    // 게시글 먼저 생성
    //
    // 기존 image_path에는 첫 번째 사진을
    // 당분간 호환용으로 함께 저장한다.
    // ========================================

    const {
        data: post,
        error: postError,
    } = await supabase
        .from("posts")
        .insert({
            user_id: user.id,
            group_id: groupId,
            content,
            image_path:
                imagePaths[0] ?? null,
        })
        .select("id")
        .single();

    if (postError) {
        throw new Error(
            postError.message
        );
    }

    // ========================================
    // 여러 장 사진 정보를 post_images에 저장
    // ========================================

    if (imagePaths.length > 0) {
        const imageRows =
            imagePaths.map(
                (
                    imagePath,
                    index
                ) => ({
                    post_id: post.id,
                    image_path:
                    imagePath,
                    sort_order:
                    index,
                })
            );

        const {
            error: imagesError,
        } = await supabase
            .from("post_images")
            .insert(imageRows);

        if (imagesError) {
            // post_images 저장 실패 시
            // 방금 만든 게시글도 제거한다.
            const {
                error: rollbackError,
            } = await supabase
                .from("posts")
                .delete()
                .eq(
                    "id",
                    post.id
                )
                .eq(
                    "user_id",
                    user.id
                );

            if (rollbackError) {
                console.error(
                    "게시글 롤백 실패:",
                    rollbackError
                );
            }

            throw new Error(
                imagesError.message
            );
        }
    }

    // ========================================
// 새 게시물 알림
//
// 같은 공간의 다른 멤버들에게
// 새 게시물 알림을 보낸다.
// 작성자 본인에게는 보내지 않는다.
// ========================================

    const {
        data: groupMembers,
        error: membersError,
    } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId)
        .neq("user_id", user.id);

    if (membersError) {
        console.error(
            "게시물 알림 대상 조회 실패:",
            membersError
        );
    } else if (
        groupMembers &&
        groupMembers.length > 0
    ) {
        const notificationRows =
            groupMembers.map(
                (member) => ({
                    user_id:
                    member.user_id,
                    actor_id:
                    user.id,
                    type: "post",
                    post_id:
                    post.id,
                })
            );

        const {
            error: notificationError,
        } = await supabase
            .from("notifications")
            .insert(
                notificationRows
            );

        if (notificationError) {
            console.error(
                "게시물 알림 생성 실패:",
                notificationError
            );
        }

        after(async () => {
            try {
                await sendPushToUsers(
                    groupMembers.map(
                        (member) =>
                            member.user_id
                    ),
                    "post",
                    {
                        title: "우리끼리",
                        body: "새 게시물이 올라왔어요.",
                        url: `/?group=${groupId}&post=${post.id}`,
                    }
                );
            } catch (pushError) {
                console.error(
                    "게시물 Push 발송 실패:",
                    pushError
                );
            }
        });
    }

    revalidatePath("/");


}


export async function toggleLike(
    postId: number
) {
    const supabase =
        await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error(
            "로그인이 필요합니다."
        );
    }

    if (
        !Number.isInteger(postId) ||
        postId <= 0
    ) {
        throw new Error(
            "잘못된 게시글입니다."
        );
    }

    // ========================================
    // 게시글 확인
    // ========================================

    const {
        data: post,
        error: postError,
    } = await supabase
        .from("posts")
        .select(
            "id, user_id, group_id"
        )
        .eq("id", postId)
        .maybeSingle();

    if (postError) {
        throw new Error(
            postError.message
        );
    }

    if (!post) {
        throw new Error(
            "게시글을 찾을 수 없습니다."
        );
    }

    // ========================================
    // 기존 좋아요 확인
    // ========================================

    const {
        data: existingLike,
        error: likeCheckError,
    } = await supabase
        .from("likes")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (likeCheckError) {
        throw new Error(
            likeCheckError.message
        );
    }

    // ========================================
    // 이미 좋아요 상태
    // → 좋아요 취소
    // ========================================

    if (existingLike) {
        const {
            error: deleteLikeError,
        } = await supabase
            .from("likes")
            .delete()
            .eq("post_id", postId)
            .eq(
                "user_id",
                user.id
            );

        if (deleteLikeError) {
            throw new Error(
                deleteLikeError.message
            );
        }

        // ========================================
        // 좋아요를 취소하면
        // 기존 앱 내부 알림도 제거
        //
        // Push는 절대 보내지 않는다.
        // ========================================

        if (
            post.user_id &&
            post.user_id !==
            user.id
        ) {
            const {
                error:
                    notificationError,
            } = await supabase
                .from(
                    "notifications"
                )
                .delete()
                .eq(
                    "user_id",
                    post.user_id
                )
                .eq(
                    "actor_id",
                    user.id
                )
                .eq(
                    "post_id",
                    postId
                )
                .eq(
                    "type",
                    "like"
                );

            if (
                notificationError
            ) {
                console.error(
                    "좋아요 알림 삭제 실패:",
                    notificationError
                );
            }
        }
    }

        // ========================================
        // 아직 좋아요하지 않은 상태
        // → 좋아요 추가
    // ========================================

    else {
        const {
            error: insertLikeError,
        } = await supabase
            .from("likes")
            .insert({
                post_id:
                postId,

                user_id:
                user.id,
            });

        if (insertLikeError) {
            throw new Error(
                insertLikeError.message
            );
        }

        // ========================================
        // 다른 사람의 게시글일 때만 알림
        // ========================================

        if (
            post.user_id &&
            post.user_id !==
            user.id
        ) {
            const {
                error:
                    notificationError,
            } = await supabase
                .from(
                    "notifications"
                )
                .insert({
                    user_id:
                    post.user_id,

                    actor_id:
                    user.id,

                    type:
                        "like",

                    post_id:
                    postId,
                });

            if (
                notificationError
            ) {
                console.error(
                    "좋아요 알림 생성 실패:",
                    notificationError
                );
            }

            // ========================================
            // 좋아요를 추가했을 때만 Push
            // ========================================

            after(async () => {
                try {
                    await sendPushToUsers(
                        [
                            post.user_id,
                        ],
                        "like",
                        {
                            title:
                                "우리끼리",

                            body:
                                "내 게시물에 좋아요가 달렸어요. ❤️",

                            url: `/?group=${post.group_id}&post=${post.id}`,
                        }
                    );
                } catch (
                    pushError
                    ) {
                    console.error(
                        "좋아요 Push 발송 실패:",
                        pushError
                    );
                }
            });
        }
    }

    revalidatePath("/");
    revalidatePath(
        "/notifications"
    );
}
export async function logout() {
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/");
}
export async function createComment(
    formData: FormData
) {
    const supabase =
        await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error(
            "로그인이 필요합니다."
        );
    }

    const postId = Number(
        formData.get("post_id")
    );

    const content = String(
        formData.get("content") ?? ""
    ).trim();

    const requestedParentId = Number(
        formData.get("parent_id") ?? 0
    );

    const requestedMentionUserIds = [
        ...new Set(
            formData
                .getAll(
                    "mention_user_ids"
                )
                .map((value) =>
                    String(value)
                )
                .filter(Boolean)
        ),
    ];

    if (
        !Number.isInteger(postId) ||
        postId <= 0
    ) {
        throw new Error(
            "잘못된 게시글입니다."
        );
    }

    if (
        !content ||
        content.length > 300
    ) {
        return;
    }

    // ========================================
    // 게시글 확인
    // ========================================

    const {
        data: post,
        error: postError,
    } = await supabase
        .from("posts")
        .select(
            "id, user_id, group_id"
        )
        .eq("id", postId)
        .maybeSingle();

    if (postError) {
        throw new Error(
            postError.message
        );
    }

    if (!post) {
        throw new Error(
            "게시글을 찾을 수 없습니다."
        );
    }

    // ========================================
    // 답글 대상 확인
    // ========================================

    let parentId:
        | number
        | null = null;

    let replyToUserId:
        | string
        | null = null;

    if (
        Number.isInteger(
            requestedParentId
        ) &&
        requestedParentId > 0
    ) {
        const {
            data: targetComment,
            error: targetError,
        } = await supabase
            .from("comments")
            .select(
                "id, post_id, user_id, parent_id"
            )
            .eq(
                "id",
                requestedParentId
            )
            .maybeSingle();

        if (targetError) {
            throw new Error(
                targetError.message
            );
        }

        if (
            !targetComment ||
            targetComment.post_id !==
            postId
        ) {
            throw new Error(
                "답글을 작성할 댓글을 찾을 수 없습니다."
            );
        }

        parentId =
            targetComment.parent_id ??
            targetComment.id;

        replyToUserId =
            targetComment.user_id ??
            null;
    }

    // ========================================
    // 직접 멘션 대상 검증
    //
    // 현재 공간의 멤버만 허용
    // ========================================

    let validMentionUserIds:
        string[] = [];

    if (
        requestedMentionUserIds.length >
        0
    ) {
        const {
            data: mentionedMembers,
            error:
                mentionedMembersError,
        } = await supabase
            .from("group_members")
            .select("user_id")
            .eq(
                "group_id",
                post.group_id
            )
            .in(
                "user_id",
                requestedMentionUserIds
            );

        if (
            mentionedMembersError
        ) {
            console.error(
                "멘션 사용자 확인 실패:",
                mentionedMembersError
            );
        } else {
            validMentionUserIds = [
                ...new Set(
                    (
                        mentionedMembers ??
                        []
                    )
                        .map(
                            (member) =>
                                member.user_id
                        )
                        .filter(
                            (
                                mentionedUserId
                            ) =>
                                mentionedUserId !==
                                user.id
                        )
                ),
            ];
        }
    }

    // ========================================
    // 댓글 저장
    // ========================================

    const {
        data: comment,
        error: commentError,
    } = await supabase
        .from("comments")
        .insert({
            post_id:
            postId,

            user_id:
            user.id,

            content,

            parent_id:
            parentId,

            reply_to_user_id:
            replyToUserId,
        })
        .select("id")
        .single();

    if (commentError) {
        throw new Error(
            commentError.message
        );
    }

    // ========================================
    // 실제 멘션 관계 저장
    // ========================================

    if (
        validMentionUserIds.length >
        0
    ) {
        const {
            error: mentionError,
        } = await supabase
            .from(
                "comment_mentions"
            )
            .insert(
                validMentionUserIds.map(
                    (
                        mentionedUserId
                    ) => ({
                        comment_id:
                        comment.id,

                        user_id:
                        mentionedUserId,
                    })
                )
            );

        if (mentionError) {
            console.error(
                "댓글 멘션 저장 실패:",
                mentionError
            );
        }
    }

    // ========================================
    // 알림 목록 생성
    //
    // Map<userId, type>
    //
    // 우선순위:
    // reply > mention > comment
    // ========================================

    const notificationMap =
        new Map<
            string,
            | "comment"
            | "reply"
            | "mention"
        >();

    // 일반 댓글
    if (
        !parentId &&
        post.user_id &&
        post.user_id !==
        user.id
    ) {
        notificationMap.set(
            post.user_id,
            "comment"
        );
    }

    // 답글
    if (
        parentId &&
        replyToUserId &&
        replyToUserId !==
        user.id
    ) {
        notificationMap.set(
            replyToUserId,
            "reply"
        );
    }

    // 직접 멘션
    for (
        const mentionedUserId of
        validMentionUserIds
        ) {
        if (
            mentionedUserId ===
            user.id
        ) {
            continue;
        }

        // 이미 답글 대상이면
        // reply를 유지한다.
        if (
            notificationMap.get(
                mentionedUserId
            ) === "reply"
        ) {
            continue;
        }

        notificationMap.set(
            mentionedUserId,
            "mention"
        );
    }

    const notificationEntries =
        Array.from(
            notificationMap.entries()
        );

    // ========================================
    // 앱 내부 알림
    // ========================================

    if (
        notificationEntries.length >
        0
    ) {
        const notificationRows =
            notificationEntries.map(
                ([
                     recipientUserId,
                     type,
                 ]) => ({
                    user_id:
                    recipientUserId,

                    actor_id:
                    user.id,

                    type,

                    post_id:
                    postId,

                    comment_id:
                    comment.id,
                })
            );

        const {
            error:
                notificationError,
        } = await supabase
            .from("notifications")
            .insert(
                notificationRows
            );

        if (
            notificationError
        ) {
            console.error(
                "댓글 알림 생성 실패:",
                notificationError
            );
        }
    }

    // ========================================
    // Push
    //
    // 기존 알림 설정의 comment_enabled를
    // 그대로 사용하기 위해 Push category는
    // comment로 유지한다.
    //
    // 수신자 종류별로 문구만 다르게 보낸다.
    // ========================================

    const commentRecipients =
        notificationEntries
            .filter(
                ([, type]) =>
                    type ===
                    "comment"
            )
            .map(
                ([userId]) =>
                    userId
            );

    const replyRecipients =
        notificationEntries
            .filter(
                ([, type]) =>
                    type ===
                    "reply"
            )
            .map(
                ([userId]) =>
                    userId
            );

    const mentionRecipients =
        notificationEntries
            .filter(
                ([, type]) =>
                    type ===
                    "mention"
            )
            .map(
                ([userId]) =>
                    userId
            );

    const pushUrl =
        `/?group=${post.group_id}&post=${postId}&comment=${comment.id}`;

    after(async () => {
        try {
            const pushTasks:
                Promise<unknown>[] = [];

            if (
                commentRecipients.length >
                0
            ) {
                pushTasks.push(
                    sendPushToUsers(
                        commentRecipients,
                        "comment",
                        {
                            title:
                                "우리끼리",

                            body:
                                "내 게시물에 새 댓글이 달렸어요. 💬",

                            url:
                            pushUrl,
                        }
                    )
                );
            }

            if (
                replyRecipients.length >
                0
            ) {
                pushTasks.push(
                    sendPushToUsers(
                        replyRecipients,
                        "comment",
                        {
                            title:
                                "우리끼리",

                            body:
                                "내 댓글에 답글이 달렸어요. 💬",

                            url:
                            pushUrl,
                        }
                    )
                );
            }

            if (
                mentionRecipients.length >
                0
            ) {
                pushTasks.push(
                    sendPushToUsers(
                        mentionRecipients,
                        "comment",
                        {
                            title:
                                "우리끼리",

                            body:
                                "댓글에서 회원님을 언급했어요. 💬",

                            url:
                            pushUrl,
                        }
                    )
                );
            }

            await Promise.all(
                pushTasks
            );
        } catch (pushError) {
            console.error(
                "댓글 Push 발송 실패:",
                pushError
            );
        }
    });

    revalidatePath("/");
    revalidatePath(
        "/notifications"
    );
}
export async function updatePost(formData: FormData) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("로그인이 필요합니다.");
    }

    const postId = Number(formData.get("post_id"));
    const content = String(
        formData.get("content") ?? ""
    ).trim();

    if (!Number.isInteger(postId) || postId <= 0) {
        throw new Error("잘못된 게시물입니다.");
    }

    if (content.length > 500) {
        throw new Error("게시글은 500자 이하로 작성해주세요.");
    }

    // 현재 게시물 확인
    const {
        data: post,
        error: postError,
    } = await supabase
        .from("posts")
        .select("id, user_id, group_id, image_path")
        .eq("id", postId)
        .single();

    if (postError || !post) {
        throw new Error("게시물을 찾을 수 없습니다.");
    }

    // Server Action에서도 작성자 확인
    if (post.user_id !== user.id) {
        throw new Error("본인의 게시물만 수정할 수 있습니다.");
    }

    // 사진도 없는데 글까지 비우는 것은 방지
    if (!content && !post.image_path) {
        throw new Error("내용이나 사진 중 하나는 있어야 합니다.");
    }

    const { error: updateError } = await supabase
        .from("posts")
        .update({
            content,
        })
        .eq("id", postId)
        .eq("user_id", user.id);

    if (updateError) {
        console.error(
            "게시물 수정 실패:",
            updateError
        );

        throw new Error("게시물을 수정하지 못했습니다.");
    }

    revalidatePath("/");
}

export async function deletePost(postId: number) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error(
            "로그인이 필요합니다."
        );
    }

    if (
        !Number.isInteger(postId) ||
        postId <= 0
    ) {
        throw new Error(
            "잘못된 게시글입니다."
        );
    }

    // ========================================
    // 내가 작성한 게시글인지 확인
    // ========================================

    const {
        data: post,
        error: findError,
    } = await supabase
        .from("posts")
        .select("id, user_id, image_path")
        .eq("id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (findError) {
        throw new Error(
            findError.message
        );
    }

    if (!post) {
        throw new Error(
            "삭제할 수 없는 게시글입니다."
        );
    }

    // ========================================
    // 이 게시글의 모든 사진 경로 조회
    // ========================================

    const {
        data: postImages,
        error: imagesError,
    } = await supabase
        .from("post_images")
        .select("image_path")
        .eq("post_id", postId);

    if (imagesError) {
        throw new Error(
            imagesError.message
        );
    }

    const imagePaths = Array.from(
        new Set(
            [
                ...(postImages ?? []).map(
                    (image) =>
                        image.image_path
                ),

                // 이전 구조의 게시물을 위한
                // 임시 호환 처리
                post.image_path,
            ].filter(
                (
                    path
                ): path is string =>
                    Boolean(path)
            )
        )
    );

    // ========================================
// DB 삭제 전에 Storage 사진부터 삭제
//
// Storage RLS가 posts / post_images를 이용해
// 삭제 권한을 확인할 수 있으므로
// 게시글이 존재할 때 먼저 사진을 삭제한다.
// ========================================

    if (imagePaths.length > 0) {
        const {
            error: imageDeleteError,
        } = await supabase.storage
            .from("post-images")
            .remove(imagePaths);

        if (imageDeleteError) {
            throw new Error(
                `게시글 사진 삭제에 실패했습니다: ${imageDeleteError.message}`
            );
        }
    }

// ========================================
// 사진 정리가 끝난 뒤 게시글 삭제
//
// post_images는 FK ON DELETE CASCADE로
// 함께 삭제됨
// ========================================

    const {
        error: deleteError,
    } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", user.id);

    if (deleteError) {
        throw new Error(
            deleteError.message
        );
    }

    revalidatePath("/");
}


export async function deleteComment(commentId: number) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("로그인이 필요합니다.");
    }

    // 자기 댓글만 삭제
    const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/");
}

export async function updateNickname(formData: FormData) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("로그인이 필요합니다.");
    }

    const nickname = String(
        formData.get("nickname") ?? ""
    ).trim();

    if (nickname.length < 2 || nickname.length > 20) {
        throw new Error("닉네임은 2~20자로 입력해주세요.");
    }

    const { error } = await supabase
        .from("profiles")
        .update({
            nickname: nickname,
        })
        .eq("id", user.id);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/");
}

export async function updateAvatar(formData: FormData) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("로그인이 필요합니다.");
    }

    const image = formData.get("avatar") as File | null;

    if (!image || image.size === 0) {
        return;
    }

    if (!image.type.startsWith("image/")) {
        throw new Error("이미지 파일만 업로드할 수 있습니다.");
    }

    if (image.size > 5 * 1024 * 1024) {
        throw new Error("프로필 사진은 5MB 이하만 가능합니다.");
    }

    // 현재 프로필 사진 경로 확인
    const { data: profile, error: profileError } =
        await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("id", user.id)
            .single();

    if (profileError) {
        throw new Error(profileError.message);
    }

    const oldAvatarPath = profile.avatar_url;

    // 새 사진 경로 생성
    const extension =
        image.name.split(".").pop() ?? "jpg";

    const newAvatarPath =
        `${user.id}/${crypto.randomUUID()}.${extension}`;

    // 새 사진 업로드
    const { error: uploadError } =
        await supabase.storage
            .from("avatars")
            .upload(newAvatarPath, image, {
                contentType: image.type,
                upsert: false,
            });

    if (uploadError) {
        throw new Error(uploadError.message);
    }

    // profiles에 새 사진 경로 저장
    const { error: updateError } =
        await supabase
            .from("profiles")
            .update({
                avatar_url: newAvatarPath,
            })
            .eq("id", user.id);

    if (updateError) {
        // DB 수정 실패 시 방금 올린 사진 정리
        await supabase.storage
            .from("avatars")
            .remove([newAvatarPath]);

        throw new Error(updateError.message);
    }

    // 이전 프로필 사진 삭제
    if (oldAvatarPath) {
        await supabase.storage
            .from("avatars")
            .remove([oldAvatarPath]);
    }

    revalidatePath("/");
}

// ========================================
// 그룹 만들기
// ========================================
// ========================================
// 그룹 만들기
// ========================================

export async function createGroup(
    formData: FormData
) {
    const supabase =
        await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error(
            "로그인이 필요합니다."
        );
    }

    const name = String(
        formData.get("name") ?? ""
    ).trim();

    if (
        !name ||
        name.length > 30
    ) {
        throw new Error(
            "그룹 이름은 1~30자로 입력해주세요."
        );
    }

    // ========================================
    // 안전한 RPC로 그룹 생성
    // 그룹 생성 + 방장 멤버 등록을
    // DB에서 한 번에 처리
    // ========================================

    const {
        error,
    } = await supabase.rpc(
        "create_group",
        {
            group_name: name,
        }
    );

    if (error) {
        throw new Error(
            error.message
        );
    }

    revalidatePath("/");
    revalidatePath("/settings");
}


// ========================================
// 초대코드로 그룹 참여
// ========================================
export async function joinGroup(
    formData: FormData
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("로그인이 필요합니다.");
    }

    const inviteCode = String(
        formData.get("invite_code") ?? ""
    )
        .trim()
        .toUpperCase();

    if (!inviteCode) {
        throw new Error(
            "초대코드를 입력해주세요."
        );
    }

    const { error } = await supabase.rpc(
        "join_group_by_invite_code",
        {
            code: inviteCode,
        }
    );

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/");
}

export async function leaveGroup(formData: FormData) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("로그인이 필요합니다.");
    }

    const groupId = Number(
        formData.get("group_id")
    );

    if (
        !Number.isInteger(groupId) ||
        groupId <= 0
    ) {
        throw new Error("잘못된 그룹입니다.");
    }

    // 그룹 정보 확인
    const {
        data: group,
        error: groupError,
    } = await supabase
        .from("groups")
        .select("id, owner_id")
        .eq("id", groupId)
        .maybeSingle();

    if (groupError) {
        throw new Error(groupError.message);
    }

    if (!group) {
        throw new Error(
            "그룹을 찾을 수 없습니다."
        );
    }

    // 방장은 바로 나갈 수 없게 막음
    if (group.owner_id === user.id) {
        throw new Error(
            "방장은 그룹에서 바로 나갈 수 없습니다."
        );
    }

    // 내 membership만 삭제
    const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/");
}

export async function updateGroupName(
    formData: FormData
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error(
            "로그인이 필요합니다."
        );
    }

    const groupId = Number(
        formData.get("group_id")
    );

    const name = String(
        formData.get("name") ?? ""
    ).trim();

    if (
        !Number.isInteger(groupId) ||
        groupId <= 0
    ) {
        throw new Error(
            "잘못된 그룹입니다."
        );
    }

    if (
        name.length < 1 ||
        name.length > 30
    ) {
        throw new Error(
            "그룹 이름은 1~30자로 입력해주세요."
        );
    }

    // 방장인지 먼저 확인
    const {
        data: group,
        error: groupError,
    } = await supabase
        .from("groups")
        .select("id, owner_id")
        .eq("id", groupId)
        .maybeSingle();

    if (groupError) {
        throw new Error(
            groupError.message
        );
    }

    if (!group) {
        throw new Error(
            "그룹을 찾을 수 없습니다."
        );
    }

    if (group.owner_id !== user.id) {
        throw new Error(
            "방장만 그룹 이름을 변경할 수 있습니다."
        );
    }

    const { error } = await supabase
        .from("groups")
        .update({
            name,
        })
        .eq("id", groupId)
        .eq("owner_id", user.id);

    if (error) {
        throw new Error(
            error.message
        );
    }

    revalidatePath("/");
}


// ========================================
// 그룹 삭제
// ========================================
// ========================================
// 그룹 삭제
// ========================================

export async function deleteGroup(
    formData: FormData
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error(
            "로그인이 필요합니다."
        );
    }

    const groupId = Number(
        formData.get("group_id")
    );

    const confirmName = String(
        formData.get("confirm_name") ?? ""
    ).trim();

    if (
        !Number.isInteger(groupId) ||
        groupId <= 0
    ) {
        throw new Error(
            "잘못된 그룹입니다."
        );
    }

    // ========================================
    // 그룹 정보 + 방장 확인
    // ========================================

    const {
        data: group,
        error: groupError,
    } = await supabase
        .from("groups")
        .select("id, name, owner_id")
        .eq("id", groupId)
        .maybeSingle();

    if (groupError) {
        throw new Error(
            groupError.message
        );
    }

    if (!group) {
        throw new Error(
            "그룹을 찾을 수 없습니다."
        );
    }

    if (group.owner_id !== user.id) {
        throw new Error(
            "방장만 그룹을 삭제할 수 있습니다."
        );
    }

    // ========================================
    // 그룹 이름 확인
    // ========================================

    if (confirmName !== group.name) {
        throw new Error(
            `그룹 이름 "${group.name}"을 정확히 입력해주세요.`
        );
    }

    // ========================================
// 그룹에 속한 게시글 ID + 기존 사진 경로 조회
// ========================================

    const {
        data: groupPosts,
        error: postsError,
    } = await supabase
        .from("posts")
        .select("id, image_path")
        .eq("group_id", groupId);

    if (postsError) {
        throw new Error(
            postsError.message
        );
    }

    const postIds =
        (groupPosts ?? []).map(
            (post) => post.id
        );

// ========================================
// post_images에 저장된 모든 사진 경로 조회
// ========================================

    let postImagePaths: string[] = [];

    if (postIds.length > 0) {
        const {
            data: postImages,
            error: imagesError,
        } = await supabase
            .from("post_images")
            .select("image_path")
            .in("post_id", postIds);

        if (imagesError) {
            throw new Error(
                imagesError.message
            );
        }

        postImagePaths =
            (postImages ?? [])
                .map(
                    (image) =>
                        image.image_path
                )
                .filter(Boolean);
    }

// ========================================
// 기존 posts.image_path도 임시 호환용으로 포함
// ========================================

    const legacyImagePaths =
        (groupPosts ?? [])
            .map(
                (post) =>
                    post.image_path
            )
            .filter(
                (
                    path
                ): path is string =>
                    Boolean(path)
            );

// 중복 사진 경로 제거
    const imagePaths = Array.from(
        new Set([
            ...postImagePaths,
            ...legacyImagePaths,
        ])
    );

// ========================================
// 그룹 삭제 전에 Storage의 모든 사진 삭제
// ========================================

    if (imagePaths.length > 0) {
        const {
            error: storageError,
        } = await supabase.storage
            .from("post-images")
            .remove(imagePaths);

        if (storageError) {
            throw new Error(
                `그룹 사진 정리에 실패했습니다: ${storageError.message}`
            );
        }
    }

    // ========================================
    // 사진 정리가 끝난 뒤 그룹 삭제
    //
    // FK ON DELETE CASCADE에 의해
    // group_members / posts 및 연결된
    // comments / likes도 함께 정리됨
    // ========================================

    const {
        error: deleteError,
    } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId)
        .eq("owner_id", user.id);

    if (deleteError) {
        throw new Error(
            deleteError.message
        );
    }

    revalidatePath("/");
    revalidatePath("/settings");
}

// ========================================
// 초대 링크로 그룹 참여
// ========================================

export async function joinGroupFromLink(
    formData: FormData
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error(
            "로그인이 필요합니다."
        );
    }

    const inviteCode = String(
        formData.get("invite_code") ?? ""
    )
        .trim()
        .toUpperCase();

    if (!inviteCode) {
        throw new Error(
            "잘못된 초대 링크입니다."
        );
    }

    const {
        data: groupId,
        error,
    } = await supabase.rpc(
        "join_group_by_invite_code",
        {
            code: inviteCode,
        }
    );

    if (error) {
        throw new Error(
            error.message
        );
    }

    if (!groupId) {
        throw new Error(
            "그룹을 찾을 수 없습니다."
        );
    }

    revalidatePath("/");
    revalidatePath("/settings");

    return groupId;
}
export async function markNotificationsAsRead() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("로그인이 필요합니다.");
    }

    const { error } = await supabase
        .from("notifications")
        .update({
            is_read: true,
        })
        .eq("user_id", user.id)
        .eq("is_read", false);

    if (error) {
        throw new Error(error.message);
    }
}

// ========================================
// 계정 탈퇴
// ========================================

export async function deleteAccount(
    formData: FormData
) {

    const confirmText = String(
        formData.get("confirm_text") ?? ""
    ).trim();

    if (confirmText !== "계정 탈퇴") {
        throw new Error(
            '"계정 탈퇴"를 정확히 입력해주세요.'
        );
    }

    const supabase = await createClient();

    // ========================================
    // 현재 로그인 사용자 확인
    // ========================================

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
        throw new Error(
            userError.message
        );
    }

    if (!user) {
        throw new Error(
            "로그인이 필요합니다."
        );
    }

    // ========================================
    // 방장인 그룹이 있는지 DB에서 확인
    //
    // true  = 탈퇴 가능
    // false = 방장 그룹이 있어서 탈퇴 불가
    // ========================================

    const {
        data: canDelete,
        error: checkError,
    } = await supabase.rpc(
        "can_delete_my_account"
    );

    if (checkError) {
        throw new Error(
            checkError.message
        );
    }

    if (!canDelete) {
        throw new Error(
            "방장으로 관리 중인 그룹이 있습니다. 해당 그룹을 먼저 삭제한 뒤 계정을 탈퇴해주세요."
        );
    }

    // ========================================
    // 현재 프로필 사진 경로 확인
    // ========================================

    const {
        data: profile,
        error: profileError,
    } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        throw new Error(
            profileError.message
        );
    }

    const avatarPath =
        profile?.avatar_url ?? null;

    // ========================================
    // 프로필 사진 삭제
    //
    // 게시글 사진은 삭제하지 않는다.
    // 게시글 자체를 기록으로 남기기 때문.
    // ========================================

    if (avatarPath) {
        const {
            error: avatarDeleteError,
        } = await supabase.storage
            .from("avatars")
            .remove([avatarPath]);

        if (avatarDeleteError) {
            throw new Error(
                `프로필 사진 삭제에 실패했습니다: ${avatarDeleteError.message}`
            );
        }
    }

    // ========================================
    // Auth 사용자 삭제
    //
    // 반드시 서버 전용 Secret key를 사용하는
    // Admin Client로 실행한다.
    // ========================================

    const admin =
        createAdminClient();

    const {
        error: deleteUserError,
    } = await admin.auth.admin.deleteUser(
        user.id
    );

    if (deleteUserError) {
        throw new Error(
            deleteUserError.message
        );
    }

    // auth.users 삭제
    //      ↓ CASCADE
    // profiles 삭제
    //
    // posts.user_id    → NULL
    // comments.user_id → NULL
    //
    // 좋아요 / 그룹 membership /
    // 관련 알림 등은 FK 정책에 따라 정리된다.

    // ========================================
    // 삭제된 사용자의 로그인 세션 정리
    //
    // Auth 사용자는 이미 삭제됐기 때문에
    // signOut 과정에서 오류가 발생하더라도
    // 계정 삭제 자체는 성공한 상태다.
    // ========================================

    const { error: signOutError } =
        await supabase.auth.signOut();

    if (signOutError) {
        console.error(
            "계정 삭제 후 세션 정리:",
            signOutError.message
        );
    }

    // ========================================
    // 로그인 화면으로 이동
    // ========================================

    redirect("/auth/login");

}
export async function savePushSubscription(
    subscription: {
        endpoint: string;
        keys: {
            p256dh: string;
            auth: string;
        };
    },
    userAgent?: string
) {
    const supabase =
        await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error(
            "로그인이 필요합니다."
        );
    }

    if (
        !subscription.endpoint ||
        !subscription.keys.p256dh ||
        !subscription.keys.auth
    ) {
        throw new Error(
            "잘못된 Push 구독 정보입니다."
        );
    }

    const {
        error,
    } = await supabase.rpc(
        "register_push_subscription",
        {
            p_endpoint:
            subscription.endpoint,

            p_p256dh:
            subscription.keys.p256dh,

            p_auth:
            subscription.keys.auth,

            p_user_agent:
                userAgent ?? null,
        }
    );

    if (error) {
        console.error(
            "푸시 구독 저장 실패:",
            error
        );

        throw new Error(
            "푸시 알림 등록에 실패했습니다."
        );
    }
}

export async function updateNotificationPreferences(
    preferences: {
        pushEnabled: boolean;
        postEnabled: boolean;
        likeEnabled: boolean;
        commentEnabled: boolean;
    }
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error(
            "로그인이 필요합니다."
        );
    }

    const { error } = await supabase
        .from("notification_preferences")
        .upsert(
            {
                user_id: user.id,
                push_enabled:
                preferences.pushEnabled,
                post_enabled:
                preferences.postEnabled,
                like_enabled:
                preferences.likeEnabled,
                comment_enabled:
                preferences.commentEnabled,
                updated_at:
                    new Date().toISOString(),
            },
            {
                onConflict: "user_id",
            }
        );

    if (error) {
        console.error(
            "알림 설정 저장 실패:",
            error
        );

        throw new Error(
            "알림 설정을 저장하지 못했습니다."
        );
    }

    revalidatePath("/settings");
}

export async function updateGroupOrder(
    groupIds: number[]
) {
    const supabase =
        await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error(
            "로그인이 필요합니다."
        );
    }

    if (
        !Array.isArray(groupIds) ||
        groupIds.length === 0
    ) {
        return;
    }

    const uniqueIds = [
        ...new Set(groupIds),
    ];

    if (
        uniqueIds.length !==
        groupIds.length
    ) {
        throw new Error(
            "잘못된 공간 순서입니다."
        );
    }

    const {
        data: memberships,
        error: membershipError,
    } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

    if (membershipError) {
        throw new Error(
            membershipError.message
        );
    }

    const myGroupIds = new Set(
        (memberships ?? []).map(
            (membership) =>
                membership.group_id
        )
    );

    if (
        groupIds.length !==
        myGroupIds.size ||
        groupIds.some(
            (groupId) =>
                !myGroupIds.has(groupId)
        )
    ) {
        throw new Error(
            "내 공간만 정렬할 수 있습니다."
        );
    }

    for (
        let index = 0;
        index < groupIds.length;
        index++
    ) {
        const {
            error,
        } = await supabase
            .from("group_members")
            .update({
                sort_order: index,
            })
            .eq(
                "user_id",
                user.id
            )
            .eq(
                "group_id",
                groupIds[index]
            );

        if (error) {
            throw new Error(
                error.message
            );
        }
    }

    revalidatePath("/");
    revalidatePath("/settings");
}