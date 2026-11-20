export const canShop = role => role === 'USER' || role === 'ADMIN'
export const canAccessRole = (role,required) => !required || role === required || (required === 'USER' && canShop(role))
