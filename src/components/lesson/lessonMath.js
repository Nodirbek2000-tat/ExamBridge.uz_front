import katex from 'katex'

/** A formula as HTML. trust stays off: lesson text cannot reach links, styles or HTML. */
export function mathHtml(tex, displayMode = false) {
  return katex.renderToString(tex, { displayMode, throwOnError: false, trust: false, strict: 'ignore' })
}
