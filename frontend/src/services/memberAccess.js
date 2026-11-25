export const canShop = role => role === 'USER'
export const canAccessRole = (role,required) => !required || role === required || (required === 'USER' && canShop(role))
