const FONT_ID = 'lesson-board-font'
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&display=swap'

/** The board's handwriting font, fetched only by people who open the lessons. */
export function loadBoardFont() {
  if (document.getElementById(FONT_ID)) return
  const link = document.createElement('link')
  link.id = FONT_ID
  link.rel = 'stylesheet'
  link.href = FONT_URL
  document.head.appendChild(link)
}
