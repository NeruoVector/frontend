type Source = { readonly kind: 'reference' | 'photo'; readonly url: string; readonly date?: string }
export function splitProductProvenance(description: string): { readonly text: string; readonly sources: readonly Source[] } {
  const text: string[] = []
  const sources: Source[] = []
  for (const line of description.split('\n')) {
    const reference = line.match(/^출처: .+ · 식품코드 .+ · 기준일 (\d{4}-\d{2}-\d{2}) · (https:\/\/various\.foodsafetykorea\.go\.kr\/nutrient\/general\/down\/historyList\.do) · SHA-256 [a-f0-9]{64}$/)
    const photo = line.match(/^사진 출처: Open Food Facts (https:\/\/world\.openfoodfacts\.org\/product\/(\d{8,14})) · 바코드 (\d{8,14}) · 이미지 CC BY-SA$/)
    if (reference) sources.push({ kind: 'reference', date: reference[1], url: reference[2] })
    else if (photo && photo[2] === photo[3]) sources.push({ kind: 'photo', url: photo[1] })
    else text.push(line)
  }
  return { text: text.join('\n'), sources }
}
