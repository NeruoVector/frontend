import assert from 'node:assert/strict'
import test from 'node:test'
import { splitProductProvenance } from '../src/commerce/productProvenance.ts'

test('recognized provenance is separated while merchant copy remains intact', () => {
  // Given: merchant copy and the generated source lines.
  const description = `설명\n출처: 식품의약품안전처 · 식품코드 P101-123 · 기준일 2026-08-28 · https://various.foodsafetykorea.go.kr/nutrient/general/down/historyList.do · SHA-256 ${'a'.repeat(64)}\n사진 출처: Open Food Facts https://world.openfoodfacts.org/product/3017624010701 · 바코드 3017624010701 · 이미지 CC BY-SA`
  // When: preparing the public card.
  const result = splitProductProvenance(description)
  // Then: copy and validated source links remain available separately.
  assert.equal(result.text, '설명')
  assert.deepEqual(result.sources.map(source => source.kind), ['reference', 'photo'])
  assert.equal(result.sources[1].url, 'https://world.openfoodfacts.org/product/3017624010701')
})
test('unrecognized or mismatched attribution stays as merchant text', () => {
  // Given: ordinary copy and a source line with a mismatched barcode.
  const description = '  그대로 표시  \n사진 출처: Open Food Facts https://world.openfoodfacts.org/product/12345678 · 바코드 87654321 · 이미지 CC BY-SA'
  // When: preparing the public card.
  const result = splitProductProvenance(description)
  // Then: neither text is silently removed or converted into a link.
  assert.equal(result.text, description)
  assert.deepEqual(result.sources, [])
})
