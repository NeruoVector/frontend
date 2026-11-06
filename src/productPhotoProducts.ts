import type { Product } from './data.ts'
import type { PhotoSnapshot } from './productPhotos.ts'

export function productWithPhoto(product: Product, photos: PhotoSnapshot): Product {
  const photo = photos[product.id]
  return photo ? { ...product, image: photo.src, detailImage: photo.src } : product
}
