import test from 'node:test'
import assert from 'node:assert/strict'
import { oauthError, oauthProvidersSchema, oauthStartUrl } from '../src/oauth.ts'

test('each provider starts at the same-origin server authorization endpoint', () => {
  for (const provider of ['kakao', 'naver', 'google']) {
    assert.equal(oauthStartUrl(provider), `/api/v1/auth/oauth/${provider}/start`)
  }
})

test('provider availability parses only explicit known providers and flags', () => {
  assert.deepEqual(oauthProvidersSchema.parse([{ provider: 'naver', enabled: false }]), [{ provider: 'naver', enabled: false }])
  assert.equal(oauthProvidersSchema.safeParse([{ provider: 'unknown', enabled: true }]).success, false)
  assert.equal(oauthProvidersSchema.safeParse([{ provider: 'google', enabled: 'true' }]).success, false)
})

test('callback errors become local feedback instead of reflecting provider text or tokens', () => {
  assert.equal(oauthError(''), null)
  assert.ok(oauthError('?oauth_error=cancelled'))
  assert.ok(oauthError('?oauth_error=invalid_state'))
  assert.ok(oauthError('?oauth_error=unavailable'))
  assert.equal(oauthError('?oauth_error=%3Cscript%3E'), oauthError('?oauth_error=failed'))
})
