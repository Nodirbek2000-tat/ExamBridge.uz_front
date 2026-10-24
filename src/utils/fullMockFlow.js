/**
 * Full mock hand-off between the rehearsal page and the exam screens.
 *
 * Before opening a section, the full mock page remembers "this attempt
 * belongs to full mock N" for this browser tab. When the section's exam
 * screen finishes (or the student leaves it), it asks fullMockReturn() and,
 * if there is an answer, goes back to the full mock instead of its own
 * result page — the rehearsal then opens the next section.
 *
 * kind is the test type the section runs on (ielts_listening, cefr_writing…);
 * id is the attempt / response id that exam screen works with.
 */
const key = (kind, id) => `fullmock:${kind}:${id}`

export function rememberFullMockStep(kind, id, backUrl) {
  try { sessionStorage.setItem(key(kind, id), backUrl) } catch { /* private mode: the result page shows a link back */ }
}

export function fullMockReturn(kind, id) {
  if (!id) return null
  try { return sessionStorage.getItem(key(kind, id)) } catch { return null }
}
