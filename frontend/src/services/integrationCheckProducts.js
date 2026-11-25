// Historical integration checks, already INACTIVE on the server. Never hide
// a real catalog item merely because its ID matches a test database ID.
const testIds=new Set(['1','2','3','4','5','6','7'])
const testNames=new Set(['연동 확인용 상품','브라우저 연동 확인용 상품'])
export function isIntegrationCheckProduct(row){
 return testIds.has(String(row.id ?? row.productId)) && testNames.has(row.name) && (row.status ?? row.backendStatus)==='INACTIVE'
}
