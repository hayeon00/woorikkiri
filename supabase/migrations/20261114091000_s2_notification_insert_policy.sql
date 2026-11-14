-- ============================================================
-- S2: 알림 생성 권한
--
-- 문제
--   notifications INSERT 정책이 "행위자가 그 게시물 공간의 멤버인지"만 확인했다.
--   그래서 REST API를 직접 호출하면 UUID를 아는 누구에게나(공간 밖 사용자 포함)
--   어떤 종류의 알림이든 만들 수 있었다.
--
-- 수정
--   알림 종류별로, 앱(서버 액션)이 실제로 알림을 만드는 조건과 같은 사실이
--   DB에 존재할 때만 INSERT를 허용한다.
--     - 공통: 행위자 = 나, 받는 사람 ≠ 나, 둘 다 게시물 공간의 멤버
--     - post:    내가 그 게시물의 작성자
--     - like:    받는 사람이 게시물 작성자이고, 내가 그 게시물에 좋아요를 눌렀음
--     - comment: 그 게시물에 내가 쓴 최상위 댓글이 있고, 받는 사람이 게시물 작성자
--     - reply:   그 게시물에 내가 쓴 답글이 있고, 받는 사람이 답글 대상
--     - mention: 그 게시물에 내가 쓴 댓글이 있고, 받는 사람이 그 댓글에 멘션됨
--
-- 순서 의존성 (app/actions.ts에서 확인)
--   like 알림은 likes INSERT 뒤에, 댓글 계열 알림은 comments·comment_mentions
--   INSERT 뒤에 만들어지므로 이 검사와 충돌하지 않는다.
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_create_notification (
  p_user_id    uuid,
  p_actor_id   uuid,
  p_type       text,
  p_post_id    bigint,
  p_comment_id bigint
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
    with ctx as (
        select p.id, p.user_id as author_id, p.group_id
        from public.posts p
        where p.id = p_post_id
    )
    select
        p_actor_id = auth.uid()
        and p_user_id is not null
        and p_user_id <> auth.uid()

        -- 행위자와 받는 사람이 모두 게시물 공간의 멤버
        and exists (
            select 1
            from ctx
            join public.group_members me
              on me.group_id = ctx.group_id and me.user_id = auth.uid()
            join public.group_members them
              on them.group_id = ctx.group_id and them.user_id = p_user_id
        )

        and case p_type
            when 'post' then
                p_comment_id is null
                and exists (
                    select 1 from ctx where ctx.author_id = auth.uid()
                )

            when 'like' then
                p_comment_id is null
                and exists (
                    select 1 from ctx where ctx.author_id = p_user_id
                )
                and exists (
                    select 1
                    from public.likes l
                    where l.post_id = p_post_id
                      and l.user_id = auth.uid()
                )

            when 'comment' then
                exists (
                    select 1
                    from public.comments c
                    join ctx on ctx.id = c.post_id
                    where c.id = p_comment_id
                      and c.user_id = auth.uid()
                      and c.parent_id is null
                      and ctx.author_id = p_user_id
                )

            when 'reply' then
                exists (
                    select 1
                    from public.comments c
                    where c.id = p_comment_id
                      and c.post_id = p_post_id
                      and c.user_id = auth.uid()
                      and c.parent_id is not null
                      and c.reply_to_user_id = p_user_id
                )

            when 'mention' then
                exists (
                    select 1
                    from public.comments c
                    join public.comment_mentions cm
                      on cm.comment_id = c.id
                    where c.id = p_comment_id
                      and c.post_id = p_post_id
                      and c.user_id = auth.uid()
                      and cm.user_id = p_user_id
                )

            else false
        end;
$function$;

REVOKE ALL ON FUNCTION public.can_create_notification(uuid, uuid, text, bigint, bigint)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_create_notification(uuid, uuid, text, bigint, bigint)
  TO authenticated;

DROP POLICY IF EXISTS "users can create notifications" ON public.notifications;
CREATE POLICY "users can create notifications" ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_create_notification(user_id, actor_id, type, post_id, comment_id)
  );
