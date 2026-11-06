// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import EventReplayPanel from './EventReplayPanel.vue'
import { getEventRecords } from '../api/records'
import type { MonitorEventDetail } from '../types'

vi.mock('../api/records', () => ({ getEventRecords: vi.fn(), recordError: (error: Error) => error.message }))
vi.mock('../stores/dashboard', () => ({ useDashboardStore: () => ({ mode: ref('live') }) }))
const detail = (category: MonitorEventDetail['category'] = 'behavior'): MonitorEventDetail => ({ appId: 'app', eventId: 'event', category, event: { event_type: category } })
const render = () => mount(EventReplayPanel, { props: { detail: detail() }, global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
beforeEach(() => vi.clearAllMocks())

describe('event replay association', () => {
  it('queries behavior UUIDs and renders an explicit empty state', async () => {
    vi.mocked(getEventRecords).mockResolvedValue({ records: [], total: 0, hasMore: false })
    const wrapper = render(); await flushPromises()
    expect(getEventRecords).toHaveBeenCalledWith('app', 'event', expect.any(AbortSignal))
    expect(wrapper.text()).toContain('暂未收到关联录制')
    wrapper.unmount()
  })
  it('shows query failure and retries without losing the event association', async () => {
    vi.mocked(getEventRecords).mockRejectedValueOnce(new Error('读取失败')).mockResolvedValueOnce({ records: [], total: 0, hasMore: false })
    const wrapper = render(); await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('读取失败')
    await wrapper.get('[role="alert"] button').trigger('click'); await flushPromises()
    expect(getEventRecords).toHaveBeenCalledTimes(2); expect(wrapper.text()).toContain('暂未收到关联录制')
    wrapper.unmount()
  })
  it('cancels stale behavior requests when switching to a category without replay', async () => {
    let finish!: (value: Awaited<ReturnType<typeof getEventRecords>>) => void
    vi.mocked(getEventRecords).mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const wrapper = render()
    expect(wrapper.text()).toContain('正在查询关联录制')
    const signal = vi.mocked(getEventRecords).mock.calls[0]![2]!
    await wrapper.setProps({ detail: detail('performance') })
    expect(signal.aborted).toBe(true)
    finish({ records: [], total: 0, hasMore: false }); await flushPromises()
    expect(wrapper.find('section').exists()).toBe(false)
    wrapper.unmount()
  })
})
