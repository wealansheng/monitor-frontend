<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { getRecords, recordError, type RecordSummary } from '../api/records'
import { useDashboardStore } from '../stores/dashboard'
import { demoRecord } from '../data/replayDemo'
import { formatTime } from '../utils/format'

const dashboard = useDashboardStore()
const records = ref<RecordSummary[]>([])
const total = ref(0)
const offset = ref(0)
const userId = ref(''); const sessionId = ref(''); const routeFilter = ref('')
const loading = ref(false); const error = ref('')
let request: AbortController | undefined
let sequence = 0
async function load() {
  const current = ++sequence
  request?.abort(); request = new AbortController()
  loading.value = true; error.value = ''; records.value = []
  try {
    if (dashboard.mode.value === 'demo') {
      records.value = offset.value ? [] : [demoRecord(dashboard.appId.value)]
      total.value = 1; return
    }
    const page = await getRecords({ app_id: dashboard.appId.value, hours: dashboard.hours.value, offset: offset.value, limit: 20,
      user_id: userId.value, session_id: sessionId.value, route: routeFilter.value }, request.signal)
    if (current !== sequence) return
    records.value = page.records; total.value = page.total
  } catch (cause) { if (current === sequence && !request?.signal.aborted) error.value = recordError(cause) }
  finally { if (current === sequence) loading.value = false }
}
function search() { offset.value = 0; void load() }
watch([dashboard.appId, dashboard.hours, dashboard.mode], search, { immediate: true })
watch(dashboard.lastUpdated, search)
onScopeDispose(() => { sequence++; request?.abort() })
const statusLabel = (status: string) => status === 'complete' ? '可播放' : status === 'corrupt' ? '录制损坏' : '等待分片'
</script>

<template>
  <section class="panel table-panel records-panel">
    <div class="panel-heading"><div><h2>错误操作记录</h2><p>仅保存已触发错误的片段，输入内容已遮罩。</p></div><span class="panel-tag">{{ total }} 段录制</span></div>
    <form class="record-filters" @submit.prevent="search">
      <label>用户<input v-model="userId" placeholder="用户 ID" /></label>
      <label>会话<input v-model="sessionId" placeholder="会话 ID" /></label>
      <label>页面路由<input v-model="routeFilter" placeholder="/checkout" /></label>
      <button class="primary-button" type="submit" :disabled="loading">查询录制</button>
    </form>
    <div v-if="dashboard.mode.value === 'demo'" class="notice">当前是合成录制演示，不代表真实用户操作。</div>
    <div v-if="error" class="notice error-notice" role="alert">{{ error }} <button type="button" @click="load">重新查询</button></div>
    <div v-else-if="loading" class="panel-empty" role="status">正在读取操作记录…</div>
    <div v-else-if="!records.length" class="panel-empty">当前范围没有录制。已开启录制的会话触发错误后，记录将在上传完成后出现。</div>
    <div v-else class="table-scroll"><table class="events-table"><thead><tr><th>开始时间</th><th>时长</th><th>页面</th><th>用户 / 会话</th><th>错误</th><th>状态</th><th>操作</th></tr></thead>
      <tbody><tr v-for="item in records" :key="item.record_id">
        <td>{{ formatTime(item.display_start) }}</td><td>{{ ((item.ended_at - item.display_start) / 1000).toFixed(1) }}s</td>
        <td>{{ item.route || '—' }}</td><td class="record-identity">{{ item.user_id || '匿名用户' }}<small>{{ item.session_id }}</small></td>
        <td>{{ item.errors.length }}</td><td><span class="event-type" :class="item.status === 'corrupt' ? 'error' : 'behavior'">{{ statusLabel(item.status) }}</span></td>
        <td><RouterLink class="text-link" :to="{ name: 'record-detail', params: { recordId: item.record_id } }">查看回放</RouterLink></td>
      </tr></tbody></table></div>
    <div class="record-pagination"><button class="outline-button" type="button" :disabled="offset === 0 || loading" @click="offset = Math.max(0, offset - 20); load()">上一页</button><span>{{ Math.floor(offset / 20) + 1 }} / {{ Math.max(1, Math.ceil(total / 20)) }}</span><button class="outline-button" type="button" :disabled="offset + 20 >= total || loading" @click="offset += 20; load()">下一页</button></div>
  </section>
</template>
