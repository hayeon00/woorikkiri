"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
export async function createPost(formData: FormData) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("로그인이 필요합니다.");
    }

    const content = String(
        formData.get("content") ?? ""
    ).trim();

    const imagePathValue = String(
        formData.get("image_path") ?? ""
    ).trim();

    const imagePath =
        imagePathValue || null;

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
    if (!content && !imagePath) {
        throw new Error(
            "글이나 사진을 추가해주세요."
        );
    }

    if (content.length > 500) {
        throw new Error(
            "글은 500자 이하로 입력해주세요."
        );
    }

    // 다른 사용자의 Storage 경로를
    // 임의로 저장하지 못하도록 검사
    if (
        imagePath &&
        !imagePath.startsWith(
            `${user.id}/`
        )
    ) {
        throw new Error(
            "잘못된 사진 경로입니다."
        );
    }

    // 게시글 저장
    const { error } = await supabase
        .from("posts")
        .insert({
            user_id: user.id,
            group_id: groupId,
            content,
            image_path: imagePath,
        });

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/");
}

export async function toggleLike(postId: number) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("로그인이 필요합니다.");
    }

    // 내가 이미 이 글에 좋아요를 눌렀는지 확인
    const { data: existingLike } = await supabase
        .from("likes")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (existingLike) {

        // 이미 눌렀다면 → 좋아요 취소
        const { error } = await supabase
            .from("likes")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", user.id);

        if (error) {
            throw new Error(error.message);
        }

    } else {

        // 아직 안 눌렀다면 → 좋아요 추가
        const { error } = await supabase
            .from("likes")
            .insert({
                post_id: postId,
                user_id: user.id,
            });

        if (error) {
            throw new Error(error.message);
        }
    }

    revalidatePath("/");
}

export async function logout() {
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/");
}

export async function createComment(formData: FormData) {
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
        throw new Error("잘못된 게시글입니다.");
    }

    if (!content || content.length > 300) {
        return;
    }

    const { error } = await supabase
        .from("comments")
        .insert({
            post_id: postId,
            user_id: user.id,
            content,
        });

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/");
}

export async function deletePost(postId: number) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("로그인이 필요합니다.");
    }

    // 내가 작성한 게시글인지 확인 + 사진 경로 가져오기
    const { data: post, error: findError } = await supabase
        .from("posts")
        .select("id, user_id, image_path")
        .eq("id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (findError) {
        throw new Error(findError.message);
    }

    if (!post) {
        throw new Error("삭제할 수 없는 게시글입니다.");
    }

    // 게시글 삭제
    const { error: deleteError } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", user.id);

    if (deleteError) {
        throw new Error(deleteError.message);
    }

    // 게시글에 사진이 있었다면 Storage에서도 삭제
    if (post.image_path) {
        const { error: imageDeleteError } =
            await supabase.storage
                .from("post-images")
                .remove([post.image_path]);

        if (imageDeleteError) {
            console.error(
                "게시글은 삭제됐지만 사진 삭제 실패:",
                imageDeleteError
            );
        }
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
    // 그룹 게시글 사진 경로 조회
    // ========================================

    const {
        data: groupPosts,
        error: postsError,
    } = await supabase
        .from("posts")
        .select("image_path")
        .eq("group_id", groupId);

    if (postsError) {
        throw new Error(
            postsError.message
        );
    }

    const imagePaths =
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

    // ========================================
    // 중요:
    // 그룹을 삭제하기 전에 Storage 사진 삭제
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