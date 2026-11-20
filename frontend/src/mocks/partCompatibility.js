// Example specifications for the demo catalog.
const cpuSockets = { P1:'AM5', P11:'LGA1851' }
const motherboardSockets = { P2:'AM5' }
const gpuLengths = { P4:342, P13:320 }
const caseLimits = { P7:355 }
const gpuPower = { P4:750, P13:750 }
const compactCases = new Set(['GT-7-2','GT-7-6','GT-7-7'])
const sfxPowerSupplies = new Set(['GT-6-2','GT-6-7'])
const powerSuppliesWith16Pin = new Set(['P6','GT-6-4','GT-6-5','GT-6-9','GT-6-10'])
const gpuSlotWidths = { P4:3.5, P13:2.5 }
const gpuPowerConnectors = { P4:{pin:16,count:1}, P13:{pin:8,count:2} }
const storageInterfacesByBoard = { 'GT-2-4':['M.2 NVMe'], 'GT-2-6':['SATA'] }

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

for (const [index, slots] of [2,2,2,2.5,2.5,3,3,3.5].entries()) {
  const productId = 'GT-4-' + (index + 3)
  gpuSlotWidths[productId] = slots
  gpuPowerConnectors[productId] = index >= 6 ? {pin:16,count:1} : {pin:8,count:index >= 2 ? 2 : 1}
}

export function demoPartCompatibility({productId,category,spec,interface:driveInterface,formFactor}) {
  if (['SSD','HDD'].includes(category) && driveInterface) {
    return { storageInterface:driveInterface === 'NVMe' ? 'M.2 NVMe' : driveInterface, driveBaySize:formFactor === 'M.2' ? undefined : formFactor }
  }
  const memoryType = ['메모리','메인보드'].includes(category) ? spec.match(/\bDDR[45]\b/)?.[0] : undefined
  if (category === '메모리') return { memoryType }
  if (category === '파워') {
    const watts = spec.match(/^(\d+)W\b/)?.[1]
    return {
      supplyWatts:watts ? Number(watts) : undefined,
      powerFormat:sfxPowerSupplies.has(productId) ? 'SFX' : 'ATX',
      gpuCables:{ 8:Number(watts) >= 650 ? 2 : 1, 16:powerSuppliesWith16Pin.has(productId) ? 1 : 0 },
    }
  }
  if (Object.hasOwn(cpuSockets,productId)) return { socket:cpuSockets[productId] }
  if (Object.hasOwn(motherboardSockets,productId)) return {
    socket:motherboardSockets[productId], memoryType, boardFormat:spec.match(/^(Micro ATX|ATX)\b/)?.[0],
    storageInterfaces:storageInterfacesByBoard[productId] ?? ['M.2 NVMe','SATA'],
  }
  if (Object.hasOwn(gpuLengths,productId)) return {
    gpuLengthMm:gpuLengths[productId], recommendedWatts:gpuPower[productId],
    gpuSlotWidth:gpuSlotWidths[productId], gpuPowerConnector:gpuPowerConnectors[productId],
  }
  if (Object.hasOwn(caseLimits,productId)) {
    const compact = compactCases.has(productId)
    return {
      maxGpuLengthMm:caseLimits[productId], maxGpuSlotWidth:compact ? 2 : 4,
      supportedBoardFormats:compact ? ['Mini-ITX','Micro ATX'] : ['Mini-ITX','Micro ATX','ATX'],
      supportedPowerFormats:compact ? ['SFX'] : ['ATX'],
      driveBays:compact ? ['2.5인치'] : ['2.5인치','3.5인치'],
    }
  }
  return undefined
}
