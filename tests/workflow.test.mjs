import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'
import { readRateLimit } from '../evidence/adapter.mjs'
const fixture = name => JSON.parse(fs.readFileSync(new URL('../evidence/' + name + '.json', import.meta.url)))
const fetcher = async (url, init) => {
  assert.equal(url.href, 'https://api.github.com/rate_limit')
  assert.equal(init.headers['X-GitHub-Api-Version'], '2026-03-10')
  return new Response(JSON.stringify({ resources: { core: { limit: 60 } } }))
}
test('approved adapter extracts the current rate limit', async () => {
  assert.equal((await readRateLimit(fixture('approved'), fetcher)).limit, 60)
})
test('old adapter does not find the removed field', async () => {
  assert.equal(await readRateLimit(fixture('blocked'), fetcher), undefined)
})
test('incomplete adapter supplies no executable response path', async () => {
  await assert.rejects(() => readRateLimit(fixture('unresolved'), fetcher), TypeError)
})
test('portal copy fits the supplied limits', () => {
  const content = fs.readFileSync(new URL('../submission-assets/SUBMISSION.md', import.meta.url), 'utf8')
  for (const [name, limit] of [['One-liner', 180], ['Project description', 1000], ['Expected verification outcome', 500]]) {
    const body = content.match(new RegExp('## ' + name + '\\n\\n([^\\n]+)'))?.[1]
    assert.ok(body && [...body].length <= limit, name)
  }
})

const { activationLabel, evaluationInput, friendly, releaseName, repositoryName, sha } = await import('../src/workflow.ts')
test('workspace validates immutable commit, release, and repository input', () => {
  assert.equal(sha('a'.repeat(40)), true)
  assert.equal(sha('main'), false)
  assert.equal(releaseName('adapter-2.0'), true)
  assert.equal(releaseName('../unsafe'), false)
  assert.equal(repositoryName('owner/versionrelay-genlayer'), true)
  assert.equal(repositoryName('https://github.com/owner/versionrelay-genlayer'), false)
})
test('hash recovery binds only decoded evaluator calldata', () => {
  const commit = 'a'.repeat(40)
  assert.deepEqual(evaluationInput(new Map([['', 'evaluate'], ['args', [commit, 'adapter-2']]])), { commit, release: 'adapter-2' })
  assert.equal(evaluationInput(new Map([['', 'activate'], ['args', [commit, 'adapter-2']]])), null)
})
test('wallet rejection has explicit retry feedback', () => {
  assert.match(friendly({ code: 4001 }), /rejected.*retry/i)
})
test('only verified registry state produces the successful activation label', () => {
  assert.equal(activationLabel('APPROVED', false, false), 'Awaiting registry settlement')
  assert.equal(activationLabel('APPROVED', false, true), 'Finalized without verified activation')
  assert.equal(activationLabel('APPROVED', true, true), 'Finalized and verified')
  for (const verdict of ['BLOCKED', 'UNRESOLVED']) assert.equal(activationLabel(verdict, false, false), 'Not authorized')
})
