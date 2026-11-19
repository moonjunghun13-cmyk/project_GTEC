import assert from 'node:assert/strict'
import { existsSync,readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { categories,products } from '../src/mocks/catalog.js'
const driveCategories = ['SSD','HDD']
assert(!categories.includes('SSD/HDD'))
assert.equal(new Set(products.map(row => row.productId)).size,products.length,'Product IDs must be unique')
for (const category of categories) assert.equal(products.filter(row => row.category === category).length,10,category+' must have 10 products')
for (const category of driveCategories) {
  const rows=products.filter(row=>row.category===category)
  assert.equal(new Set(rows.map(row=>row.name)).size,10,category+' requires ten distinct model names')
  assert.equal(new Set(rows.map(row=>row.visualDesign)).size,10,category+' requires ten distinct exterior designs')
  assert.equal(new Set(rows.map(row=>row.image)).size,10,category+' cannot share thumbnail URLs')
  const hashes=rows.map(row=>createHash('sha256').update(readFileSync(new URL('../public'+row.image,import.meta.url))).digest('hex'))
  assert.equal(new Set(hashes).size,10,category+' cannot reuse identical thumbnail files under different names')
}
for (const row of products.filter(row=>driveCategories.includes(row.category))) {
  assert.equal(row.connection,'internal')
  assert.equal(row.storageType,row.category)
  assert.equal(row.imageAssetType,row.category)
  assert(!/USB|외장|portable|enclosure/i.test(row.name+' '+row.spec+' '+row.description),row.productId+' cannot be an external enclosure')
  assert.equal(row.gallery.length,2)
  assert(row.gallery.every(photo=>photo.image.startsWith('/storefront/storage-v2/'+row.productId+'-')),row.productId+' gallery must match its own model')
  assert.equal(row.lifestyle.length,2); assert(row.lifestyle.every(photo=>photo.image.startsWith('/storefront/storage-scenes/'+row.productId+'-')),row.productId+' styled scenes must match their model'); assert(row.lifestyle.every(photo=>!row.gallery.some(item=>item.image===photo.image)),row.productId+' scenes cannot reuse the plain gallery image')
  for (const photo of [...row.gallery,...row.lifestyle]) assert(existsSync(new URL('../public'+photo.image,import.meta.url)),photo.image+' missing')
}
console.log('Storage OK: SSD 10 / HDD 10, 20 distinct model designs and thumbnail hashes, matching light/dark images, internal classification and all asset paths.')
