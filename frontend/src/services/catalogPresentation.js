import catalog from '../mocks/realCatalog.json'
import { withProductDetails } from '../mocks/productDetails'
import { purposeTags, purposes } from '../mocks/purposes'
import { categories } from '../mocks/catalog'

export { categories, purposes }

const byImage = new Map(catalog.map(row => [row.image, row]))
const byName = new Map(catalog.map(row => [row.name, row]))

const boardFormats = new Map([
  ['MINI_ITX', 'Mini-ITX'],
  ['MICRO_ATX', 'Micro ATX'],
  ['ATX', 'ATX'],
])

const storageInterfaces = new Map([
  ['NVME', 'M.2 NVMe'],
  ['SATA', 'SATA'],
])

function readSpecificationFields(spec) {
  const fields = new Map()

  for (const line of spec.split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*):\s*(.+)$/.exec(line.trim())
    if (match) fields.set(match[1], match[2].trim())
  }

  return fields
}

function positiveNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function readList(value, convert = item => item) {
  const items = (value ?? '').split(',')
    .map(item => convert(item.trim()))
    .filter(Boolean)

  return items.length ? items : undefined
}

function supportedStorageInterfaces(fields) {
  const supported = []

  if (fields.get('M2_NVME_SUPPORTED') === 'YES') supported.push('M.2 NVMe')
  if (fields.get('SATA_SUPPORTED') === 'YES') supported.push('SATA')

  return supported.length ? supported : undefined
}

function readCompatibility({ category, spec }) {
  const fields = readSpecificationFields(spec ?? '')

  switch (category) {
    case 'CPU':
      return { socket: fields.get('CPU_SOCKET') }

    case '메인보드':
      return {
        socket: fields.get('CPU_SOCKET'),
        memoryType: fields.get('RAM_TYPE'),
        boardFormat: boardFormats.get(fields.get('FORM_FACTOR')),
        storageInterfaces: supportedStorageInterfaces(fields),
      }

    case '메모리':
      return { memoryType: fields.get('RAM_TYPE') }

    case '그래픽카드':
      return {
        gpuLengthMm: positiveNumber(fields.get('GPU_LENGTH_MM')),
        recommendedWatts: positiveNumber(fields.get('GPU_RECOMMENDED_PSU_W')),
      }

    case '케이스':
      return {
        supportedBoardFormats: readList(fields.get('MAINBOARD_SUPPORT'), value => boardFormats.get(value)),
        supportedPowerFormats: readList(fields.get('PSU_SUPPORT')),
        maxGpuLengthMm: positiveNumber(fields.get('MAX_GPU_LENGTH_MM')),
        maxPsuLengthMm: positiveNumber(fields.get('MAX_PSU_LENGTH_MM')),
      }

    case '파워':
      return {
        supplyWatts: positiveNumber(fields.get('PSU_WATT')),
        powerFormat: fields.get('PSU_FORM_FACTOR'),
        powerSupplyLengthMm: positiveNumber(fields.get('PSU_LENGTH_MM')),
      }

    case 'SSD':
    case 'HDD':
      return {
        storageInterface: storageInterfaces.get(fields.get('STORAGE_INTERFACE')),
        driveBaySize: fields.get('STORAGE_FORM_FACTOR') === '3_5' ? '3.5인치' : undefined,
      }

    default:
      return undefined
  }
}

export function presentProduct(product) {
  const reference = byImage.get(product.image) || byName.get(product.name)

  if (!reference) {
    return withProductDetails({
      ...product,
      compatibility: product.compatibility ?? readCompatibility(product),
    })
  }

  const sameSpecifications = product.spec === reference.spec
  const unchangedModel = sameSpecifications
    && product.name === reference.name
    && product.category === reference.category

  const compatibility = product.compatibility
    ?? (unchangedModel ? reference.compatibility : undefined)
    ?? readCompatibility(product)

  const merged = {
    ...reference,
    ...product,
    sourceProductId: reference.productId,
    brand: reference.brand || '',
    tier: reference.tier,
    compatibility,
    displaySpecifications: sameSpecifications ? reference.displaySpecifications : undefined,
    gallery: product.gallery.map(row => ({
      ...row,
      color: reference.gallery?.find(image => image.image === row.image)?.color || row.color,
    })),
    lifestyle: (reference.lifestyle || [])
      .filter(row => product.gallery.some(image => image.image === row.image)),
  }

  merged.purposes = purposeTags(merged)
  return withProductDetails(merged)
}