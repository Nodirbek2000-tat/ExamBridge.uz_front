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
