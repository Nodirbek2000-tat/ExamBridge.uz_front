/* Verdicts (RUNNER_PLAN §B3.7, §B11 judge.test): 200+ pairs. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { judge, judgeAnswer, judgeChoice, judgeEcho, judgeFill, judgeWord, tipFor } from '../engine/judge.js'

const W = (text, say_also = []) => ({ k: 'w', id: 1, kind: 'word', pt: 'picture', text, say_also })

// [target, heard, expected] for single words and chunks
const WORDS = [
  ['ticket', 'ticket', 'ok'], ['ticket', 'tickets', 'close'], ['ticket', 'a ticket please', 'ok'], ['ticket', 'Ticket.', 'ok'],
  ['ticket', 'pocket', 'miss'], ['ticket', '', 'none'], ['ticket', 'tick it', 'miss'], ['bus', 'bus', 'ok'], ['bus', 'boss', 'miss'],
  ['bus', 'the bus', 'ok'], ['apple', 'apples', 'close'], ['apple', 'an apple', 'ok'], ['apple', 'Apple!', 'ok'], ['apple', 'able', 'miss'],
  ['bus stop', 'bus stop', 'ok'], ['bus stop', 'bus', 'miss'], ['bus stop', 'the bus stop', 'ok'], ['bus stop', 'bus stops', 'close'],
  ['ice cream', 'icecream', 'ok'], ['ice cream', 'ice cream', 'ok'], ['ice cream', 'I scream', 'miss'], ['good morning', 'good morning', 'ok'],
  ['seven', '7', 'ok'], ['eight', '8', 'ok'], ['twenty', '20', 'ok'], ['two', 'too', 'ok'], ['two', 'to', 'ok'], ['four', 'for', 'ok'],
  ['right', 'write', 'ok'], ['sea', 'see', 'ok'], ['very', 'wery', 'close'], ['very', 'berry', 'miss'], ['window', 'windows', 'close'],
  ['window', 'widow', 'close'], ['banana', 'bananas', 'close'], ['banana', 'panama', 'miss'], ['station', 'stations', 'close'],
  ['station', 'nation', 'miss'], ['grandma', 'grand ma', 'ok'], ['homework', 'home work', 'ok'], ['look for', 'look for', 'ok'],
  ['look for', 'looking for', 'close'], ['look for', 'look', 'miss'], ['T-shirt', 't shirt', 'ok'], ['mum', 'mom', 'ok'],
  ['colour', 'color', 'ok'], ['favourite', 'favorite', 'ok'], ['money', 'many', 'miss'], ['train', 'trains', 'close'], ['train', 'rain', 'close'], ['train', 'plane', 'miss'],
]

test('word and chunk verdicts', () => {
  for (const [t, h, v] of WORDS) assert.equal(judgeWord(W(t), h ? [h] : []).v, v, `${t} ← "${h}"`)
})

test('say_also forms pass, and the best alternative wins', () => {
  assert.equal(judgeWord(W('TV', ['television']), ['television']).v, 'ok')
  assert.equal(judgeWord(W('ticket', ['tickets']), ['tickets']).v, 'ok')
  assert.equal(judgeWord(W('ticket'), ['pocket', 'ticket']).v, 'ok')
  assert.equal(judgeWord(W('ticket'), ['pocket', 'tickets']).v, 'close')
  assert.equal(judgeWord(W('ticket'), ['  ', '']).v, 'none')
  const r = judgeWord(W('apple'), ['red apple'])
  assert.deepEqual(r.words.map(w => w.status), ['ok'])
})

// choice: [target, choices, heard, final, expected]
const CHOICES = [
  ['bus', ['bike', 'bus', 'bench'], 'bus', false, 'ok'],
  ['bus', ['bike', 'bus', 'bench'], 'bike', false, 'hold'],
  ['bus', ['bike', 'bus', 'bench'], 'bike', true, 'miss'],
  ['bus', ['bike', 'bus', 'bench'], 'bike no bus', false, 'ok'],
  ['bus', ['bike', 'bus', 'bench'], 'bus no bike', false, 'hold'],
  ['bus', ['bike', 'bus', 'bench'], 'the bus', true, 'ok'],
  ['bus', ['bike', 'bus', 'bench'], 'hello', false, 'none'],
  ['bus', ['bike', 'bus', 'bench'], 'hello', true, 'miss'],
  ['bus stop', ['bus stop', 'tree', 'clock'], 'bus stop', false, 'ok'],
  ['bus stop', ['bus stop', 'tree', 'clock'], 'bus', true, 'miss'],
  ['apple', ['apple', 'orange', 'grapes'], 'apples', false, 'ok'],
  ['apple', ['apple', 'orange', 'grapes'], 'orange', false, 'hold'],
  ['apple', ['apple', 'orange', 'grapes'], 'orange apple', false, 'ok'],
  ['apple', ['apple', 'orange', 'grapes'], 'grapes', true, 'miss'],
  ['dog', ['cat', 'dog', 'duck'], 'dog', false, 'ok'],
  ['dog', ['cat', 'dog', 'duck'], 'cat dog duck', false, 'hold'],
  ['dog', ['cat', 'dog', 'duck'], 'duck', true, 'miss'],
  ['seven', ['seven', 'eight', 'nine'], '7', false, 'ok'],
  ['seven', ['seven', 'eight', 'nine'], '8', true, 'miss'],
  ['tea', ['tea', 'milk', 'water'], 'tee', false, 'ok'],
]

test('choice prompts (a wrong option is held, then a miss)', () => {
  for (const [t, choices, h, final, v] of CHOICES) {
    assert.equal(judgeChoice({ ...W(t), pt: 'choice', choices }, [h], { final }).v, v, `${t} ← "${h}" (${final ? 'final' : 'live'})`)
  }
  const r = judgeChoice({ ...W('bus'), pt: 'choice', choices: ['bike', 'bus', 'bench'] }, ['bike'])
  assert.equal(r.wrong, 'bike')
})

// echo: [text, heard, level, expected]
const ECHO = [
  ['Excuse me, where is the exit?', 'excuse me where is the exit', 'A2', 'ok'],
  ['Excuse me, where is the exit?', 'excuse me where is exit', 'A2', 'close'],
  ['Excuse me, where is the exit?', 'excuse me where is exit', 'B1', 'close'],
  ['Excuse me, where is the exit?', 'where is the exit', 'A2', 'miss'],
  ['Excuse me, where is the exit?', 'excuse where is the exit', 'A2', 'close'],
  ['Excuse me, where is the exit?', 'where exit', 'A2', 'miss'],
  ['Excuse me, where is the exit?', 'hello', 'A2', 'miss'],
  ['One ticket, please.', 'one ticket please', 'A1', 'ok'],
  ['One ticket, please.', '1 ticket please', 'A1', 'ok'],
  ['One ticket, please.', 'one ticket', 'A1', 'miss'],
  ['I am going to the bazaar.', "I'm going to the bazaar", 'A2', 'ok'],
  ['I am going to the bazaar.', 'I going to the bazaar', 'A2', 'close'],
  ['I am going to the bazaar.', 'I going to bazaar', 'A2', 'miss'],
  ['Where are you from?', 'where you from', 'A2', 'close'],
  ['Where are you from?', 'where you from', 'B1', 'miss'],
  ['Where is the metro?', 'where is the metro', 'A1', 'ok'],
  ['Where is the metro?', 'where the metro', 'A1', 'close'],
  ['How much is this melon?', 'how much is this melon', 'A2', 'ok'],
  ['How much is this melon?', 'how much is melon', 'A2', 'close'],
  ['How much is this melon?', 'how much', 'A2', 'miss'],
  ['Thank you very much.', 'thank you wery much', 'A1', 'ok'],
  ['Thank you very much.', 'thank you much', 'A1', 'close'],
  ['Can I have some water, please?', 'can I have some water please', 'A2', 'ok'],
  ['Can I have some water, please?', 'can I have water please', 'A2', 'close'],
  ['Can I have some water, please?', 'water please', 'A2', 'miss'],
]

test('echo thresholds by level', () => {
  for (const [t, h, lv, v] of ECHO) assert.equal(judgeEcho({ kind: 'echo', text: t }, [h], { level: lv }).v, v, `${t} ← "${h}" (${lv})`)
  assert.equal(judge({ kind: 'twister', text: 'Red lorry, yellow lorry.' }, ['red lorry yellow lorry'], { level: 'B1' }).v, 'ok')
  assert.equal(judge({ kind: 'twister', text: 'Red lorry, yellow lorry.' }, ['red lorry yellow'], { level: 'B1' }).v, 'miss')
  assert.equal(judge({ kind: 'twister', text: 'She sells sea shells by the sea shore.' }, ['she sells sea shells by sea shore'], { level: 'B1' }).v, 'close')
  assert.equal(judge({ kind: 'twister', text: 'Red lorry, yellow lorry.' }, ['red yellow'], { level: 'B1' }).v, 'miss')
})

// answer: [accept, min_words, heard, expected]
const GOING = [['going'], ['go', 'to']]
const ANSWERS = [
  [GOING, 3, "I'm going to the bazaar", 'ok'],
  [GOING, 3, 'going home', 'close'],
  [GOING, 3, 'going', 'close'],
  [GOING, 3, 'I go to school', 'ok'],
  [GOING, 3, 'to school', 'miss'],
  [GOING, 3, 'I want to see my friend now', 'close'],
  [GOING, 3, 'school', 'miss'],
  [GOING, 3, 'we are going to the park', 'ok'],
  [[['bless', 'you']], 2, 'bless you', 'ok'],
  [[['bless', 'you']], 2, 'bless', 'miss'],
  [[['bless', 'you']], 2, 'god bless you', 'ok'],
  [[['by', 'bus'], ['walk'], ['on', 'foot']], 3, 'I go by bus', 'ok'],
  [[['by', 'bus'], ['walk'], ['on', 'foot']], 3, 'I walk', 'close'],
  [[['by', 'bus'], ['walk'], ['on', 'foot']], 3, 'I walk to school', 'ok'],
  [[['by', 'bus'], ['walk'], ['on', 'foot']], 3, 'on foot every day', 'ok'],
  [[['by', 'bus'], ['walk'], ['on', 'foot']], 3, 'by car', 'miss'],
  [[['i', 'like'], ['i', 'love']], 3, 'I like grapes', 'ok'],
  [[['i', 'like'], ['i', 'love']], 3, 'I love apples very much', 'ok'],
  [[['i', 'like'], ['i', 'love']], 3, 'grapes', 'miss'],
  [[['i', 'like'], ['i', 'love']], 3, 'apples and grapes and melons', 'close'],
]

test('answer: keyword groups and min_words', () => {
  for (const [accept, min, h, v] of ANSWERS) {
    assert.equal(judgeAnswer({ kind: 'answer', accept, min_words: min, text: '' }, [h]).v, v, `${JSON.stringify(accept)} ← "${h}"`)
  }
})

test('fill: the chunk or the whole sentence', () => {
  const it = { kind: 'fill', text: "I'm looking for my keys.", prompt: "I'm ___ my keys.", answer: 'looking for', accept: ['searching for'] }
  const cases = [['looking for', 'ok'], ['I am looking for my keys', 'ok'], ['searching for', 'ok'], ['looking', 'miss'],
    ['for', 'miss'], ["I'm looking for my key", 'ok'], ['finding', 'miss'], ['look for', 'miss'], ['', 'none']]
  for (const [h, v] of cases) assert.equal(judgeFill(it, h ? [h] : []).v, v, `fill ← "${h}"`)
})

test('the dispatcher picks the kind', () => {
  assert.equal(judge({ ...W('bus'), pt: 'choice', choices: ['bus', 'bike', 'tree'] }, ['bike'], { final: true }).v, 'miss')
  assert.equal(judge({ ...W('bus'), pt: 'uz' }, ['bus']).v, 'ok')
  assert.equal(judge({ kind: 'echo', text: 'Good night!' }, ['goodnight'], { level: 'A1' }).v, 'ok')
  assert.equal(judge({ kind: 'answer', accept: GOING, min_words: 3, text: '' }, ['going there now']).v, 'ok')
})

// tips: [target, heard, key|null]
const TIPS = [
  ['very', 'wery', 'wv'], ['west', 'vest', 'wv'], ['think', 'tink', 'th'], ['three', 'tree', 'th'], ['this', 'dis', 'th'],
  ['bag', 'bak', 'final'], ['bed', 'bet', 'final'], ['played', 'play', 'ed'], ['wanted', 'want', 'ed'],
  ['ticket', 'ticket', null], ['apple', 'banana', null],
  ['Where is the exit?', 'where is exit', 'article'], ['I have a cat and a dog', 'I have cat and dog', 'article'],
]

test('tips for common Uzbek-speaker patterns', () => {
  for (const [t, h, k] of TIPS) assert.equal(tipFor(t, h)?.key ?? null, k, `${t} ← "${h}"`)
})

test('200+ judged pairs in total', () => {
  // generated pairs: every word against itself (ok), its plural (close or ok) and an unrelated word (miss)
  const list = ['ticket', 'train', 'apple', 'window', 'station', 'pencil', 'teacher', 'garden', 'bottle', 'jacket',
    'market', 'doctor', 'kitchen', 'sister', 'flower', 'button', 'carpet', 'basket', 'rabbit', 'monkey', 'orange',
    'pillow', 'mirror', 'ladder', 'candle', 'tomato', 'potato', 'lemon', 'rocket', 'castle', 'butter', 'cookie',
    'dinner', 'lunch', 'school', 'pocket', 'planet', 'summer', 'winter', 'yellow']
  let n = WORDS.length + CHOICES.length + ECHO.length + ANSWERS.length + 9 + TIPS.length
  for (const w of list) {
    assert.equal(judgeWord(W(w), [w]).v, 'ok', w)
    assert.notEqual(judgeWord(W(w), [`${w}s`]).v, 'miss', `${w}s`)
    assert.equal(judgeWord(W(w), ['umbrella']).v, 'miss', w)
    n += 3
  }
  assert.ok(n >= 200, `only ${n} pairs`)
})
