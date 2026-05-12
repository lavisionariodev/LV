/**
 * Whether a bulk "set status to targetStatus" action should remain available.
 * Returns false when every selected row is already at targetStatus (no-op).
 * Unknown ids (getRecord returns null/undefined) keep the action available.
 *
 * @param {Iterable<string>} selectedIds
 * @param {(id: string) => unknown | null | undefined} getRecord
 * @param {string} targetStatus
 * @param {(record: unknown) => string | undefined} [getStatus]
 * @returns {boolean}
 */
export function bulkStatusActionApplies(
  selectedIds,
  getRecord,
  targetStatus,
  getStatus = (r) => (r && typeof r === 'object' ? r.status : undefined),
) {
  for (const id of selectedIds) {
    const r = getRecord(id)
    if (r == null) return true
    const s = getStatus(r)
    if (s !== targetStatus) return true
  }
  return false
}
