/*
 * How well did the learner say a sentence? Pure functions, no React.
 *
 * Browser speech recognition writes what it heard in its own way — "7" for
 * "seven", "I'm" for "I am", "two" for "too" — so both sides are normalised
 * before they are compared, and words are aligned in order (LCS), so one
 * missed word does not shift every word after it.
 */

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const ORDINALS = { '1st': 'first', '2nd': 'second', '3rd': 'third', '4th': 'fourth', '5th': 'fifth', '6th': 'sixth',
  '7th': 'seventh', '8th': 'eighth', '9th': 'ninth', '10th': 'tenth' }
const CONTRACTIONS = {
  "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are', "he's": 'he is', "she's": 'she is',
  "it's": 'it is', "that's": 'that is', "there's": 'there is', "what's": 'what is', "let's": 'let us', "i've": 'i have',
  "you've": 'you have', "we've": 'we have', "i'll": 'i will', "you'll": 'you will', "we'll": 'we will', "i'd": 'i would',
  "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "can't": 'can not', 'cannot': 'can not', "won't": 'will not',
  "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not', "haven't": 'have not',
  "hasn't": 'has not', "wouldn't": 'would not', "shouldn't": 'should not', "couldn't": 'could not', 'gonna': 'going to',
  // the same without the apostrophe (some recognisers and typists drop it)
  dont: 'do not', doesnt: 'does not', didnt: 'did not', cant: 'can not', wont: 'will not', isnt: 'is not', arent: 'are not',
  wasnt: 'was not', werent: 'were not', havent: 'have not', hasnt: 'has not', wouldnt: 'would not', shouldnt: 'should not',
  couldnt: 'could not', im: 'i am', youre: 'you are', theyre: 'they are', thats: 'that is', whats: 'what is', ive: 'i have',
  'wanna': 'want to',
}
// words recognisers swap because they sound the same — never the learner's fault
const SOUND_ALIKE = [
  ['to', 'too', 'two'], ['for', 'four'], ['there', 'their', 'theyre'], ['right', 'write'], ['buy', 'by', 'bye'],
  ['eight', 'ate'], ['know', 'no'], ['hear', 'here'], ['see', 'sea'], ['one', 'won'], ['our', 'hour'], ['new', 'knew'],
  ['wear', 'where'], ['weather', 'whether'], ['meet', 'meat'], ['week', 'weak'], ['tea', 'tee'], ['red', 'read'],
  ['ok', 'okay'], ['mum', 'mom', 'mam'], ['colour', 'color'], ['favourite', 'favorite'], ['grey', 'gray'], ['metre', 'meter'],
  ['centre', 'center'], ['theatre', 'theater'], ['mr', 'mister'], ['mrs', 'missus'], ['pyjamas', 'pajamas'],
  ['tv', 'telly'], ['mommy', 'mummy'], ['practise', 'practice'], ['travelling', 'traveling'],
]
// recognisers write these as one word or two — both sides are joined the same way
const COMPOUNDS = new Set(['goodnight', 'goodbye', 'icecream', 'homework', 'bedroom', 'bathroom', 'breakfast', 'weekend',
  'afternoon', 'football', 'basketball', 'everyone', 'everybody', 'everything', 'anything', 'something', 'someone', 'anyone',
  'today', 'tonight', 'tomorrow', 'sunglasses', 'toothbrush', 'toothpaste', 'haircut', 'birthday', 'supermarket', 'textbook',
  'notebook', 'classroom', 'playground', 'raincoat', 'pancake', 'pancakes', 'cupcake', 'downstairs', 'upstairs', 'outside',
  'inside', 'sometimes', 'everyday', 'popcorn', 'airport', 'online', 'website', 'grandma', 'grandpa', 'cannot', 'into', 'onto'])
const ALIKE = new Map()
SOUND_ALIKE.forEach((group, i) => group.forEach(w => ALIKE.set(w, i)))

export function numberToWords(n) {
  if (!Number.isFinite(n) || n < 0 || n > 9999) return String(n)
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numberToWords(n % 100) : '')
  return numberToWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '')
}

/* "I'm up at 7:30!" → ['i', 'am', 'up', 'at', 'seven', 'thirty'] */
export function normalizeWords(text) {
  return joinCompounds(tokenize(text).map(t => ({ tok: t }))).map(x => x.tok)
}

// "good night" / "goodnight", "ice cream" / "icecream" … (items keep any extra fields, e.g. which shown word they came from)
function joinCompounds(items) {
  const out = []
  for (let i = 0; i < items.length; i++) {
    const both = i + 1 < items.length ? items[i].tok + items[i + 1].tok : ''
    if (both && both !== 'cannot' && COMPOUNDS.has(both)) {
      out.push({ ...items[i], tok: both, owners: [...(items[i].owners || []), ...(items[i + 1].owners || [])] })
      i++
    } else out.push(items[i])
  }
  return out
}

