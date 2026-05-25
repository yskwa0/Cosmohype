/**
 * Canvas API でリサイズ＋JPEG/WebP 圧縮を行う。
 * PNG は可逆なのでリサイズのみ（quality 指定なし）。
 * 失敗時は元ファイルをそのまま返すのでアップロードは止まらない。
 */
export async function compressImage(
  file: File,
  maxPx: number,
  quality = 0.85
): Promise<File> {
  return new Promise((resolve) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const { naturalWidth: w, naturalHeight: h } = img
      const scale = Math.min(1, maxPx / Math.max(w, h))
      const newW = Math.round(w * scale)
      const newH = Math.round(h * scale)

      const canvas = document.createElement('canvas')
      canvas.width = newW
      canvas.height = newH

      const isPng = file.type === 'image/png'
      const outputType = isPng ? 'image/jpeg' : file.type
      const outputName = isPng ? file.name.replace(/\.png$/i, '.jpg') : file.name

      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // JPEG has no alpha channel — fill white before drawing to prevent
      // transparent areas becoming black.
      if (outputType === 'image/jpeg') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, newW, newH)
      }

      ctx.drawImage(img, 0, 0, newW, newH)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], outputName, { type: outputType, lastModified: Date.now() }))
        },
        outputType,
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }

    img.src = url
  })
}
