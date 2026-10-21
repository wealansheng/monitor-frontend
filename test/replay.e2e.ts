import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { demoRecord, demoEvents } from '../src/data/replayDemo'
import { gzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
async function live(page: import('@playwright/test').Page, record: ReturnType<typeof demoRecord>, chunks: unknown[] = []) {
  await page.addInitScript(() => sessionStorage.setItem('weils-dashboard-token', 'test'))
  await page.route('**/api/v1/dashboard/**', async route => {
    const url = new URL(route.request().url()); let response: unknown = { ok: true }
    if (url.pathname.endsWith('/apps')) response = { ok: true, apps: [{ appId: 'app', projectName: '测试应用', events: 1, lastSeen: Date.now() }] }
    else if (url.pathname.endsWith('/overview')) response = { ok: true, appId: 'app', hours: 24, summary: { pageViews: 0, visitors: 0, sessions: 0, errors: 0, stabilityIssues: 0, requests: 0, failedRequests: 0 }, timeline: [], vitals: [], errorTypes: [], issues: [], routes: [], recentEvents: [] }
    else if (url.pathname.endsWith('/chunks')) response = { ok: true, chunks, total: chunks.length, hasMore: false }
    else if (/\/errors\/.+\/records$/.test(url.pathname)) response = { ok: true, records: [record], total: 1, hasMore: false }
    else if (url.pathname.endsWith('/records')) response = { ok: true, records: [record], total: 1, hasMore: false }
    else if (url.pathname.includes('/records/')) response = { ok: true, record }
    else if (url.pathname.endsWith('/event')) response = { ok: true, appId: 'app', eventId: record.errors[0].event_id, category: 'error', event: { event_type: 'error', error_type: 'js_error', message: 'Test error' } }
    else if (url.pathname.endsWith('/symbolication')) response = { ok: true, status: 'unmapped', frames: [] }
    await route.fulfill({ json: response })
  })
}
test('demo player supports controls and desktop/mobile layouts', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await mkdir('.impeccable/review', { recursive: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/records')
  await expect(page.getByRole('link', { name: '查看回放' })).toBeVisible()
  await page.screenshot({ path: '.impeccable/review/records-desktop.png', fullPage: true })
  await page.getByRole('link', { name: '查看回放' }).click()
  await expect(page.getByRole('button', { name: '播放回放' })).toBeVisible()
  await page.getByRole('button', { name: '播放回放' }).click()
  await expect(page.getByRole('button', { name: '暂停回放' })).toBeVisible()
  await page.getByRole('button', { name: '暂停回放' }).click()
  await page.getByLabel('播放速度').selectOption('2')
  await page.getByRole('button', { name: /错误 1/ }).click()
  await expect(page.getByLabel('回放进度')).toHaveValue('5000')
  await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0) })
  await page.screenshot({ path: '.impeccable/review/desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect.poll(() => page.locator('.replay-viewport').evaluate(element => {
    const frame = element.querySelector('iframe')!
    return frame.getBoundingClientRect().width <= element.clientWidth + 1 && element.clientHeight < 250
  })).toBe(true)
  await page.screenshot({ path: '.impeccable/review/mobile.png', fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByLabel('画面尺寸').selectOption('1')
  await expect.poll(() => page.locator('.replay-viewport').evaluate(element => ({ width: element.scrollWidth > element.clientWidth, height: element.scrollHeight > element.clientHeight }))).toEqual({ width: true, height: true })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: '.impeccable/review/mobile-inspect.png', fullPage: true })
  await page.getByRole('link', { name: '返回操作回放列表' }).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: '.impeccable/review/records-mobile.png', fullPage: true })
  expect(errors).toEqual([])
})
test('record list does not depend on overview data; filters are sent to server', async ({ page }) => {
  const record = demoRecord('app'); await live(page, record)
  await page.goto('/records')
  await expect(page.getByRole('link', { name: '查看回放' })).toBeVisible()
  await page.getByLabel('用户', { exact: true }).fill('visitor')
  const sent = page.waitForRequest(request => request.url().includes('/records?') && request.url().includes('user_id=visitor'))
  await page.getByRole('button', { name: '查询录制' }).click(); await sent
  await expect(page.getByRole('link', { name: '查看回放' })).toBeVisible()
})
test('shows incomplete state and supports retry after chunks arrive; links errors to markers', async ({ page }) => {
  const record = demoRecord('app'); record.status = 'incomplete'; record.chunk_count = 1
  const raw = JSON.stringify(demoEvents(record.started_at)); const payload = gzipSync(raw).toString('base64')
  Object.assign(record, { raw_bytes: Buffer.byteLength(raw), encoded_bytes: payload.length, checksum: hash(payload) })
  const { status: _s, received_chunks: _r, ...metadata } = record
  const chunks = [{ ...metadata, chunk_index: 0, chunk_checksum: hash(payload), payload }]
  await live(page, record, chunks)
  await page.goto(`/records/${record.record_id}`)
  await expect(page.getByRole('alert')).toContainText('分片尚未完整到达')
  record.status = 'complete'; record.received_chunks = 1
  await page.getByRole('button', { name: '重新读取' }).click()
  await expect(page.getByRole('button', { name: '播放回放' })).toBeVisible()
  await page.goto(`/events/${record.errors[0].event_id}?type=error`)
  await page.getByRole('link', { name: /播放错误现场/ }).click()
  await expect(page.getByRole('button', { name: '播放回放' })).toBeVisible()
  await expect(page.getByLabel('回放进度')).toHaveValue('5000')
})
test('rejects corrupt data before constructing a player', async ({ page }) => {
  const record = demoRecord('app'); record.chunk_count = 1
  await live(page, record, [{ ...record, chunk_index: 0, chunk_checksum: '0'.repeat(64), payload: 'corrupt' }])
  await page.goto(`/records/${record.record_id}`)
  await expect(page.getByRole('alert')).toContainText('校验失败')
  await expect(page.locator('.replay-viewport iframe')).toHaveCount(0)
})
