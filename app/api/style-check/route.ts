import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI機能が設定されていません' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const JST_OFFSET_MS = 9 * 60 * 60 * 1000
  const nowJst = new Date(Date.now() + JST_OFFSET_MS)
  const todayStart = new Date(
    Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth(), nowJst.getUTCDate()) - JST_OFFSET_MS
  )

  const { data: existing } = await supabase
    .from('style_diagnoses')
    .select('result')
    .eq('user_id', user.id)
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ result: existing.result, cached: true })
  }

  let body: { imageBase64?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  }

  const { imageBase64 } = body
  if (!imageBase64 || typeof imageBase64 !== 'string' || !imageBase64.startsWith('data:image/')) {
    return NextResponse.json({ error: '画像データが正しくありません' }, { status: 400 })
  }

  let openaiRes: Response
  try {
    openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'あなたはポジティブなファッションスタイリストです。アップロードされた画像を見て、必ず以下のJSONフォーマットだけで回答してください。\n\n【is_fashion を false にするケース】\n- ファッション要素（トップス・ボトムス・アウター・シューズ・バッグ・アクセサリーなど）が写っていない\n- 服が小さすぎる・暗すぎる・ブレている・大部分が隠れていてコーデを判断できない\n- 露出が多い・性的または不適切な内容が含まれる\n- 食べ物・風景・動物・文字のみなど、ファッション要素が確認できない\n上記以外でファッション要素が確認できる場合は is_fashion を true にする（全身でなくてもOK）。\n\n【主役の特定と人数カウント】\n画像全体を見て、最も大きく・前に写っている主役の人物を特定する。背景に映り込んでいる人・小さく写っている人は診断対象に含めない。主役と判断できる前景の人物が1〜3人いる場合はその全員を診断対象とし、その人数を person_count に入れる。背景のみに人がいて主役不明の場合や主役が4人以上の場合は person_count を4とする。\n\n【診断ルール（is_fashion が true かつ person_count が 1〜3 の場合のみ）】\n顔・体型・年齢・性別・容姿には絶対に触れない。ブランド名は断定しない（「〜系」「〜風」はOK）。上から目線・ダメ出し・比較・順位づけは厳禁。前向きでワクワクする表現を使う。NG例：「似合っていない」「残念」「微妙」「ダメ」。\n位置指定：1人→position=""、2人→"左"/"右"、3人→"左"/"中央"/"右"\n\n【各 diagnosis フィールド（全エントリに含める）】\ngood_points: コーデの好きなポイント・素敵な部分を2〜3つ。各30〜50文字。\nimprove_points: 次のチャレンジとして試すと更に素敵になるヒントを1〜2つ（前向きに）。各30〜50文字。\nnext_items: 相性の良いアイテム名を2〜3つ。各5〜15文字（例："ローファー","レザートート","チェック柄スカーフ"）。\ncolor_advice: 色合わせ・シルエット・バランスへの前向きなアドバイス。40〜70文字。\n\npost_comment: SNS投稿用のひとこと（絵文字1〜2個含む・40〜60文字）。diagnoses の外にトップレベルのフィールドとして1つだけ含める。\n\n出力JSON形式:\n{"is_fashion":true/false,"person_count":0〜4,"post_comment":"...","diagnoses":[{"position":"","good_points":["...","..."],"improve_points":["..."],"next_items":["...","..."],"color_advice":"..."}]}',
              },
              {
                type: 'image_url',
                image_url: { url: imageBase64, detail: 'low' },
              },
            ],
          },
        ],
      }),
    })
  } catch {
    return NextResponse.json({ error: 'AI診断に失敗しました。もう一度お試しください。' }, { status: 500 })
  }

  if (!openaiRes.ok) {
    const errBody = await openaiRes.json().catch(() => ({}))
    console.error('OpenAI API error:', errBody)
    return NextResponse.json({ error: 'AI診断に失敗しました。もう一度お試しください。' }, { status: 500 })
  }

  const openaiData = await openaiRes.json()
  const rawContent: string = openaiData.choices?.[0]?.message?.content ?? '{}'

  type DiagnosisEntry = { position: string; good_points: string[]; improve_points: string[]; next_items: string[]; color_advice: string }
  let parsed: { is_fashion?: boolean; person_count?: number; post_comment?: string; diagnoses?: DiagnosisEntry[] }
  try {
    parsed = JSON.parse(rawContent)
  } catch {
    parsed = {}
  }

  if (!parsed.is_fashion) {
    return NextResponse.json(
      { error: '服装が写っている画像をアップロードしてください', not_fashion: true },
      { status: 422 }
    )
  }

  if ((parsed.person_count ?? 1) >= 4) {
    return NextResponse.json(
      { error: '3人以内のコーデが写っている画像をアップロードしてください', not_fashion: true },
      { status: 422 }
    )
  }

  const diagnoses = parsed.diagnoses ?? [{ position: '', good_points: [], improve_points: [], next_items: [], color_advice: '診断結果を取得できませんでした' }]
  const post_comment = typeof parsed.post_comment === 'string' ? parsed.post_comment : ''
  const result = JSON.stringify({ v: 2, post_comment, diagnoses })
  await supabase.from('style_diagnoses').insert({ user_id: user.id, result })

  return NextResponse.json({ result, cached: false })
}
