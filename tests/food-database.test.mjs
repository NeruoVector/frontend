import assert from 'node:assert/strict'
import test from 'node:test'
import { foodDatabasePath, foodProductDescription, resultSchema } from '../src/commerce/foodDatabase.ts'
import { parsePhotoCandidate, photoDescription } from '../src/commerce/photoLookup.ts'

const item = { food_code: 'P101-104000100-1203', name: '과자', manufacturer: '제조사', major_category_code: '01', major_category: '과자류', representative_name: '', subcategory: '', food_weight: '', weight_grams: null, nutrition_basis: '100g', report_number: '', source_name: '식품의약품안전처', reference_date: '2026-08-28' }
const dataset = { name: '식약처 가공식품DB', date: '2026-08-28', record_count: 316734, source_url: 'https://example.com/source', sha256: 'abc' }

test('local reference query preserves food codes and offsets', () => {
  // Given: a native food code and a later page.
  const url = new URL(foodDatabasePath({ term: item.food_code, category: 'all', page: 2 }), 'http://localhost')
  // When and then: the local API receives the code as a search query.
  assert.equal(url.pathname, '/merchant/food-reference')
  assert.equal(url.searchParams.get('query'), item.food_code)
  assert.equal(url.searchParams.get('offset'), '8')
  assert.equal(url.searchParams.get('category'), 'all')
})
test('reference preserves unknown mass despite 100g nutrition basis', () => {
  // Given: a source record with no package mass.
  const parsed = resultSchema.parse({ items: [item], has_more: false, dataset })
  // When and then: the mass stays unknown and provenance retains the food code.
  assert.equal(parsed.items[0].weight_grams, null)
  assert.match(foodProductDescription(parsed.items[0], dataset), /P101-104000100-1203/)
})
test('barcode photo candidate retains source identity and rejects foreign image hosts', () => {
  // Given: an external product response with an untrusted image.
  const candidate = parsePhotoCandidate({ status: 'success', product: { product_name: 'Foreign name', brands: 'Brand', image_front_url: 'https://images.openfoodfacts.org.evil.test/x' } }, '3017624010701')
  // When and then: identity remains available while the image is rejected.
  assert.equal(candidate.name, 'Foreign name')
  assert.equal(candidate.imageUrl, '')
  assert.match(photoDescription(candidate), /3017624010701/)
})
test('missing barcode product returns no candidate', () => {
  // Given: the source reports no match.
  const candidate = parsePhotoCandidate({ status: 'failure' }, '12345678')
  // When and then: no candidate is invented.
  assert.equal(candidate, null)
})
