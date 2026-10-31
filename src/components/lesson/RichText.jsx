import { useMemo } from 'react'
import { mathHtml } from './lessonMath'
import { parseInline } from './timeline'

/** Question text with the same **bold** and \( math \) as the board, without the writing effect. */
export default function RichText({ text }) {
  const tokens = useMemo(() => parseInline(text), [text])
  return tokens.map((token, i) => {
    if (token.kind === 'space') return ' '
    if (token.kind === 'math') {
      return <span key={i} dangerouslySetInnerHTML={{ __html: mathHtml(token.value) }} />
    }
    return token.bold ? <strong key={i}>{token.value}</strong> : <span key={i}>{token.value}</span>
  })
}
