import { createRouter, createWebHistory } from 'vue-router'
import { useShop } from '../stores/shop'
import Home from '../views/shop/Home.vue'
import Catalog from '../views/shop/Catalog.vue'
import Product from '../views/shop/Product.vue'
import Cart from '../views/shop/Cart.vue'
import Account from '../views/shop/Account.vue'
import AdminLayout from '../views/admin/AdminLayout.vue'
const AdminWorkspace = () => import('../views/admin/AdminWorkspace.vue')
import { adminMenu } from './adminMenu'
import { canAccessRole } from '../services/memberAccess'

export function makeRouter(pinia) {
  const router = createRouter({history:createWebHistory(), scrollBehavior: () => ({top:0}), routes:[
    {path:'/',component:Home},
    {path:'/oauth/callback',component:()=>import('../views/shop/OAuthCallback.vue')},
    {path:'/login',component:Home,beforeEnter:()=>{setTimeout(()=>useShop(pinia).openAuth(),0);return true}},
    {path:'/my-reviews',component:()=>import('../views/shop/MyReviews.vue'),meta:{role:'USER'}},
    {path:'/products',component:Catalog},
    {path:'/products/:id',component:Product},
    {path:'/cart',component:Cart},
    {path:'/support',component:() => import('../views/shop/Support.vue')},
    {path:'/checkout',name:'checkout',component:() => import('../views/shop/Checkout.vue'),meta:{role:'USER',checkout:true}},
    {path:'/checkout/toss/:result(success|fail)',component:() => import('../views/shop/TossCheckoutResult.vue')},
    {path:'/checkout/complete',name:'checkout-complete',component:() => import('../views/shop/Checkout.vue'),meta:{role:'USER',checkout:true}},
    ...[['orders','주문 내역'],['account','마이페이지'],['favorites','찜한 상품']].map(([path,title]) =>
      ({path:'/'+path, name:path, component:Account, meta:{role:'USER',title}})),
    {path:'/admin',component:AdminLayout,meta:{role:'ADMIN'},children:[{path:'recommendations',component:()=>import('../views/admin/RecommendationSystem.vue'),meta:{title:'추천시스템',section:'recommendations'}},{path:'sentiment',redirect:to=>({path:'/admin/reviews',query:to.query})},{path:'inquiries',redirect:'/admin/faqs'},{path:'faqs',component:()=>import('../views/admin/FaqManagement.vue'),meta:{title:'FAQ 관리',section:'faqs'}},{path:'sales',redirect:'/admin/customers'},
      {path:'refunds',redirect:to => ({path:'/admin/shipping',query:{...to.query,tab:'refunds'}})},{path:'shipping/:orderId',component:() => import('../views/admin/DeliveryDetail.vue'),meta:{title:'배송 상세'}},...adminMenu.filter(([path])=>path!=='faqs').map(([path,title]) =>
      ({path,component:AdminWorkspace,meta:{title,section:path === 'shipping' ? 'orders' : path}}))]},
    {path:'/:rest(.*)*',redirect:'/'},
  ]})
  router.beforeEach(async to => {
    const store = useShop(pinia)
    // Refresh cookies must restore the account before evaluating protected routes.
    await store.ensureSession()
    if (store.role === 'ADMIN' && (to.meta.role === 'USER' || to.path === '/cart' || to.path.startsWith('/checkout'))) return '/admin'
    if (canAccessRole(store.role,to.meta.role)) return true
    if (store.role === 'GUEST') {
      if (to.meta.role === 'USER') store.requireUser(() => router.push(to.fullPath))
      else {
        store.afterLoginRole = 'ADMIN'
        store.afterLogin = () => router.push(to.fullPath)
        store.openAuth()
      }
    }
    return router.currentRoute.value.matched.length ? false : '/'
  })
  return router
}

