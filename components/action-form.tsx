"use client";

import { useActionState } from "react";
import { initialFormState, type FormState } from "@/lib/form-state";

/**
 * 서버 액션 래퍼(app/form-actions.ts)를 쓰는 폼.
 * 처리 결과 메시지를 폼 아래에 보여주고, 처리 중에는 버튼을 막는다.
 */
export function ActionForm({
    action,
    className,
    children,
}: {
    action: (state: FormState, formData: FormData) => Promise<FormState>;
    className?: string;
    children: React.ReactNode;
}) {
    const [state, formAction, isPending] = useActionState(
        action,
        initialFormState
    );

    return (
        <form action={formAction} className={className}>
            <fieldset
                disabled={isPending}
                className="contents"
                aria-busy={isPending}
            >
                {children}
            </fieldset>

            {state.message && (
                <p
                    key={state.at}
                    role={state.status === "error" ? "alert" : "status"}
                    className={
                        state.status === "error"
                            ? "mt-2 text-[11px] font-bold leading-5 text-red-500"
                            : "mt-2 text-[11px] font-bold leading-5 text-gray-500"
                    }
                >
                    {state.message}
                </p>
            )}
        </form>
    );
}
