'use client'

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

/**
 * Debounced load/save for bucketed notification preferences.
 *
 * @param {{
 *   fetchPreferences: () => Promise<unknown>,
 *   savePreferences: (prefs: Record<string, unknown>) => Promise<unknown>,
 *   mergePreferences: (raw: unknown) => Record<string, { push: boolean, email: boolean }>,
 *   defaultPreferences: () => Record<string, { push: boolean, email: boolean }>,
 *   debounceMs?: number,
 *   loadErrorMessage?: string,
 *   saveErrorMessage?: string,
 * }} config
 */
export function useNotificationPreferences({
  fetchPreferences,
  savePreferences,
  mergePreferences,
  defaultPreferences,
  debounceMs = 400,
  loadErrorMessage = 'Failed to load preferences.',
  saveErrorMessage = 'Could not save preferences.',
}) {
  const [prefs, setPrefs] = useState(defaultPreferences)
  const prefsRef = useRef(prefs)
  const [loading, setLoading] = useState(true)
  const [saveError, setSaveError] = useState('')
  const saveTimerRef = useRef(null)

  const persistMerged = useCallback(
    async (next) => {
      const saved = await savePreferences(next)
      return mergePreferences(saved)
    },
    [mergePreferences, savePreferences],
  )

  useEffect(() => {
    prefsRef.current = prefs
  }, [prefs])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setSaveError('')
      try {
        const preferences = await fetchPreferences()
        if (!cancelled) setPrefs(mergePreferences(preferences))
      } catch (err) {
        if (!cancelled) setSaveError(err?.message || loadErrorMessage)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    queueMicrotask(() => {
      load()
    })

    return () => {
      cancelled = true
    }
  }, [fetchPreferences, loadErrorMessage, mergePreferences])

  const flushPendingSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    setSaveError('')
    const next = prefsRef.current
    try {
      const saved = await persistMerged(next)
      setPrefs(saved)
    } catch (err) {
      setSaveError(err?.message || saveErrorMessage)
      throw err
    }
  }, [persistMerged, saveErrorMessage])

  const scheduleSave = useCallback(
    (next) => {
      setPrefs(next)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        setSaveError('')
        try {
          const saved = await persistMerged(next)
          setPrefs(saved)
        } catch (err) {
          setSaveError(err?.message || saveErrorMessage)
        }
      }, debounceMs)
    },
    [debounceMs, persistMerged, saveErrorMessage],
  )

  const setChannel = useCallback(
    (categoryKey, channelId, value) => {
      setPrefs((prev) => {
        const next = {
          ...prev,
          [categoryKey]: {
            ...prev[categoryKey],
            [channelId]: value,
          },
        }
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave],
  )

  const toggleChannel = useCallback(
    (bucket, channel, value) => {
      const next = {
        ...prefsRef.current,
        [bucket]: {
          ...prefsRef.current[bucket],
          [channel]: value,
        },
      }
      scheduleSave(next)
    },
    [scheduleSave],
  )

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    },
    [],
  )

  return {
    prefs,
    setPrefs,
    prefsRef,
    loading,
    saveError,
    setChannel,
    toggleChannel,
    scheduleSave,
    flushPendingSave,
  }
}

/**
 * @param {ReturnType<typeof useNotificationPreferences>} prefsState
 * @param {React.Ref<unknown>} ref
 */
export function useNotificationPreferencesImperativeHandle(prefsState, ref) {
  useImperativeHandle(
    ref,
    () => ({
      flushPendingSave: prefsState.flushPendingSave,
    }),
    [prefsState.flushPendingSave],
  )
}
