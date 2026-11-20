import { defineStore } from 'pinia'
import { shop, restoreSession, logoutSession } from '../services'
import { cartCompatibilityWarnings } from '../services/cartCompatibility'
import { canShop,canAccessRole } from '../services/memberAccess'

const cartKey = 'gt-demo-guest-cart'
const apiAuth = (import.meta.env.VITE_AUTH_MODE || 'api') === 'api'
const cartSyncQueues = new WeakMap()
function guestCart() {
  try {
    const rows = JSON.parse(sessionStorage.getItem(cartKey) || '[]')
    return rows.filter(row => typeof row.productId === 'string' && Number.isInteger(row.quantity) && row.quantity > 0)
  } catch { return [] }
}
export const useShop = defineStore('shop', {
  state: () => ({user:null, products:[], categories:[], purposes:[], cart:guestCart(), cartOpen:false, cartReview:null, checkoutIds:null, lastCheckout:null, deliveryAddresses:{}, cartNotice:'', lastAdded:'', favorites:[], recentlyViewed:[], busy:true, error:'', authMode:'', afterLogin:null, afterLoginRole:'USER'}),
  getters: {
    role: state => state.user?.role ?? 'GUEST',
    canShop: state => canShop(state.user?.role),
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
    async load() {
      this.busy = true
      this.error = ''
      try {
        const restoredUser = await restoreSession()
        if (restoredUser) this.user = restoredUser
        const catalog = await shop.catalog()
        this.products = catalog.products
        this.categories = catalog.categories; this.purposes = catalog.purposes
        if (this.canShop) {
          try { this.favorites = await shop.wishlist() } catch { this.favorites = [] }
          this.cart = (await shop.cart()).filter(line => this.products.some(row => row.productId === line.productId))
        } else this.cart = this.cart.filter(line => this.products.some(row => row.productId === line.productId))
      } catch (error) { this.error = error.message }
      finally { this.busy = false }
    },
    quantity(productId, quantity) {
      const product = this.products.find(row => row.productId === productId)
      if (!product || !Number.isInteger(quantity)) return
      const next = Math.min(quantity,product.stock)
      const line = this.cart.find(row => row.productId === productId)
      const previous = this.cart.map(row => ({...row}))
      if (next <= 0) this.cart = this.cart.filter(row => row.productId !== productId)
      else if (line) line.quantity = next
      else { this.cart.push({productId,quantity:next}); }
      if (this.role === 'GUEST') {
        try { sessionStorage.setItem(cartKey,JSON.stringify(this.cart)) } catch { /* In-memory cart remains usable. */ }
      } else if (apiAuth) {
        const prior = cartSyncQueues.get(this) ?? Promise.resolve()
        const sync = prior.catch(() => {}).then(async () => {
          const desired = this.cart.find(row => row.productId === productId)
          const cartItemId = desired?.cartItemId ?? line?.cartItemId
          if (!desired) {
            if (cartItemId) await shop.removeCart(cartItemId)
          } else if (cartItemId) await shop.updateCart(cartItemId,desired.quantity)
          else {
            const addedId = await shop.addCart(productId,desired.quantity)
            line && (line.cartItemId = addedId)
            const current = this.cart.find(row => row.productId === productId)
            if (current) current.cartItemId = addedId
          }
        })
        cartSyncQueues.set(this,sync)
        sync.catch(async error => {
          this.error = error.message
          try { this.cart = await shop.cart() } catch { this.cart = previous }
        })
        return sync
      }
    },
    async completeCheckout(items) {
      if (apiAuth && this.canShop) {
        await (cartSyncQueues.get(this) ?? Promise.resolve()).catch(() => {})
        this.cart = await shop.cart()
      }
      for (const item of items) {
        const current = this.cart.find(line => line.productId === item.productId)
        if (!current) continue
        const next = Math.max(0,current.quantity-item.quantity)
        if (apiAuth && this.canShop && current.cartItemId) {
          if (next === 0) {
            await shop.removeCart(current.cartItemId)
            this.cart = this.cart.filter(line => line.productId !== item.productId)
          } else {
            await shop.updateCart(current.cartItemId,next)
            current.quantity = next
          }
        } else this.quantity(item.productId,next)
      }
      this.checkoutIds = null
    },
    addAndShow(productId, amount = 1) {
      const product = this.products.find(row => row.productId === productId)
      if (!product) return
      const before = this.cart.find(row => row.productId === productId)?.quantity ?? 0
      this.quantity(productId, before + amount)
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
      if (this.canShop) return action()
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
      const continuation = canAccessRole(user.role,this.afterLoginRole) ? this.afterLogin : null
      this.user = user
      if (canShop(user.role)) {
        try { this.favorites = await shop.wishlist() } catch { this.favorites = [] }
        if (apiAuth) {
          const guestItems = this.cart.map(({productId,quantity}) => ({productId,quantity}))
          try {
            const remote = await shop.cart()
            for (const item of guestItems) {
              if (!remote.some(row => row.productId === item.productId)) await shop.addCart(item.productId,item.quantity)
            }
            this.cart = await shop.cart()
          } catch (error) { this.error = error.message }
        }
      }
      if (canShop(user.role)) {
        try { sessionStorage.removeItem(cartKey) } catch { /* Storage is optional. */ }
      } else this.cart = []
      this.closeAuth()
      await continuation?.()
    },
    recordView(productId) {
      if (!this.canShop) return
      this.recentlyViewed = [productId,...this.recentlyViewed.filter(id => id !== productId)].slice(0,12)
    },
    favorite(productId) {
      if (!this.canShop) return
      const enabled = !this.favorites.includes(productId)
      const previous = this.favorites
      this.favorites = enabled ? [...previous,productId] : previous.filter(id => id !== productId)
      return shop.setFavorite(this.user.userId,productId,enabled).catch(error => {
        this.favorites = previous
        this.error = error.message
      })
    },
    async signOut() {
      try { await logoutSession() } catch { /* Clear local state even when the server is unavailable. */ }
      this.lastCheckout = null; this.checkoutIds = null; this.cartOpen = false; this.cartReview = null
      this.cartNotice = ''; this.lastAdded = ''; this.user = null; this.cart = guestCart()
      this.favorites = []; this.recentlyViewed = []; this.closeAuth()
    },
  },
})
