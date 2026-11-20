import assert from 'node:assert/strict'
import {createServer} from 'vite'
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const {api,setAccessToken}=await server.ssrLoadModule('/src/api/index.js')
 const social=await server.ssrLoadModule('/src/services/socialAuth.js')
 const {toFrontendUser}=await server.ssrLoadModule('/src/services/index.js')
 const calls=[]
 api.defaults.adapter=async config=>{
  calls.push(config)
  const respond=data=>({data,status:200,statusText:'OK',headers:{},config})
  if(config.url==='/api/members/social-exchange'){
   const {code}=JSON.parse(config.data)
   if(code==='expired')throw Object.assign(new Error('expired'),{config,response:{status:401,data:{message:'expired'}}})
   return respond(code==='existing'?{status:'LOGIN',tokens:{accessToken:'login-test-token'}}:{status:'SIGNUP',signupToken:'signup-test-token'})
  }
  if(config.url==='/api/members/social-signup'){
   assert.equal(config.headers.Authorization,'Bearer signup-test-token')
   assert.deepEqual(JSON.parse(config.data),{name:'테스트',email:'test@example.invalid',termsAgreed:true,privacyAgreed:true})
   return respond({accessToken:'new-member-token'})
  }
  if(config.url==='/api/members/me')return respond({id:42,role:'USER',loginId:'social_google_test',name:'테스트',email:'test@example.invalid',status:'ACTIVE'})
  throw new Error('Unexpected request '+config.url)
 }
 const existing=await social.exchangeSocialCode('existing');assert.equal(existing.status,'LOGIN');assert.equal(existing.member.id,42)
 const pending=await social.exchangeSocialCode('new');assert.equal(pending.status,'SIGNUP');assert.equal(pending.signupToken,'signup-test-token')
 setAccessToken('old-access-token')
 const member=await social.completeSocialSignup(pending.signupToken,{name:'테스트',email:'test@example.invalid',termsAgreed:true,privacyAgreed:true})
 assert.equal(toFrontendUser(member).hasPassword,false);assert.equal(toFrontendUser(member).socialProvider,'google')
 const before=calls.length;await assert.rejects(social.exchangeSocialCode('expired'),/expired/);assert.equal(calls.length,before+1)
 assert(!calls.some(call=>call.url.includes('/refresh')))
 const encoded=Buffer.from(JSON.stringify({name:'홍길동',email:'test@example.invalid'})).toString('base64url')
 assert.deepEqual(social.signupPreview('header.'+encoded+'.signature'),{name:'홍길동',email:'test@example.invalid'})
 console.log('Passed: existing/new social exchange, explicit signup token, consent payload, expired-code single use, Korean claim preview, social account model.')
}finally{await server.close()}
