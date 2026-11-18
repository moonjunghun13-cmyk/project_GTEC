import catalog from '../mocks/realCatalog.json'
import { withProductDetails } from '../mocks/productDetails'
import { purposeTags, purposes } from '../mocks/purposes'
import { categories } from '../mocks/catalog'
export { categories, purposes }
const byImage=new Map(catalog.map(row=>[row.image,row]))
const byName=new Map(catalog.map(row=>[row.name,row]))
export function presentProduct(product) {
  const reference=byImage.get(product.image) || byName.get(product.name)
  if(!reference)return product
  const sameSpecifications=product.spec===reference.spec
  const unchangedModel=sameSpecifications && product.name===reference.name && product.category===reference.category
  const merged={...reference,...product,sourceProductId:reference.productId,brand:reference.brand || '',tier:reference.tier,compatibility:product.compatibility ?? (unchangedModel ? reference.compatibility : undefined),displaySpecifications:sameSpecifications ? reference.displaySpecifications : undefined,
    gallery:product.gallery.map((row,index)=>({...row,color:reference.gallery?.find(image=>image.image===row.image)?.color || row.color})),
    lifestyle:reference.lifestyle || [],
  }
  merged.purposes=purposeTags(merged)
  return withProductDetails(merged)
}
