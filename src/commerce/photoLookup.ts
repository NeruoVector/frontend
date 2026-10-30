import { z } from 'zod'

const responseSchema = z.object({ status: z.string(), product: z.object({ product_name: z.string().nullish(), brands: z.string().nullish(), image_front_url: z.string().nullish() }).optional() })
export type PhotoCandidate = { readonly barcode: string; readonly name: string; readonly brand: string; readonly imageUrl: string; readonly sourceUrl: string }
export function parsePhotoCandidate(raw: unknown, barcode: string): PhotoCandidate | null {
  const response = responseSchema.parse(raw)
  if (response.status !== 'success' || !response.product) return null
  let imageUrl = ''
  try {
    const url = new URL(response.product.image_front_url ?? '')
    if (url.protocol === 'https:' && ['images.openfoodfacts.org', 'static.openfoodfacts.org'].includes(url.hostname)) imageUrl = url.href
  } catch (error) { if (!(error instanceof TypeError)) throw error }
  return { barcode, name: response.product.product_name?.trim() || '상품명 정보 없음', brand: response.product.brands?.trim() || '브랜드 정보 없음', imageUrl, sourceUrl: `https://world.openfoodfacts.org/product/${barcode}` }
}
export function photoDescription(candidate: PhotoCandidate): string {
  return `사진 출처: Open Food Facts ${candidate.sourceUrl} · 바코드 ${candidate.barcode} · 이미지 CC BY-SA`
}
