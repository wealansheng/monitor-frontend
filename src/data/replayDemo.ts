import type { RecordSummary } from '../api/records'

export const DEMO_RECORD_ID = '5f622ee0-a111-4111-8111-111111111111'
export function demoRecord(appId: string): RecordSummary {
  const start = Date.now() - 60_000
  return { app_id: appId, project_name: '合成演示', session_id: 'demo-session', user_id: 'demo-visitor',
    record_id: DEMO_RECORD_ID, page_url: 'https://demo.invalid/checkout', route: '/checkout', release: 'demo',
    environment: 'demo', sdk_version: 'demo', rrweb_version: '2.1.7', protocol_version: 1, encoding: 'gzip-base64',
    started_at: start, ended_at: start + 10_000, display_start: start,
    errors: [{ event_id: '5f622ee0-a111-4111-8111-222222222222', timestamp: start + 5000 }],
    end_reason: 'window', context_missing: false, raw_bytes: 0, encoded_bytes: 0, checksum: '', chunk_count: 0,
    status: 'complete', received_chunks: 0 }
}
/** Deliberately synthetic DOM; no real user data or network calls. */
export function demoEvents(start: number) {
  const text = (id: number, value: string) => ({ type: 3, id, textContent: value })
  const element = (id: number, tagName: string, childNodes: unknown[], attributes = {}) => ({ type: 2, id, tagName, attributes, childNodes })
  return [
    { type: 4, timestamp: start, data: { href: 'https://demo.invalid/checkout', width: 1000, height: 560 } },
    { type: 2, timestamp: start, data: { node: { type: 0, id: 1, childNodes: [element(2, 'html', [
      element(3, 'head', [element(4, 'style', [text(5, 'body{font:18px system-ui;padding:48px;color:#173044;background:#edf2ef}button{padding:16px;background:#257a74;color:white;border:0;border-radius:8px}p{margin:24px 0}')])]),
      element(6, 'body', [element(7, 'h1', [text(8, '结算页面 · 合成演示')]), element(9, 'p', [text(10, '已准备订单，等待提交。')]), element(11, 'button', [text(12, '提交订单')])]),
    ])] }, initialOffset: { top: 0, left: 0 } } },
    { type: 3, timestamp: start + 4000, data: { source: 2, type: 2, id: 11, x: 110, y: 220 } },
    { type: 3, timestamp: start + 5000, data: { source: 0, texts: [{ id: 10, value: '提交失败，请稍后重试。' }], attributes: [], removes: [], adds: [] } },
    { type: 5, timestamp: start + 10_000, data: { tag: 'end', payload: {} } },
  ]
}
