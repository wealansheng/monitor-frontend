import type { RecordChunk, RecordMetadata } from '@weils-monitor/replay'
import { http } from './http'

export type { RecordChunk }
export interface RecordSummary extends RecordMetadata {
  status: 'complete' | 'incomplete' | 'corrupt'
  received_chunks: number
}
export interface RecordPage { records: RecordSummary[]; total: number; hasMore: boolean }
async function get<T>(path: string, params: Record<string, string | number>, signal?: AbortSignal): Promise<T> {
  const response = await http.get<T & { ok: boolean; error?: string }>(path, { params, signal })
  if (!response.data.ok) throw new Error(response.data.error || '回放服务返回了无效响应')
  return response.data
}
export const getRecords = (params: Record<string, string | number>, signal?: AbortSignal) => get<RecordPage>('/records', params, signal)
export const getErrorRecords = (appId: string, eventId: string, signal?: AbortSignal) => get<RecordPage>(`/errors/${encodeURIComponent(eventId)}/records`, { app_id: appId }, signal)
export async function getRecord(appId: string, recordId: string, signal?: AbortSignal): Promise<RecordSummary> {
  const result = await get<{ record: RecordSummary }>(`/records/${encodeURIComponent(recordId)}`, { app_id: appId }, signal)
  return result.record
}
export async function getRecordChunks(appId: string, record: RecordSummary, signal?: AbortSignal): Promise<RecordChunk[]> {
  const chunks: RecordChunk[] = []
  while (chunks.length < record.chunk_count) {
    const page = await get<{ chunks: RecordChunk[] }>(`/records/${encodeURIComponent(record.record_id)}/chunks`,
      { app_id: appId, offset: chunks.length, limit: 4 }, signal)
    if (!page.chunks.length) throw new Error('录制分片缺失，请稍后重试')
    chunks.push(...page.chunks)
    if (chunks.length > 64) throw new Error('录制分片数量无效')
  }
  return chunks
}
export function recordError(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { error?: string } } })?.response
  if (response?.status === 404) return '录制不存在、已过期，或回放接口未启用。'
  if (response?.status === 401) return '访问令牌无效，请重新连接。'
  return response?.data?.error || (error instanceof Error ? error.message : '回放读取失败')
}
