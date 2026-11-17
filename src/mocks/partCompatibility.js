// Example specifications for the demo catalog.
const cpuSockets = { P1:'AM5', P11:'LGA1851' }
const motherboardSockets = { P2:'AM5' }
const gpuLengths = { P4:342, P13:320 }
const caseLimits = { P7:355 }

for (const [index, socket] of ['AM4','LGA1700','AM5','LGA1851','AM4','LGA1700','AM5','LGA1851'].entries()) {
  cpuSockets['GT-1-' + (index + 3)] = socket
}
for (const [index, socket] of ['AM4','LGA1700','AM5','LGA1851','AM5','LGA1700','AM5','AM4','LGA1851'].entries()) {
  motherboardSockets['GT-2-' + (index + 2)] = socket
}
for (const [index, length] of [205,245,278,304,316,325,338,355].entries()) {
  gpuLengths['GT-4-' + (index + 3)] = length
}
for (const [index, limit] of [270,315,370,345,410,295,335,380,360].entries()) {
  caseLimits['GT-7-' + (index + 2)] = limit
}

export function demoPartCompatibility(productId) {
  if (Object.hasOwn(cpuSockets,productId)) return { socket:cpuSockets[productId] }
  if (Object.hasOwn(motherboardSockets,productId)) return { socket:motherboardSockets[productId] }
  if (Object.hasOwn(gpuLengths,productId)) return { gpuLengthMm:gpuLengths[productId] }
  if (Object.hasOwn(caseLimits,productId)) return { maxGpuLengthMm:caseLimits[productId] }
  return undefined
}
