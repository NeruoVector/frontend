import { useState, type FormEvent } from 'react'
import { customerJson, customerRequest } from './client'
import { merchantCategorySchema, type MerchantCategory } from './models'

type Props = {
  categories: readonly MerchantCategory[]
  onChanged: (categories: readonly MerchantCategory[]) => void
}

export function MerchantCategoryManager({ categories, onChanged }: Props) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = newName.trim()
    if (!name || name.length > 100) return setError('분류 이름을 1~100자로 입력하세요.')
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const category = await customerJson('/merchant/categories', merchantCategorySchema, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      onChanged([...categories, category].sort((left, right) => left.name.localeCompare(right.name, 'ko')))
      setNewName('')
      setNotice('상품 분류를 추가했습니다.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '상품 분류를 추가하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function save(category: MerchantCategory) {
    const name = editingName.trim()
    if (!name || name.length > 100) return setError('분류 이름을 1~100자로 입력하세요.')
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const updated = await customerJson(`/merchant/categories/${category.id}`, merchantCategorySchema, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      onChanged(categories.map((item) => item.id === updated.id ? updated : item).sort((left, right) => left.name.localeCompare(right.name, 'ko')))
      setEditingId(null)
      setNotice('상품 분류를 수정했습니다.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '상품 분류를 수정하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(category: MerchantCategory) {
    setError(null)
    setNotice(null)
    try {
      await customerRequest(`/merchant/categories/${category.id}`, { method: 'DELETE' })
      onChanged(categories.filter((item) => item.id !== category.id))
      setNotice('상품 분류를 삭제했습니다.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '상품 분류를 삭제하지 못했습니다.')
    }
  }

  return (
    <section className="panel" aria-labelledby="merchant-categories-title">
      <div className="panel-head">
        <div><h2 id="merchant-categories-title">상품 분류</h2><p className="muted small">스토어 필터에 표시될 분류를 관리합니다.</p></div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {categories.length === 0 && <p className="muted">등록된 분류가 없습니다.</p>}
      <ul className="merchant-category-list">
        {categories.map((category) => (
          <li key={category.id}>
            {editingId === category.id ? (
              <>
                <label className="field"><span>{category.name} 분류 이름</span><input value={editingName} onChange={(event) => setEditingName(event.target.value)} maxLength={100} /></label>
                <div className="row-actions">
                  <button className="button button-small" type="button" onClick={() => void save(category)} disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
                  <button className="button button-secondary button-small" type="button" onClick={() => setEditingId(null)}>취소</button>
                </div>
              </>
            ) : (
              <>
                <strong>{category.name}</strong>
                <div className="row-actions">
                  <button className="button button-secondary button-small" type="button" onClick={() => { setEditingId(category.id); setEditingName(category.name); setError(null) }}>수정</button>
                  <button className="link-button" type="button" onClick={() => void remove(category)}>삭제</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <form className="merchant-category-create" onSubmit={(event) => void create(event)}>
        <label className="field"><span>새 분류 이름</span><input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={100} required /></label>
        <button className="button" type="submit" disabled={saving}>{saving ? '추가 중…' : '분류 추가'}</button>
      </form>
    </section>
  )
}
