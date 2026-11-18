import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {categoryCodes} from '../src/services/backendModels.js'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const source=JSON.parse(fs.readFileSync(path.join(root,'src/mocks/realCatalog.json'),'utf8'))
const base=process.env.GT_API_URL || 'http://localhost:8090/api'
let token
async function request(method,url,data) {
 const response=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:data?JSON.stringify(data):undefined})
 const text=await response.text()
 if(!response.ok)throw new Error(`${method} ${url} ${response.status}: ${text}`)
 return text?JSON.parse(text):null
}
// Validate every referenced local image before changing server records.
for(const row of source) {
 if(!categoryCodes[row.category])throw Error('Unknown category '+row.category)
 const urls=[row.image,...(row.gallery || []).map(item=>item.image),...(row.lifestyle || []).map(item=>item.image)].filter(Boolean)
 for(const url of urls)if(url.startsWith('/')&&!fs.existsSync(path.join(root,'public',url)))throw Error('Missing image '+url)
}
token=(await request('POST','/members/login',{loginId:process.env.GT_ADMIN_LOGIN || 'admin',password:process.env.GT_ADMIN_PASSWORD || '1111'})).accessToken
const existing=await request('GET','/products')
const names=new Map(existing.map(row=>[row.name,row]))
const records=[]
for(const [index,row] of source.entries()) {
 let saved=names.get(row.name)
 let action='existing'
 if(!saved) {
  const images=[...new Set([row.image,...(row.gallery || []).map(item=>item.image)].filter(Boolean))]
  saved=await request('POST','/admin/products',{name:row.name,category:categoryCodes[row.category],stock:8+(index*7)%23,description:row.description || `${row.name} · ${row.spec}`,specification:row.spec,price:row.price,thumbnailUrl:row.image,images:images.map(imageUrl=>({imageUrl}))})
  action='created';names.set(row.name,saved)
 }
 records.push({sourceProductId:row.productId,serverProductId:saved.id,name:row.name,category:row.category,action})
}
fs.writeFileSync(path.join(root,'catalog-import-manifest.json'),JSON.stringify({importedAt:new Date().toISOString(),count:records.length,records},null,2))
console.log(JSON.stringify({total:records.length,created:records.filter(row=>row.action==='created').length,existing:records.filter(row=>row.action==='existing').length,categories:Object.fromEntries(Object.keys(categoryCodes).map(category=>[category,records.filter(row=>row.category===category).length]))},null,2))
