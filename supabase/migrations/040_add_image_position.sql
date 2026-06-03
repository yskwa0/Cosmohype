alter table post_images
  add column if not exists position_x float8 not null default 0.5,
  add column if not exists position_y float8 not null default 0.5;

comment on column post_images.position_x is '画像の水平表示位置 (0.0=左端 / 0.5=中央 / 1.0=右端)。object-position に使用';
comment on column post_images.position_y is '画像の垂直表示位置 (0.0=上端 / 0.5=中央 / 1.0=下端)。object-position に使用';
