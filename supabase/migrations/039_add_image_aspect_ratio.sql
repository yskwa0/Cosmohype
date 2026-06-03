alter table posts
  add column if not exists image_aspect_ratio text
    check (image_aspect_ratio in ('1:1', '4:5', '16:9'));

comment on column posts.image_aspect_ratio is '投稿画像の表示比率。null=自然比率（既存投稿）、1:1/4:5/16:9=ユーザー選択比率';
