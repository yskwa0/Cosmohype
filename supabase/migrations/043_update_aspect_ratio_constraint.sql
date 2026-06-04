-- image_aspect_ratio の check 制約に '4:3' を追加
-- 自動判定で 4:3 比率が使われるようになるため

alter table public.posts
  drop constraint if exists posts_image_aspect_ratio_check;

alter table public.posts
  add constraint posts_image_aspect_ratio_check
    check (image_aspect_ratio in ('1:1', '4:5', '4:3', '16:9'));

comment on column posts.image_aspect_ratio is '投稿画像の表示比率。null=既存投稿フォールバック、1:1/4:5/4:3/16:9=自動判定比率';
