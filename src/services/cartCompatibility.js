// Compare the requirements each part declares against the matching parts in the cart.
const rules = [
  {
    partCategory:'CPU', fitCategory:'메인보드', partField:'socket', fitField:'socket',
    fits:(part, fit) => part === fit,
    reason:(part, fit) => 'CPU 소켓 ' + part + '과 메인보드 소켓 ' + fit + '이 달라요.',
  },
  {
    partCategory:'그래픽카드', fitCategory:'케이스', partField:'gpuLengthMm', fitField:'maxGpuLengthMm',
    fits:(part, fit) => part <= fit,
    reason:(part, fit) => '그래픽카드 길이 ' + part + 'mm가 케이스 장착 한도 ' + fit + 'mm를 초과해요.',
  },
  {
    partCategory:'메모리', fitCategory:'메인보드', partField:'memoryType', fitField:'memoryType',
    fits:(part, fit) => part === fit,
    reason:(part, fit) => '메모리는 ' + part + '이고 메인보드는 ' + fit + ' 메모리를 지원해요.',
  },
  {
    partCategory:'메인보드', fitCategory:'케이스', partField:'boardFormat', fitField:'supportedBoardFormats',
    fits:(part, fit) => fit.includes(part),
    reason:(part, fit) => '메인보드는 ' + part + '이고 케이스는 ' + fit.join(' · ') + '까지만 지원해요.',
  },
  {
    partCategory:'그래픽카드', fitCategory:'파워', partField:'recommendedWatts', fitField:'supplyWatts',
    fits:(part, fit) => part <= fit,
    reason:(part, fit) => '파워 정격 ' + fit + 'W가 그래픽카드의 권장 시스템 파워 ' + part + 'W보다 낮아요.',
  },
]

export function cartCompatibilityWarnings(items) {
  return rules.flatMap(rule => {
    const parts = items.filter(item => item.category === rule.partCategory)
    const fits = items.filter(item => item.category === rule.fitCategory)
    // A missing spec or a viable alternative may belong to a separate build.
    const unmatched = (part, partField, candidates, fitField, match) => {
      const spec = part.compatibility?.[partField]
      return spec != null && candidates.length > 0 && candidates.every(candidate => {
        const other = candidate.compatibility?.[fitField]
        return other != null && !match(spec,other)
      })
    }
    return parts.flatMap(part => {
      const noFit = unmatched(part,rule.partField,fits,rule.fitField,rule.fits)
      return fits.flatMap(fit => {
        const a = part.compatibility?.[rule.partField]
        const b = fit.compatibility?.[rule.fitField]
        if (a == null || b == null || rule.fits(a,b)) return []
        const noPart = unmatched(fit,rule.fitField,parts,rule.partField,(x,y)=>rule.fits(y,x))
        if (!noFit && !noPart) return []
        return [{ key:part.productId+'-'+fit.productId, part, fit, reason:rule.reason(a,b) }]
      })
    })
  })
}
