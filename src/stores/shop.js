import { defineStore } from 'pinia'
import { shop } from '../services'
import { cartCompatibilityWarnings } from '../services/cartCompatibility'

const cartKey = 'gt-demo-guest-cart'
function guestCart() {
  try {
    const rows = JSON.parse(sessionStorage.getItem(cartKey) || '[]')
    return rows.filter(row => typeof row.productId === 'string' && Number.isInteger(row.quantity) && row.quantity > 0)
  } catch { return [] }
}
export const useShop = defineStore('shop', {
  state: () => ({cartSaving:false,user:null, products:[], categories:[], purposes:[], cart:guestCart(), cartOpen:false, cartReview:null, checkoutIds:null, lastCheckout:null, deliveryAddresses:{}, cartNotice:'', lastAdded:'', favorites:[], recentlyViewed:[], busy:true, error:'', authMode:'', afterLogin:null, afterLoginRole:'USER'}),
  getters: {
    role: state => state.user?.role ?? 'GUEST',
    cartItems: state => state.cart.flatMap(line => {
      const product = state.products.find(row => row.productId === line.productId)
      return product ? [{...product,quantity:line.quantity}] : []
    }),
    cartWarnings() { return cartCompatibilityWarnings(this.cartItems) },
    incompatibleCartProductIds() {
      return new Set(this.cartWarnings.flatMap(({ part, fit }) => [part.productId, fit.productId]))
    },
    lastAddedHasWarning() { return this.incompatibleCartProductIds.has(this.lastAdded) },
    checkoutItems() {
      return this.cartItems.filter(item => this.checkoutIds === null || this.checkoutIds.includes(item.productId))
    },
    checkoutTotal() { return this.checkoutItems.reduce((sum,item) => sum + item.price * item.quantity,0) },
    cartCount() { return this.cartItems.reduce((sum,row) => sum + row.quantity,0) },
    total() { return this.cartItems.reduce((sum,row) => sum + row.price * row.quantity,0) },
  },
  actions: {
    async initialize() {
      this.busy = true
      try {
        const user = await shop.restore()
        if (user) { this.user = user; if (user.role === 'USER') await this.syncAccount() }
      } catch (error) { this.error = error.message }
      await this.load()
    },
    async syncAccount() {
      const memberId = this.user?.userId
      const [cart,favorites] = await Promise.all([shop.cart(),shop.wishlist()])
      if (this.user?.userId !== memberId) return
      this.cart = cart.map(row => ({productId:String(row.productId),quantity:row.quantity,cartId:row.cartId}))
      this.favorites = favorites.map(row => String(row.productId))
    },
    async updateServerCart(productId, quantity) {
      const line = this.cart.find(row => row.productId === productId)
      if (line?.cartId) {
        if (quantity <= 0) await shop.removeCart(line.cartId)
        else await shop.setCart(line.cartId,quantity)
      } else if (quantity > 0) await shop.addCart(productId,quantity)
      await this.syncAccount()
    },
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
    async quantity(productId, quantity) {
      const product = this.products.find(row => row.productId === productId)
      if (!product || !Number.isInteger(quantity)) return
      const next = Math.min(quantity,product.stock)
      if (this.role === 'USER') {
        if (this.cartSaving) { this.cartNotice='장바구니를 저장하고 있습니다.'; return false }
        this.cartSaving = true
        try { await this.updateServerCart(productId,next); return true }
        catch (error) { this.cartNotice = error.message; return false }
        finally { this.cartSaving = false }
      }
      const line = this.cart.find(row => row.productId === productId)
      if (next <= 0) this.cart = this.cart.filter(row => row.productId !== productId)
      else if (line) line.quantity = next
      else this.cart.push({productId,quantity:next})
      if (this.role === 'GUEST') {
        try { sessionStorage.setItem(cartKey,JSON.stringify(this.cart)) } catch { /* In-memory cart remains usable. */ }
      }
    },
    async completeCheckout(items) {
      for (const item of items) {
        const current = this.cart.find(line => line.productId === item.productId)
        if (current) await this.updateServerCart(item.productId,Math.max(0,current.quantity-item.quantity))
      }
      this.checkoutIds = null
    },
    async addAndShow(productId, amount = 1) {
      if (this.role === 'ADMIN') return
      const product = this.products.find(row => row.productId === productId)
      if (!product) return
      const before = this.cart.find(row => row.productId === productId)?.quantity ?? 0
      const saved=await this.quantity(productId, before + amount)
      if (saved === false) { this.cartOpen=true; return null }
      const after = this.cart.find(row => row.productId === productId)?.quantity ?? 0
      this.cartNotice = after > before ? product.name + ' ' + (after - before) + '개를 담았습니다.' : '담을 수 있는 재고를 모두 담았습니다.'
      this.lastAdded = productId
      this.cartOpen = true
      return after > before && this.lastAddedHasWarning
    },
    reviewCartCompatibility(items, label, proceed) {
      const warnings = items === this.cartItems ? this.cartWarnings : cartCompatibilityWarnings(items)
      if (!warnings.length) return proceed()
      this.cartReview = { warnings, label, proceed }
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
        const guest = [...this.cart].filter(row => !row.cartId)
        await this.syncAccount()
        for (const row of guest) {
          try { await shop.addCart(row.productId,row.quantity) }
          catch (error) { this.cartNotice = error.message }
        }
        await this.syncAccount()
        try { sessionStorage.removeItem(cartKey) } catch { /* Storage is optional. */ }
      } else this.cart = []
      this.closeAuth()
      await continuation?.()
    },
    recordView(productId) {
      if (this.role !== 'USER') return
      this.recentlyViewed = [productId,...this.recentlyViewed.filter(id => id !== productId)].slice(0,12)
    },
    async favorite(productId) {
      if (this.role !== 'USER') return
      try { await shop.favorite(productId,!this.favorites.includes(productId)); await this.syncAccount() }
      catch (error) { this.cartNotice = error.message }
    },
    async signOut() { try { await shop.logout() } catch (error) { this.cartNotice = error.message; return } this.lastCheckout = null; this.checkoutIds = null; this.cartOpen = false; this.cartReview = null; this.cartNotice = ''; this.lastAdded = ''; this.user = null; this.cart = guestCart(); this.favorites = []; this.recentlyViewed = []; this.closeAuth() },
  },
})
