'use client'

import { useState, useEffect } from 'react'

/**
 * Returns whether the given media query matches. Updates when the viewport crosses the breakpoint.
 * @param {string} query - CSS media query (e.g. '(max-width: 860px)')
 * @returns {boolean}
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)

    const listener = (e) => setMatches(e.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}
