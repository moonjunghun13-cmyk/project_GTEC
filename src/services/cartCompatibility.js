// Check the known socket and clearance requirements for the parts in the cart.
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
