/** The part (CEFR) or passage / section (IELTS) a reading or listening item is. */
export const partOf = (item) => item.section_number ?? item.passage_number ?? null
