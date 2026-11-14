-- ============================================================
-- S1: 사진 경로 소유권 검증
--
-- 문제
--   posts.image_path / post_images.image_path에 아무 경로나 저장할 수 있었고,
--   can_access_post_image / can_delete_post_image는 "그 경로를 가진 게시물"만
--   찾았다. 그래서 남의 사진 경로를 자기 공간의 게시물에 심으면
--   그 공간의 방장 자격으로 원본을 삭제하거나, 원래 공간을 나간 뒤에도
--   계속 열람할 수 있었다.
--
-- 수정
--   1) 쓰기 차단: 게시물 작성자는 자기 폴더(auth.uid()/...) 경로만 저장할 수 있다.
--   2) 읽기·삭제 판단 강화: 경로 폴더의 주인이 게시물 작성자와 같을 때만
--      권한을 인정한다. 수정 전에 이미 심어진 행이 있어도 무력화된다.
--   3) 방장 삭제 권한이 post_images(2장째 이후 사진)에도 적용되도록 한다.
--      (기존에는 posts.image_path만 확인해 공간 삭제 시 사진이 남았다)
-- ============================================================

-- 경로 첫 폴더가 주어진 사용자와 같은지
CREATE OR REPLACE FUNCTION public.storage_path_owned_by (
  target_path text,
  target_user_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
    select
        target_path is not null
        and target_user_id is not null
        and split_part(target_path, '/', 1) = target_user_id::text
        and position('/' in target_path) > 0;
$function$;

-- ------------------------------------------------------------
-- 1) 쓰기 정책
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "group members can create own posts" ON public.posts;
CREATE POLICY "group members can create own posts" ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND public.is_group_member(group_id)
    AND (
      image_path IS NULL
      OR public.storage_path_owned_by(image_path, (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "users can update own group posts" ON public.posts;
CREATE POLICY "users can update own group posts" ON public.posts
  FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = user_id
    AND public.is_group_member(group_id)
  )
  WITH CHECK (
    (select auth.uid()) = user_id
    AND public.is_group_member(group_id)
    AND (
      image_path IS NULL
      OR public.storage_path_owned_by(image_path, (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "post owners can insert post images" ON public.post_images;
CREATE POLICY "post owners can insert post images" ON public.post_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.storage_path_owned_by(image_path, (select auth.uid()))
    AND EXISTS (
      SELECT 1
      FROM public.posts
      WHERE posts.id = post_images.post_id
        AND posts.user_id = (select auth.uid())
        AND public.is_group_member(posts.group_id)
    )
  );

-- ------------------------------------------------------------
-- 2) 열람 판단: 경로 주인 = 게시물 작성자일 때만 인정
--    탈퇴한 작성자(user_id IS NULL)의 게시물은 공간 기록으로 남기므로
--    기존처럼 공간 멤버에게 계속 보인다.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_access_post_image (
  target_path text
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
    select
        exists (
            select 1
            from public.posts p
            join public.group_members gm
              on gm.group_id = p.group_id
            where p.image_path = target_path
              and gm.user_id = auth.uid()
              and (
                  p.user_id is null
                  or public.storage_path_owned_by(target_path, p.user_id)
              )
        )
        or
        exists (
            select 1
            from public.post_images pi
            join public.posts p
              on p.id = pi.post_id
            join public.group_members gm
              on gm.group_id = p.group_id
            where pi.image_path = target_path
              and gm.user_id = auth.uid()
              and (
                  p.user_id is null
                  or public.storage_path_owned_by(target_path, p.user_id)
              )
        );
$function$;

-- ------------------------------------------------------------
-- 3) 삭제 판단
--    - 사진을 올린 본인
--    - 그 사진이 실제로 속한 게시물(작성자 = 경로 주인)이 있는 공간의 방장
--      posts.image_path(구 구조)와 post_images(다중 사진) 모두 확인
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_delete_post_image (
  target_path text
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
    select
        public.storage_path_owned_by(target_path, auth.uid())

        or exists (
            select 1
            from public.posts p
            join public.groups g
              on g.id = p.group_id
            where p.image_path = target_path
              and g.owner_id = auth.uid()
              and (
                  p.user_id is null
                  or public.storage_path_owned_by(target_path, p.user_id)
              )
        )

        or exists (
            select 1
            from public.post_images pi
            join public.posts p
              on p.id = pi.post_id
            join public.groups g
              on g.id = p.group_id
            where pi.image_path = target_path
              and g.owner_id = auth.uid()
              and (
                  p.user_id is null
                  or public.storage_path_owned_by(target_path, p.user_id)
              )
        );
$function$;
