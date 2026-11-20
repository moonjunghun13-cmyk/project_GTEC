import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createServer} from 'vite'
const reference=JSON.parse(fs.readFileSync(new URL('../src/mocks/realCatalog.json',import.meta.url),'utf8'))
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
  const {api,setAccessToken}=await server.ssrLoadModule('/src/api/index.js')
  api.defaults.baseURL=process.env.GT_API_ORIGIN || 'http://127.0.0.1:8093'
  const {shop}=await server.ssrLoadModule('/src/services/index.js')
  const {cartCompatibilityWarnings}=await server.ssrLoadModule('/src/services/cartCompatibility.js')
  const {products,categories}=await shop.catalog()
  assert.equal(products.length,120);assert.equal(categories.length,12)
  for(const category of categories){assert.equal(products.filter(p=>p.category===category).length,10);for(const [tier,count] of Object.entries({LOW:3,MID:4,HIGH:3}))assert.equal(products.filter(p=>p.category===category&&p.tier===tier).length,count)}
  for(const row of reference){const product=products.find(p=>p.name===row.name);assert(product,row.name);assert.equal(product.price,row.price);assert.equal(product.image,row.image);assert.equal(product.brand,row.brand);assert.deepEqual(product.compatibility,row.compatibility);assert.deepEqual(product.displaySpecifications,row.displaySpecifications);assert(fs.existsSync(new URL('../public'+row.image,import.meta.url)))}
  const cpu=products.find(p=>p.category==='CPU'&&p.compatibility?.socket==='LGA1700')
  const bad=products.find(p=>p.category==='메인보드'&&p.compatibility?.socket==='AM4')
  const good=products.find(p=>p.category==='메인보드'&&p.compatibility?.socket==='LGA1700')
  assert(cartCompatibilityWarnings([cpu,bad]).some(w=>w.reason.includes('소켓')))
  assert.deepEqual(cartCompatibilityWarnings([cpu,good]),[])
  assert.deepEqual(await shop.demoRecommendations(),[])
  console.log('Passed: live catalog 120, categories 12, tiers, prices, assets, specs, compatibility, no fabricated guest AI recommendations.')
}finally{await server.close()}
