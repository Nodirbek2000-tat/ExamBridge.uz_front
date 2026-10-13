// Helpers for the "All · Full Mock · Part N" filter chips (CEFR lists).

export function kindChips(partTotal, fullLabel = 'Full Mock') {
  return [
    { key: 'ALL', label: 'All' },
    { key: 'FULL', label: fullLabel },
    ...Array.from({ length: partTotal }, (_, i) => ({ key: String(i + 1), label: `Part ${i + 1}` })),
  ]
}

// CEFR list item → 'FULL' or its part number. A "mock" holding a single part is
// that Part, not a Full Mock.
export function cefrKind(item, partField) {
  if (item.item_type === 'full_mock') {
    const nums = item.part_numbers || []
    if (nums.length === 1 || item.part_count === 1) return String(nums[0] || 1)
    return 'FULL'
  }
  return String(item[partField] || 1)
}

export function countKinds(items, kindOf) {
  const counts = { ALL: items.length }
  items.forEach((item) => { const k = kindOf(item); counts[k] = (counts[k] || 0) + 1 })
  return counts
}

// Writing / Speaking: a test lists the parts it holds (e.g. ['1.1', '1.2', '2']).
// FULL = the complete paper; a part chip shows every other test that holds that part.
export function partChips(keys) {
  return [
    { key: 'ALL', label: 'All' },
    { key: 'FULL', label: 'Full Mock' },
    ...keys.map((k) => ({ key: k, label: `Part ${k}` })),
  ]
}

export function matchesPart(item, chip, partsOf, isFull) {
  if (chip === 'ALL') return true
  if (chip === 'FULL') return isFull(item)
  return !isFull(item) && partsOf(item).includes(chip)
}

export function partCounts(items, keys, partsOf, isFull) {
  const counts = { ALL: items.length, FULL: items.filter(isFull).length }
  keys.forEach((k) => { counts[k] = items.filter((i) => matchesPart(i, k, partsOf, isFull)).length })
  return counts
}

// "Part 1.2", "Part 1" (both letters), "Part 1.1 + 2" …
export function partLabel(parts) {
  if (parts.length === 2 && parts[0] === '1.1' && parts[1] === '1.2') return 'Part 1'
  return `Part ${parts.join(' + ')}`
}
