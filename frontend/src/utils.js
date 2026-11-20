export const money = (value) => new Intl.NumberFormat('ko-KR',{style:'currency',currency:'KRW'}).format(value)
export const dateLabel = (value) => new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium'}).format(new Date(value))
