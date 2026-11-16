/**
 * A7: 게시물별 "보내는 중인 내 댓글 수" 기록장 (브라우저 전용)
 *
 * 댓글 목록은 보내는 중인 임시 댓글을 바로 보여주지만, 게시물의 댓글 수
 * 숫자는 서버가 보낸 개수만 알아서 응답이 올 때까지 늦게 올랐다.
 * 댓글 영역이 여기에 보내는 중인 수를 적고, 숫자(CommentCount)는
 * "서버 댓글 수 + 보내는 중인 수"를 보여준다.
 */

type Listener = () => void;

export function createPendingCommentStore() {
    const counts = new Map<number, number>();
    const listeners = new Set<Listener>();

    return {
        set(postId: number, count: number) {
            const next = Math.max(0, count);
            const current = counts.get(postId) ?? 0;

            if (current === next) {
                return;
            }

            if (next === 0) {
                counts.delete(postId);
            } else {
                counts.set(postId, next);
            }

            listeners.forEach((listener) => listener());
        },

        get(postId: number): number {
            return counts.get(postId) ?? 0;
        },

        subscribe(listener: Listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
}

export const pendingComments = createPendingCommentStore();
