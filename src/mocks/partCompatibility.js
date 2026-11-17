// Example specifications for the demo catalog.
const cpuSockets = { P1:'AM5', P11:'LGA1851' }
const motherboardSockets = { P2:'AM5' }
const gpuLengths = { P4:342, P13:320 }
const caseLimits = { P7:355 }
const gpuPower = { P4:750, P13:750 }
const compactCases = new Set(['GT-7-2','GT-7-6','GT-7-7'])

for (const [index, socket] of ['AM4','LGA1700','AM5','LGA1851','AM4','LGA1700','AM5','LGA1851'].entries()) {
  cpuSockets['GT-1-' + (index + 3)] = socket
}
for (const [index, socket] of ['AM5','LGA1700','AM5','LGA1851','AM4','LGA1700','AM5','AM5','LGA1851'].entries()) {
  motherboardSockets['GT-2-' + (index + 2)] = socket
}
for (const [index, length] of [205,245,278,304,316,325,338,355].entries()) {
  gpuLengths['GT-4-' + (index + 3)] = length
}
for (const [index, limit] of [270,315,370,345,410,295,335,380,360].entries()) {
  caseLimits['GT-7-' + (index + 2)] = limit
}

for (const [index, watts] of [450,500,550,600,650,650,700,750].entries()) {
  gpuPower['GT-4-' + (index + 3)] = watts
}

export function demoPartCompatibility({productId,category,spec}) {
  const memoryType = ['메모리','메인보드'].includes(category) ? spec.match(/\bDDR[45]\b/)?.[0] : undefined
  if (category === '메모리') return { memoryType }
  if (category === '파워') {
    const watts = spec.match(/^(\d+)W\b/)?.[1]
    return { supplyWatts:watts ? Number(watts) : undefined }
  }
  if (Object.hasOwn(cpuSockets,productId)) return { socket:cpuSockets[productId] }
  if (Object.hasOwn(motherboardSockets,productId)) return { socket:motherboardSockets[productId], memoryType, boardFormat:spec.match(/^(Micro ATX|ATX)\b/)?.[0] }
  if (Object.hasOwn(gpuLengths,productId)) return { gpuLengthMm:gpuLengths[productId], recommendedWatts:gpuPower[productId] }
  if (Object.hasOwn(caseLimits,productId)) return { maxGpuLengthMm:caseLimits[productId], supportedBoardFormats:compactCases.has(productId) ? ['Mini-ITX','Micro ATX'] : ['Mini-ITX','Micro ATX','ATX'] }
  return undefined
}
