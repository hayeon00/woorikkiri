-- ============================================================
-- 좋아요 알림 정리
--
-- 문제
--   - notifications DELETE 정책은 받는 사람(user_id = auth.uid())만 허용한다.
--     그래서 좋아요를 취소한 사람이 알림을 지우려던 앱 코드는 늘 0행을
--     지우고 조용히 넘어갔다. → 좋아요를 취소해도 "좋아했어요" 알림이 남음.
--   - 같은 (받는 사람, 보낸 사람, 게시물) 좋아요 알림이 여러 건 허용됐다.
--     → 좋아요·취소를 반복하면 알림이 쌓이고, 좋아요를 누른 상태에서는
--       REST로 알림을 원하는 만큼 넣을 수 있었다 (S2 정책은 "지금 좋아요가
--       있는지"만 확인).
--
-- 수정
--   1) 좋아요가 없는데 남아 있는 like 알림을 지운다.
--   2) 중복된 like 알림은 가장 최근 1건만 남긴다.
--   3) (user_id, actor_id, post_id)당 like 알림 1건만 허용 (부분 유일 인덱스).
--   4) likes 행이 지워지면 DB가 해당 like 알림을 지운다 (트리거).
--      사용자의 알림 삭제 권한은 넓히지 않는다.
--
-- 적용 전 영향 건수 확인: supabase/audits/like_notification_cleanup.sql
-- ============================================================

-- 정리·인덱스·트리거를 한 번에 적용한다 (중간에 실패하면 전부 취소).
-- Supabase CLI는 마이그레이션을 자동으로 트랜잭션으로 묶지 않는다.
BEGIN;

-- 정리와 인덱스 생성 사이에 새 중복이 생기지 않도록 쓰기를 잠깐 막는다.
LOCK TABLE public.notifications IN SHARE ROW EXCLUSIVE MODE;

-- ------------------------------------------------------------
-- 1) 좋아요가 취소됐는데 남은 알림
-- ------------------------------------------------------------

DELETE FROM public.notifications n
WHERE n.type = 'like'
  AND NOT EXISTS (
      SELECT 1
      FROM public.likes l
      WHERE l.post_id = n.post_id
        AND l.user_id = n.actor_id
  );

-- ------------------------------------------------------------
-- 2) 중복 알림: 가장 최근(created_at, id) 1건만 남긴다
-- ------------------------------------------------------------

DELETE FROM public.notifications n
USING public.notifications newer
WHERE n.type = 'like'
  AND newer.type = 'like'
  AND newer.user_id = n.user_id
  AND newer.actor_id = n.actor_id
  AND newer.post_id = n.post_id
  AND (newer.created_at, newer.id) > (n.created_at, n.id);

-- ------------------------------------------------------------
-- 3) 좋아요 알림은 한 건만
-- ------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS notifications_like_once_idx
  ON public.notifications (user_id, actor_id, post_id)
  WHERE type = 'like';

-- ------------------------------------------------------------
-- 4) 좋아요가 지워지면 그 알림도 지운다
--
-- 앱의 좋아요 취소뿐 아니라 게시물 삭제·탈퇴 등 likes가 지워지는
-- 모든 경로에 적용된다. SECURITY DEFINER라 RLS와 무관하게 동작하지만
-- 지우는 대상은 "지워진 좋아요와 같은 사람·같은 게시물의 like 알림"뿐이다.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_like_notification()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
    delete from public.notifications
    where type = 'like'
      and actor_id = old.user_id
      and post_id = old.post_id;

    return old;
end;
$function$;

-- 트리거 전용 함수: RPC로 직접 부를 수 없게 한다.
REVOKE ALL ON FUNCTION public.delete_like_notification()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS likes_delete_notification ON public.likes;
CREATE TRIGGER likes_delete_notification
  AFTER DELETE ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_like_notification();

COMMIT;
