import { defineStore } from 'pinia'
import { shop } from '../services'

const cartKey = 'gt-demo-guest-cart'
function guestCart() {
  try {
    const rows = JSON.parse(sessionStorage.getItem(cartKey) || '[]')
    return rows.filter(row => typeof row.productId === 'string' && Number.isInteger(row.quantity) && row.quantity > 0)
  } catch { return [] }
}
export const useShop = defineStore('shop', {
  state: () => ({user:null, products:[], categories:[], purposes:[], cart:guestCart(), cartOpen:false, checkoutIds:null, cartNotice:'', lastAdded:'', favorites:[], recentlyViewed:[], busy:true, error:'', authMode:'', afterLogin:null, afterLoginRole:'USER'}),
  getters: {
    role: state => state.user?.role ?? 'GUEST',
    cartItems: state => state.cart.flatMap(line => {
      const product = state.products.find(row => row.productId === line.productId)
      return product ? [{...product,quantity:line.quantity}] : []
    }),
    checkoutItems() {
      return this.cartItems.filter(item => this.checkoutIds === null || this.checkoutIds.includes(item.productId))
    },
    checkoutTotal() { return this.checkoutItems.reduce((sum,item) => sum + item.price * item.quantity,0) },
    cartCount() { return this.cartItems.reduce((sum,row) => sum + row.quantity,0) },
    total() { return this.cartItems.reduce((sum,row) => sum + row.price * row.quantity,0) },
  },
  actions: {
    async load() {
      this.busy = true
      this.error = ''
      try {
        const catalog = await shop.catalog()
        this.products = catalog.products
        this.categories = catalog.categories; this.purposes = catalog.purposes
        this.cart = this.cart.filter(line => this.products.some(row => row.productId === line.productId))
      } catch (error) { this.error = error.message }
      finally { this.busy = false }
    },
    quantity(productId, quantity) {
      const product = this.products.find(row => row.productId === productId)
      if (!product || !Number.isInteger(quantity)) return
      const next = Math.min(quantity,product.stock)
      const line = this.cart.find(row => row.productId === productId)
      if (next <= 0) this.cart = this.cart.filter(row => row.productId !== productId)
      else if (line) line.quantity = next
      else this.cart.push({productId,quantity:next})
      if (this.role === 'GUEST') {
        try { sessionStorage.setItem(cartKey,JSON.stringify(this.cart)) } catch { /* In-memory cart remains usable. */ }
      }
    },
    completeCheckout(items) {
      for (const item of items) {
        const current = this.cart.find(line => line.productId === item.productId)
        if (current) this.quantity(item.productId,Math.max(0,current.quantity-item.quantity))
      }
      this.checkoutIds = null
    },
    addAndShow(productId) {
      if (this.role === 'ADMIN') return
      const product = this.products.find(row => row.productId === productId)
      if (!product) return
      const before = this.cart.find(row => row.productId === productId)?.quantity ?? 0
      this.add(productId)
      const after = this.cart.find(row => row.productId === productId)?.quantity ?? 0
      this.cartNotice = after > before ? product.name + ' 1개를 담았습니다.' : '담을 수 있는 재고를 모두 담았습니다.'
      this.lastAdded = productId
      this.cartOpen = true
    },
    add(productId) {
      this.quantity(productId, (this.cart.find(row => row.productId === productId)?.quantity ?? 0) + 1)
    },
    openAuth(mode='login') { this.authMode = mode },
    closeAuth() { this.authMode = ''; this.afterLogin = null; this.afterLoginRole = 'USER' },
    requireUser(action) {
      if (this.role === 'USER') return action()
      if (this.role === 'GUEST') {
        this.afterLogin = action
        this.openAuth()
      }
    },
    async authenticate(fields) {
      const mode = this.authMode
      const user = await shop.login(fields.email,fields.password)
      if (this.authMode !== mode) return
      await this.finishAuthentication(user)
    },
    async authenticateSocial(provider,agreed) {
      const mode = this.authMode
      const user = await shop.socialSignIn(provider,{agreed})
      if (this.authMode !== mode) return
      await this.finishAuthentication(user)
    },
    async finishAuthentication(user) {
      const continuation = user.role === this.afterLoginRole ? this.afterLogin : null
      this.user = user
      if (user.role === 'USER') {
        try { sessionStorage.removeItem(cartKey) } catch { /* Storage is optional. */ }
      } else this.cart = []
      this.closeAuth()
      await continuation?.()
    },
    recordView(productId) {
      if (this.role !== 'USER') return
      this.recentlyViewed = [productId,...this.recentlyViewed.filter(id => id !== productId)].slice(0,12)
    },
    favorite(productId) {
      if (this.role !== 'USER') return
      this.favorites = this.favorites.includes(productId)
        ? this.favorites.filter(id => id !== productId) : [...this.favorites,productId]
    },
    signOut() { this.checkoutIds = null; this.cartOpen = false; this.cartNotice = ''; this.lastAdded = ''; this.user = null; this.cart = guestCart(); this.favorites = []; this.recentlyViewed = []; this.closeAuth() },
  },
})
