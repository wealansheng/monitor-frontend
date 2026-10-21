<script setup lang="ts">
import { computed, nextTick, onScopeDispose, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import type { createReplayPlayer } from '@weils-monitor/replay/player'
import { getRecord, getRecordChunks, recordError, type RecordSummary } from '../api/records'
import { demoEvents, demoRecord } from '../data/replayDemo'
import { useDashboardStore } from '../stores/dashboard'
import { formatTime } from '../utils/format'

const route = useRoute(); const dashboard = useDashboardStore()
const record = ref<RecordSummary>(); const target = ref<HTMLElement>()
const error = ref(''); const loading = ref(false); const playing = ref(false)
const progress = ref(0); const duration = ref(0); const speed = ref(1)
const zoom = ref('fit')
let player: Awaited<ReturnType<typeof createReplayPlayer>> | undefined
let request: AbortController | undefined; let sequence = 0; let ticker: ReturnType<typeof setInterval> | undefined
let observer: ResizeObserver | undefined
let frameObserver: MutationObserver | undefined
let resizeFrame = 0
const seconds = (time: number) => `${Math.floor(time / 60_000)}:${Math.floor(time / 1000 % 60).toString().padStart(2, '0')}`
const endReasons: Record<string, string> = { window: '已结束', duration_limit: '达到录制时长上限', size_limit: '达到录制大小上限', stop: '录制已停止', pagehide: '页面已离开', recovered: '从本地恢复' }
const markers = computed(() => record.value?.errors.map(item => ({ ...item, offset: Math.max(0, item.timestamp - record.value!.display_start) })) || [])
function disposePlayer() { player?.destroy(); player = undefined; observer?.disconnect(); observer = undefined; frameObserver?.disconnect(); frameObserver = undefined; cancelAnimationFrame(resizeFrame); if (ticker) clearInterval(ticker); playing.value = false }
function scheduleFit() { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(fit) }
function fit() {
  const wrapper = target.value?.querySelector<HTMLElement>('.replayer-wrapper')
  const frame = wrapper?.querySelector('iframe')
  if (!wrapper || !frame || !target.value) return
  const width = Number(frame.getAttribute('width')) || frame.offsetWidth || 1000
  const height = Number(frame.getAttribute('height')) || frame.offsetHeight || 560
  const scale = zoom.value === 'fit' ? Math.min(1, target.value.clientWidth / width) : Number(zoom.value)
  wrapper.style.transform = `scale(${scale})`; wrapper.style.transformOrigin = 'top left'
  target.value.style.height = `${Math.max(180, height * scale)}px`
}
async function load() {
  const current = ++sequence
  request?.abort(); request = new AbortController(); disposePlayer()
  record.value = undefined; progress.value = 0; speed.value = 1; error.value = ''; loading.value = true
  try {
    const demo = dashboard.mode.value === 'demo'
    const item = demo ? demoRecord(dashboard.appId.value) : await getRecord(dashboard.appId.value, String(route.params.recordId), request.signal)
    if (current !== sequence) return
    record.value = item
    if (item.status !== 'complete') throw new Error(item.status === 'corrupt' ? '录制校验发现冲突，无法播放。' : `分片尚未完整到达（${item.received_chunks}/${item.chunk_count}），请稍后重试。`)
    const chunks = demo ? undefined : await getRecordChunks(dashboard.appId.value, item, request.signal)
    const module = await import('@weils-monitor/replay/player')
    await import('@weils-monitor/replay/style.css')
    if (current !== sequence) return
    loading.value = false
    await nextTick()
    if (!target.value || current !== sequence) return
    const instance = await module.createReplayPlayer({ target: target.value, chunks, events: demo ? demoEvents(item.started_at) as never : undefined, displayStart: item.display_start })
    if (current !== sequence) { instance.destroy(); return }
    player = instance; duration.value = instance.duration
    const errorId = typeof route.query.error === 'string' ? route.query.error : ''
    const marker = item.errors.find(error => error.event_id === errorId)
    if (marker) seek(Math.max(0, marker.timestamp - item.display_start))
    observer = new ResizeObserver(scheduleFit); observer.observe(target.value)
    frameObserver = new MutationObserver(scheduleFit)
    frameObserver.observe(target.value, { attributes: true, subtree: true, attributeFilter: ['width', 'height'] })
    fit()
    ticker = setInterval(() => {
      if (!player || !playing.value) return
      progress.value = Math.min(duration.value, player.getCurrentTime())
      if (progress.value >= duration.value - 100) playing.value = false
    }, 100)
  } catch (cause) { if (current === sequence && !request?.signal.aborted) error.value = recordError(cause) }
  finally { if (current === sequence) loading.value = false }
}
function toggle() { if (!player) return; if (playing.value) player.pause(); else { if (progress.value >= duration.value - 100) progress.value = 0; player.play(progress.value) }; playing.value = !playing.value }
function seek(time: number) { progress.value = time; player?.seek(time); playing.value = false }
function changeSpeed() { player?.setSpeed(Number(speed.value)) }
watch([() => route.params.recordId, dashboard.appId, dashboard.mode], () => void load(), { immediate: true })
onScopeDispose(() => { sequence++; request?.abort(); disposePlayer() })
</script>

<template>
  <RouterLink class="text-link back-link" :to="{ name: 'records' }">返回操作回放列表</RouterLink>
  <div v-if="dashboard.mode.value === 'demo'" class="notice">合成录制演示 · 不包含真实用户操作</div>
  <section class="panel replay-panel">
    <div class="panel-heading"><div><h2>{{ record?.route || '操作回放' }}</h2><p v-if="record">{{ formatTime(record.display_start) }} · {{ record.user_id || '匿名用户' }} · {{ record.session_id }}</p></div></div>
    <div v-if="record?.context_missing || record?.end_reason !== 'window' && record" class="notice">此片段的前后文可能不足（{{ endReasons[record.end_reason] || '录制提前结束' }}），已保留可恢复的操作记录。</div>
    <div v-if="loading" class="panel-empty" role="status">正在加载并校验录制…</div>
    <div v-if="error" class="notice error-notice" role="alert">{{ error }} <button type="button" @click="load">重新读取</button></div>
    <div v-show="!loading && !error" ref="target" class="replay-viewport" :class="{ 'replay-inspect': zoom !== 'fit' }" :tabindex="zoom !== 'fit' ? 0 : undefined" aria-label="操作回放画面" />
    <div v-if="!loading && !error && record" class="replay-controls">
      <button class="primary-button" type="button" :aria-label="playing ? '暂停回放' : '播放回放'" @click="toggle">{{ playing ? '暂停' : '播放' }}</button>
      <span>{{ seconds(progress) }} / {{ seconds(duration) }}</span>
      <label class="replay-progress"><span class="sr-only">回放进度</span><input type="range" min="0" :max="duration" step="100" :value="progress" @input="seek(Number(($event.target as HTMLInputElement).value))" /></label>
      <label><span class="sr-only">播放速度</span><select v-model="speed" @change="changeSpeed"><option v-for="value in [0.5, 1, 2, 4]" :key="value" :value="value">{{ value }}×</option></select></label>
      <label><span class="sr-only">画面尺寸</span><select v-model="zoom" @change="fit"><option value="fit">适应窗口</option><option value="1">实际大小</option><option value="1.5">放大 150%</option><option value="2">放大 200%</option></select></label>
    </div>
    <div v-if="markers.length" class="replay-markers" aria-label="错误时间点"><strong>错误时间点</strong><button v-for="(marker, index) in markers" :key="marker.event_id" class="outline-button" type="button" :disabled="!player || !!error" @click="seek(marker.offset)">错误 {{ index + 1 }} · {{ seconds(marker.offset) }}</button></div>
  </section>
</template>
