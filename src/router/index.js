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

export function makeRouter(pinia) {
  const router = createRouter({history:createWebHistory(), scrollBehavior: () => ({top:0}), routes:[
    {path:'/',component:Home},
    {path:'/products',component:Catalog},
    {path:'/products/:id',component:Product},
    {path:'/cart',component:Cart},
    {path:'/support',component:() => import('../views/shop/Support.vue')},
    ...[['checkout','주문 · 모의 결제'],['orders','주문 내역'],['account','마이페이지'],['favorites','찜한 상품']].map(([path,title]) =>
      ({path:'/'+path, name:path, component:Account, meta:{role:'USER',title}})),
    {path:'/admin',component:AdminLayout,meta:{role:'ADMIN'},children:[{path:'sales',redirect:'/admin/customers'},{path:'shipping/:orderId',component:() => import('../views/admin/DeliveryDetail.vue'),meta:{title:'배송 상세'}},...adminMenu.map(([path,title]) =>
      ({path,component:AdminWorkspace,meta:{title,section:path === 'shipping' ? 'orders' : path}}))]},
    {path:'/:rest(.*)*',redirect:'/'},
  ]})
  router.beforeEach(to => {
    const store = useShop(pinia)
    if (!to.meta.role || store.role === to.meta.role) return true
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

