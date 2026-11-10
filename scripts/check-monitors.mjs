import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {categories,products} from '../src/mocks/catalog.js'
const rows=products.filter(row=>row.category==='모니터')
assert.equal(categories[0],'모니터','Monitor must be before CPU in navigation')
assert.equal(categories[1],'CPU')
assert.equal(categories.length,12)
assert.equal(products.length,120)
assert.equal(new Set(products.map(row=>row.productId)).size,120)
for(const category of categories) assert.equal(products.filter(row=>row.category===category).length,10,category)
assert.equal(rows.length,10)
assert.equal(new Set(rows.map(row=>row.visualDesign)).size,10,'Each monitor needs a different silhouette')
const images=[]
for(const row of rows){
  assert.equal(row.gallery.length,2)
  assert.equal(row.lifestyle.length,2)
  assert.deepEqual(row.gallery.map(x=>x.color),['검정','흰색'])
  assert.deepEqual(row.lifestyle.map(x=>x.label),['검정 연출컷','흰색 연출컷'])
  assert(row.displaySpecifications.length>=7)
  assert(row.headline && row.description && row.monitorPurposes.length)
  assert.equal(row.image,row.gallery[0].image)
  for(const asset of [...row.gallery,...row.lifestyle]){
    const file=new URL('../public'+asset.image,import.meta.url)
    assert(existsSync(file),asset.image+' is missing')
    const bytes=readFileSync(file)
    assert(bytes.length>10000,asset.image+' is unexpectedly small')
    images.push(createHash('sha256').update(bytes).digest('hex'))
  }
}
assert.equal(new Set(images).size,40,'All forty monitor assets must be separate generated images')
console.log('Monitor checks passed: 10 distinct models, 20 color photos, 20 styled photos, 12 categories and 120 products.')
