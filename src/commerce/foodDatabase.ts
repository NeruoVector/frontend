import { z } from 'zod'

const foodSchema = z.object({
  food_code: z.string(), name: z.string(), manufacturer: z.string(), major_category_code: z.string(),
  major_category: z.string(), representative_name: z.string(), subcategory: z.string(), food_weight: z.string(),
  weight_grams: z.number().int().nonnegative().nullable(), nutrition_basis: z.string(), report_number: z.string(),
  source_name: z.string(), reference_date: z.string().nullable(),
})
export const resultSchema = z.object({
  items: z.array(foodSchema), has_more: z.boolean(),
  dataset: z.object({ name: z.string(), date: z.string(), record_count: z.number().int(), source_url: z.url(), sha256: z.string() }),
})
export type FoodProduct = z.infer<typeof foodSchema>
export type FoodResults = z.infer<typeof resultSchema>
export type FoodQuery = { readonly term: string; readonly category: '01' | 'all'; readonly page: number }

export function foodDatabasePath(query: FoodQuery): string {
  const params = new URLSearchParams({ query: query.term.trim(), category: query.category, limit: '8', offset: String((query.page - 1) * 8) })
  return `/merchant/food-reference?${params}`
}
export function foodProductDescription(product: FoodProduct, dataset: FoodResults['dataset']): string {
  return [product.manufacturer && `제조사: ${product.manufacturer}`, product.food_weight && `식품중량: ${product.food_weight}`,
    `출처: ${product.source_name || dataset.name} · 식품코드 ${product.food_code} · 기준일 ${product.reference_date || dataset.date} · ${dataset.source_url} · SHA-256 ${dataset.sha256}`].filter(Boolean).join('\n')
}