function tokenize(text) {
  let s = String(text || '').toLowerCase().replace(/[’‘`]/g, "'")
  s = s.replace(/\bo\s?['’]?\s?clock\b/g, ' oclock ')
  s = s.replace(/(\d+):(\d{2})/g, (_, h, m) => ` ${h} ${m === '00' ? 'oclock' : Number(m) < 10 ? 'oh ' + Number(m) : m} `)
  s = s.replace(/\$(\d+)/g, ' $1 dollars ')
  s = s.replace(/(\d+)%/g, ' $1 percent ')
  s = s.replace(/(^|\s)t\.\s?v\.?(?=\s|$)/g, ' tv ')         // "T.V." / "t. v." -> tv (plain "tv" is already one word)
  const out = []
  for (let raw of s.split(/\s+/)) {
    raw = raw.replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '')
    if (!raw) continue
    if (CONTRACTIONS[raw]) { out.push(...CONTRACTIONS[raw].split(' ')); continue }
    if (ORDINALS[raw]) { out.push(ORDINALS[raw]); continue }
    if (/^\d+$/.test(raw)) { out.push(...numberToWords(Number(raw)).split(' ')); continue }
    raw = raw.replace(/'s$/, '').replace(/'/g, '')
    if (raw) out.push(raw)
  }
  return out
}

function editDistance(a, b) {
  if (a === b) return 0
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}

/* 2 = the same word, 1 = nearly (plural, one letter off), 0 = different */
export function wordMatch(target, heard) {
  if (target === heard) return 2
  if (ALIKE.has(target) && ALIKE.get(target) === ALIKE.get(heard)) return 2
  const stem = (w) => w.replace(/(ing|ed|es|s)$/, '')
  if (target.length >= 4 && stem(target) === stem(heard)) return 1
  const d = editDistance(target, heard)
  if (target.length >= 8 && d <= 2) return 1
  if (target.length >= 4 && d <= 1) return 1
  return 0
}

/*
 * Compare what should be said with what was heard.
 * → { words: [{ text, status: 'ok' | 'close' | 'miss' }], score 0–1, verdict, passed }
 *   verdict: 'perfect' ≥ 0.9 · 'good' ≥ passAt (0.8 — a 4-word line cannot pass with a word missing) · 'almost' ≥ 0.5 · 'wrong'
 */
export function matchSentence(target, heard, { passAt = 0.8 } = {}) {
  const shown = String(target || '').split(/\s+/).filter(Boolean)          // what the learner sees
  // normalised target tokens, each remembering which shown word(s) it came from
  const tItems = joinCompounds(shown.flatMap((w, idx) => tokenize(w).map(tok => ({ tok, owners: [idx] }))))
  const t = tItems.map(x => x.tok)
  const h = normalizeWords(heard)
  // longest weighted common subsequence of normalised words
  const W = Array.from({ length: t.length + 1 }, () => new Array(h.length + 1).fill(0))
  for (let i = t.length - 1; i >= 0; i--) {
    for (let j = h.length - 1; j >= 0; j--) {
      const m = wordMatch(t[i], h[j])
      W[i][j] = Math.max(W[i + 1][j], W[i][j + 1], m ? m + W[i + 1][j + 1] : 0)
    }
  }
  const status = new Array(t.length).fill('miss')
  for (let i = 0, j = 0; i < t.length && j < h.length;) {
    const m = wordMatch(t[i], h[j])
    if (m && W[i][j] === m + W[i + 1][j + 1]) { status[i] = m === 2 ? 'ok' : 'close'; i++; j++ }
    else if (W[i + 1][j] >= W[i][j + 1]) i++
    else j++
  }
  const score = t.length ? status.reduce((s, x) => s + (x === 'ok' ? 1 : x === 'close' ? 0.6 : 0), 0) / t.length : 0
  // map normalised statuses back onto the words the learner sees
  const per = shown.map(() => [])
  tItems.forEach((it, i) => it.owners.forEach(o => per[o].push(status[i])))
  const words = shown.map((w, i) => ({
    text: w,
    // a lone "—" or "&" has no tokens and is not judged
    status: !per[i].length || per[i].every(x => x === 'ok') ? 'ok' : per[i].some(x => x !== 'miss') ? 'close' : 'miss',
  }))
  // short lines (1–3 words) must be said completely
  const short = t.length <= 3
  const passed = short ? status.every(x => x !== 'miss') && score >= 0.6 : score >= passAt
  const verdict = score >= 0.9 && passed ? 'perfect' : passed ? 'good' : score >= 0.5 ? 'almost' : 'wrong'
  return { words, score: Math.round(score * 100) / 100, verdict, passed, heard: String(heard || '').trim() }
}

/* Several recogniser guesses → the one that matches best. */
export function bestMatch(target, alternatives, opts) {
  let best = null
  for (const alt of alternatives.length ? alternatives : ['']) {
    const r = matchSentence(target, alt, opts)
    if (!best || r.score > best.score) best = r
  }
  return best
}

/*
 * Which command was said? commands: [{ key, keywords: ['turn', 'left'] }]
 * A command counts when all its keywords were heard (in any order);
 * the most specific one wins. → key or null
 */
export function matchCommand(heard, commands) {
  const words = normalizeWords(heard)
  let best = null
  for (const c of commands) {
    const kws = c.keywords.flatMap(normalizeWords)
    if (kws.every(k => words.some(w => wordMatch(k, w) === 2)) && (!best || kws.length > best.n)) best = { key: c.key, n: kws.length }
  }
  return best ? best.key : null
}
