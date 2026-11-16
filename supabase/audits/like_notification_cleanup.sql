-- ============================================================
-- 좋아요 알림 정리 점검 (읽기 전용, SELECT만 포함)
--
-- migrations/20261116090000_like_notification_cleanup.sql 을 적용하면
-- 지워질 알림 건수를 미리 센다.
--   stale_like_notifications     : 좋아요가 취소됐는데 남은 알림
--   duplicate_like_notifications : 같은 사람·같은 게시물 알림 중 최신 1건을 뺀 나머지
--                                  (stale에 이미 포함된 것은 제외)
--   affected_recipients          : 영향을 받는 받는 사람 수
--
-- 실행: Supabase 대시보드 > SQL Editor (운영 DB에 쓰기 작업 없음)
-- 이 파일은 migrations 폴더 밖에 있어 `supabase db push`로 적용되지 않는다.
-- ============================================================

with likes_noti as (
    select
        n.id,
        n.user_id,
        n.actor_id,
        n.post_id,
        n.created_at,
        exists (
            select 1
            from public.likes l
            where l.post_id = n.post_id
              and l.user_id = n.actor_id
        ) as like_exists,
        row_number() over (
            partition by n.user_id, n.actor_id, n.post_id
            order by n.created_at desc, n.id desc
        ) as rn
    from public.notifications n
    where n.type = 'like'
)
select
    count(*) filter (where not like_exists)            as stale_like_notifications,
    count(*) filter (where like_exists and rn > 1)     as duplicate_like_notifications,
    count(distinct user_id) filter (
        where not like_exists or rn > 1
    )                                                  as affected_recipients,
    count(*)                                           as total_like_notifications
from likes_noti;
