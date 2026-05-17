export function readString(searchParams, key, defaultValue = '') {
  const v = searchParams?.get?.(key)
  if (v == null) return defaultValue
  const t = String(v)
  return t.length ? t : defaultValue
}

export function readEnum(searchParams, key, allowedValues, defaultValue) {
  const v = searchParams?.get?.(key)
  if (v == null) return defaultValue
  const t = String(v)
  return allowedValues.includes(t) ? t : defaultValue
}

export function readInt(searchParams, key, defaultValue) {
  const raw = searchParams?.get?.(key)
  if (raw == null) return defaultValue
  const n = Number.parseInt(String(raw), 10)
  return Number.isFinite(n) ? n : defaultValue
}

function toMutableParams(searchParams) {
  return new URLSearchParams(searchParams?.toString?.() || '')
}

function setParam(params, key, value, { omitIf = undefined } = {}) {
  if (value == null) {
    params.delete(key)
    return
  }

  const v = String(value)
  if (!v.length) {
    params.delete(key)
    return
  }

  if (omitIf !== undefined && v === String(omitIf)) {
    params.delete(key)
    return
  }

  params.set(key, v)
}

export function replaceUrlQuery(router, pathname, searchParams, updates) {
  const params = toMutableParams(searchParams)
  for (const [key, spec] of Object.entries(updates || {})) {
    if (spec && typeof spec === 'object' && Object.prototype.hasOwnProperty.call(spec, 'value')) {
      setParam(params, key, spec.value, { omitIf: spec.omitIf })
    } else {
      setParam(params, key, spec)
    }
  }

  const qs = params.toString()
  const next = qs ? `${pathname}?${qs}` : pathname
  const current = (() => {
    const curQs = searchParams?.toString?.() || ''
    return curQs ? `${pathname}?${curQs}` : pathname
  })()

  if (next === current) return
  router.replace(next, { scroll: false })
}
