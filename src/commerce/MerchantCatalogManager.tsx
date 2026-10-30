import { MerchantCategoryManager } from './MerchantCategoryManager'
import { MerchantProductManager } from './MerchantProductManager'
import type { MerchantCategory, MerchantProduct } from './models'

type Props = {
  categories: readonly MerchantCategory[]
  products: readonly MerchantProduct[]
  onCategoriesChanged: (categories: readonly MerchantCategory[]) => void
  onProductsChanged: (products: readonly MerchantProduct[]) => void
}

export function MerchantCatalogManager({ categories, products, onCategoriesChanged, onProductsChanged }: Props) {
  return (
    <div className="merchant-catalog-manager">
      <MerchantCategoryManager categories={categories} onChanged={onCategoriesChanged} />
      <MerchantProductManager categories={categories} products={products} onChanged={onProductsChanged} />
    </div>
  )
}
