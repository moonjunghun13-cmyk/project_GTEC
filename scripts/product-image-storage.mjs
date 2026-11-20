import { mkdir,writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
export function productImageStorage(){
 let root
 function install(server){server.middlewares.use('/__frontend/product-images',async(req,res)=>{
  const send=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))}
  if(req.method!=='POST')return send(405,{message:'POST required'})
  if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}` && req.headers.origin!==`https://${req.headers.host}`)return send(403,{message:'Origin mismatch'})
  const type=req.headers['content-type']?.split(';')[0]
  const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[type]
  if(!ext)return send(415,{message:'Unsupported image'})
  let size=0;const chunks=[]
  try{
   for await(const chunk of req){size+=chunk.length;if(size>5*1024*1024)return send(413,{message:'Image exceeds 5MB'});chunks.push(chunk)}
   const data=Buffer.concat(chunks)
   const valid=ext==='png' ? data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : ext==='jpg' ? data[0]===255 && data[1]===216 && data[2]===255
    : data.subarray(0,4).toString()==='RIFF' && data.subarray(8,12).toString()==='WEBP'
   if(!valid)return send(415,{message:'Invalid image signature'})
   const dir=path.join(root,'public','storefront','uploads');await mkdir(dir,{recursive:true})
   const filename=`${randomUUID()}.${ext}`;await writeFile(path.join(dir,filename),data,{flag:'wx'})
   send(201,{url:`/storefront/uploads/${filename}`})
  }catch{if(!res.writableEnded)send(500,{message:'Unable to save image'})}
 })}
 return {name:'frontend-product-image-storage',configResolved(config){root=config.root},configureServer:install}
}
