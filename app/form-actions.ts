"use server";

import { redirect } from "next/navigation";
import { runFormAction, type FormState } from "@/lib/form-state";
import {
    createGroup,
    deleteAccount,
    deleteGroup,
    joinGroup,
    joinGroupFromLink,
    leaveGroup,
    regenerateInviteCode,
    updateGroupName,
    updateNickname,
} from "./actions";

/**
 * 폼(useActionState)용 서버 액션 래퍼.
 * 오류를 서버에서 잡아 메시지를 FormState로 돌려준다 (lib/form-state.ts 참고).
 */

export async function updateNicknameForm(
    _prev: FormState,
    formData: FormData
) {
    return runFormAction(() => updateNickname(formData), "닉네임을 바꿨어요.");
}

export async function regenerateInviteCodeForm(
    _prev: FormState,
    formData: FormData
) {
    return runFormAction(
        () => regenerateInviteCode(formData),
        "새 초대코드를 만들었어요. 이전 코드는 이제 사용할 수 없어요."
    );
}

export async function updateGroupNameForm(
    _prev: FormState,
    formData: FormData
) {
    return runFormAction(() => updateGroupName(formData), "공간 이름을 바꿨어요.");
}

export async function deleteGroupForm(
    _prev: FormState,
    formData: FormData
) {
    return runFormAction(() => deleteGroup(formData), "공간을 삭제했어요.");
}

export async function leaveGroupForm(
    _prev: FormState,
    formData: FormData
) {
    return runFormAction(() => leaveGroup(formData), "공간에서 나왔어요.");
}

export async function createGroupForm(
    _prev: FormState,
    formData: FormData
) {
    return runFormAction(() => createGroup(formData), "새 공간을 만들었어요.");
}

export async function joinGroupForm(
    _prev: FormState,
    formData: FormData
) {
    return runFormAction(() => joinGroup(formData), "공간에 참여했어요.");
}

export async function deleteAccountForm(
    _prev: FormState,
    formData: FormData
) {
    // 성공하면 deleteAccount 안에서 redirect()가 일어난다.
    return runFormAction(() => deleteAccount(formData));
}

/** 초대 링크 화면: 참여에 성공하면 그 공간으로 이동 */
export async function joinGroupFromLinkForm(
    _prev: FormState,
    formData: FormData
) {
    const joined: { groupId: number | null } = { groupId: null };

    const state = await runFormAction(async () => {
        joined.groupId = await joinGroupFromLink(formData);
    });

    if (state.status === "success" && joined.groupId) {
        redirect(`/?group=${joined.groupId}`);
    }

    return state;
}
