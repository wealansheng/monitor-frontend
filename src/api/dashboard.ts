import type { MonitorApp, Overview } from '../types'

const base = '/api/v1/dashboard'

async function get<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  let payload: { ok?: boolean; error?: string } & T
  try {
    payload = await response.json() as typeof payload
  } catch {
    throw new Error('数据服务返回了无法读取的响应')
  }
  if (!response.ok || !payload.ok) {
    if (response.status === 401) throw new Error('访问令牌无效，请重新连接')
    if (response.status === 404) throw new Error('查询接口未启用，请在后端设置 MONITOR_DASHBOARD_TOKEN')
    throw new Error(payload.error || `查询失败 (${response.status})`)
  }
  return payload
}

export async function fetchApps(token: string): Promise<MonitorApp[]> {
  const result = await get<{ apps: MonitorApp[] }>('/apps', token)
  return result.apps
}

export async function fetchOverview(token: string, appId: string, hours: number): Promise<Overview> {
  return get<Overview>(`/overview?app_id=${encodeURIComponent(appId)}&hours=${hours}`, token)
}
