import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runTryOn } from '@/lib/aiFitting/provider'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    personImagePath?: string
    garmentImagePath?: string
    sourceType?: string
  }

  const { personImagePath, garmentImagePath, sourceType = 'upload' } = body
  if (!personImagePath || !garmentImagePath) {
    return NextResponse.json({ error: '画像パスが不足しています' }, { status: 400 })
  }

  // ── 1日1回制限（日本時間 0:00〜23:59、pending / processing / completed をカウント）
  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const jstDayStartUTC = new Date(Date.UTC(
    nowJST.getUTCFullYear(),
    nowJST.getUTCMonth(),
    nowJST.getUTCDate(),
  ) - 9 * 60 * 60 * 1000)

  const { count, error: countError } = await supabase
    .from('virtual_tryons')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['pending', 'processing', 'completed'])
    .gte('created_at', jstDayStartUTC.toISOString())

  if (!countError && (count ?? 0) >= 1) {
    return NextResponse.json(
      { error: '本日のAI Fittingは使用済みです。明日また試してください。' },
      { status: 429 }
    )
  }

  // ── FASHN.ai に渡す短時間 signed URL を生成（15分）──────────────────
  const [personSigned, garmentSigned] = await Promise.all([
    supabase.storage.from('ai-tryons').createSignedUrl(personImagePath, 900),
    supabase.storage.from('ai-tryons').createSignedUrl(garmentImagePath, 900),
  ])

  if (!personSigned.data?.signedUrl || !garmentSigned.data?.signedUrl) {
    return NextResponse.json({ error: '署名付きURLの生成に失敗しました' }, { status: 500 })
  }

  // ── virtual_tryons レコード作成（pending）──────────────────────────
  const { data: tryon, error: insertError } = await supabase
    .from('virtual_tryons')
    .insert({
      user_id: user.id,
      person_image_url: personImagePath,
      garment_image_url: garmentImagePath,
      source_type: sourceType,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !tryon) {
    return NextResponse.json({ error: 'レコード作成に失敗しました' }, { status: 500 })
  }

  // ── FASHN.ai 呼び出し（polling 含む、最大120秒）──────────────────────
  await supabase
    .from('virtual_tryons')
    .update({ status: 'processing' })
    .eq('id', tryon.id)

  const result = await runTryOn({
    personImageUrl: personSigned.data.signedUrl,
    garmentImageUrl: garmentSigned.data.signedUrl,
    tryonId: tryon.id,
  })

  if (!result.success) {
    await supabase
      .from('virtual_tryons')
      .update({ status: 'failed', error_message: result.error })
      .eq('id', tryon.id)

    return NextResponse.json(
      { id: tryon.id, status: 'failed', error: result.error },
      { status: 422 }
    )
  }

  // ── 結果画像を Supabase Storage に保存（path をDBに残す）────────────
  const resultPath = `${user.id}/results/${tryon.id}.jpg`
  try {
    const imgBuffer = await fetch(result.resultImageUrl).then(r => r.arrayBuffer())
    const { error: uploadErr } = await supabase.storage
      .from('ai-tryons')
      .upload(resultPath, imgBuffer, { upsert: true, contentType: 'image/jpeg' })
    if (uploadErr) throw uploadErr
  } catch (e) {
    const msg = e instanceof Error ? e.message : '結果画像の保存に失敗しました'
    await supabase
      .from('virtual_tryons')
      .update({ status: 'failed', error_message: msg })
      .eq('id', tryon.id)
    return NextResponse.json({ id: tryon.id, status: 'failed', error: msg }, { status: 422 })
  }

  await supabase
    .from('virtual_tryons')
    .update({ status: 'completed', result_image_url: resultPath })
    .eq('id', tryon.id)

  // 表示用 signed URL をクライアントへ返す（1時間有効）
  const { data: signedResult } = await supabase.storage
    .from('ai-tryons')
    .createSignedUrl(resultPath, 3600)

  return NextResponse.json({
    id: tryon.id,
    status: 'completed',
    displayUrl: signedResult?.signedUrl ?? null,
  })
}

// 自分の試着履歴を取得（最新10件）
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('virtual_tryons')
    .select('id, status, result_image_url, garment_image_url, created_at, source_type')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tryons: data })
}
