// Array endpoints are cached; Spring Page endpoints are requested one page at a time.
export function createAdminReader(get, ttl = 60000) {
  const arrays = new Map()
  return {
    clear() { arrays.clear() },
    async array(path) {
      let entry = arrays.get(path)
      if (!entry || Date.now() - entry.time > ttl) {
        entry = {time:Date.now()}
        entry.promise = Promise.resolve().then(() => get(path)).then(({data}) => {
          if (!Array.isArray(data)) throw new Error('목록 응답 형식이 올바르지 않습니다.')
          return data
        }).catch(error => { if (arrays.get(path) === entry) arrays.delete(path); throw error })
        arrays.set(path,entry)
      }
      return entry.promise
    },
    async page(path, {page=0,size=20,sort='newest',status='',signal}={}) {
      const params = {page:Math.max(0,Math.trunc(page) || 0),size:Math.min(100,Math.max(1,Math.trunc(size) || 20)),sort:`createdAt,${sort==='oldest' ? 'asc' : 'desc'}`}
      if (status) params.status = status
      const {data} = await get(status ? `${path}/status` : path,{params,signal})
      if (!Array.isArray(data?.content) || !Number.isSafeInteger(data.totalPages) || !Number.isSafeInteger(data.totalElements)) throw new Error('페이지 응답 형식이 올바르지 않습니다.')
      return {rows:data.content,page:data.number ?? params.page,size:params.size,totalPages:data.totalPages,totalElements:data.totalElements}
    },
  }
}
