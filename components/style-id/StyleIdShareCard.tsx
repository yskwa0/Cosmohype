'use client'
import { StyleAlien } from './StyleAlien'
import type { StyleId, StyleType } from '@/lib/style-id/types'

interface Props {
  styleId: StyleId
  primary: StyleType
}

export function StyleIdShareCard({ styleId, primary }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/*
        親コンテナ(px-5)のpadding分をネガティブマージンで打ち消して全幅表示。
        上下に var(--bg) へのフェードをかけてページ背景と自然に馴染ませる。
      */}
      <div
        className="relative overflow-hidden -mx-5"
        style={{
          aspectRatio: '9 / 16',
          background: primary.gradient,
        }}
      >
        {/* 上部フェード — ページ背景色へブレンド */}
        <div
          className="absolute inset-x-0 top-0 z-10 pointer-events-none"
          style={{
            height: '90px',
            background: 'linear-gradient(to bottom, var(--bg) 0%, transparent 100%)',
          }}
        />

        {/* 下部フェード — ページ背景色へブレンド */}
        <div
          className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
          style={{
            height: '110px',
            background: 'linear-gradient(to top, var(--bg) 0%, transparent 100%)',
          }}
        />

        {/* 中央ビネット */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.5) 100%)' }}
        />

        {/* コンテンツ */}
        <div className="absolute inset-0 flex flex-col items-center justify-between py-20 px-8 z-20">
          {/* 上部ラベル */}
          <p
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            ✦ STYLE ID ✦
          </p>

          {/* エイリアン＋テキスト */}
          <div className="flex flex-col items-center gap-4">
            <StyleAlien styleId={styleId} size={150} />
            <div className="text-center">
              <p className="text-3xl font-black text-white tracking-tight leading-tight">
                {primary.name}
              </p>
              <p className="text-base mt-2" style={{ color: 'rgba(255,255,255,0.72)' }}>
                {primary.subtitle}
              </p>
            </div>
          </div>

          {/* ロゴ */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cosmohypewh.png"
              alt="Cosmohype"
              style={{ width: '108px', height: 'auto', opacity: 0.65 }}
            />
          </div>
        </div>
      </div>

      {/* スクショ案内 */}
      <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        この画面をスクショして<br />診断結果をシェアしよう 📸
      </p>
    </div>
  )
}
