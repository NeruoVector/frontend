import chips from './assets/product-chips.png'
import jelly from './assets/product-jelly.png'
import milk from './assets/product-milk.png'
import chipsDetail from './assets/detail-chips.png'

// 백엔드 연결 전까지 쓰는 시안 데이터

export type Place = {
  id: string
  name: string
  description: string
  recommended?: boolean
}

export const PLACES: Place[] = [
  { id: 'lobby', name: '1층 현관', description: '본관 정문 쪽 · 교내 기본 수령 장소', recommended: true },
  { id: 'gym', name: '체육관 앞', description: '운동장 옆 출입구' },
  { id: 'back', name: '본관 후문', description: '주차장 방향 출입구' },
]

export type Category = '전체' | '과자' | '젤리' | '음료'
export const CATEGORIES: Category[] = ['전체', '과자', '젤리', '음료']

export type Product = {
  id: string
  name: string
  price: number
  category: Exclude<Category, '전체'>
  image: string
  /** 메뉴 상세용 큰 사진 (없으면 image 사용) */
  detailImage?: string
  description: string
  popular?: boolean
}

export const PRODUCTS: Product[] = [
  { id: 'chips', name: '포테이토칩 60g', price: 1500, category: '과자', image: chips, detailImage: chipsDetail, description: '짭짤하고 바삭한 오리지널 감자칩', popular: true },
  { id: 'jelly', name: '청포도젤리 50g', price: 1000, category: '젤리', image: jelly, description: '한 입에 쏙, 상큼하고 쫀득한 청포도 맛' },
  { id: 'milk', name: '초코우유 200mL', price: 1200, category: '음료', image: milk, description: '달콤하고 부드러운 한 팩' },
  { id: 'chips-2', name: '포테이토칩 2개 묶음', price: 3000, category: '과자', image: chips, detailImage: chipsDetail, description: '포테이토칩 60g 2개' },
  { id: 'jelly-2', name: '청포도젤리 2개 묶음', price: 2000, category: '젤리', image: jelly, description: '청포도젤리 50g 2개' },
  { id: 'milk-2', name: '초코우유 2개 묶음', price: 2400, category: '음료', image: milk, description: '초코우유 200mL 2개' },
]

export const STORE = {
  name: '선린인터넷고 매점',
  school: '선린인터넷고등학교',
  deliveryFee: 1000,
  eta: '10~15분',
}

export function won(amount: number) {
  return `${amount.toLocaleString('ko-KR')}원`
}

export const STORE_INFO = {
  rating: 4.9,
  reviewCount: 128,
  tagline: '학교 안 작은 맛집',
  minOrder: 1000,
}
