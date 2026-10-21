<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import type { MonitorEventDetail } from '../types'
import { getErrorRecords, recordError, type RecordSummary } from '../api/records'
import { useDashboardStore } from '../stores/dashboard'
const props = defineProps<{ detail: MonitorEventDetail }>()
const dashboard = useDashboardStore()
const records = ref<RecordSummary[]>([]); const loading = ref(false); const error = ref('')
let request: AbortController | undefined; let sequence = 0
async function load() {
  const current = ++sequence; request?.abort(); request = new AbortController()
  records.value = []; error.value = ''
  if (props.detail.category !== 'error' || dashboard.mode.value === 'demo') return
  loading.value = true
  try { const result = await getErrorRecords(props.detail.appId, props.detail.eventId, request.signal); if (current === sequence) records.value = result.records }
  catch (cause) { if (current === sequence && !request?.signal.aborted) error.value = recordError(cause) }
  finally { if (current === sequence) loading.value = false }
}
watch([() => props.detail, dashboard.mode], () => void load(), { immediate: true })
onScopeDispose(() => { sequence++; request?.abort() })
</script>
<template>
  <section v-if="detail.category === 'error'" class="panel detail-panel">
    <div class="panel-heading"><div><h2>操作回放</h2><p>还原这次错误发生前后的操作。</p></div></div>
    <p v-if="dashboard.mode.value === 'demo'">演示错误未关联真实录制。<RouterLink class="text-link" to="/records">查看合成回放演示</RouterLink></p>
    <p v-else-if="loading" role="status">正在查询关联录制…</p>
    <div v-else-if="error" class="notice error-notice" role="alert">{{ error }} <button type="button" @click="load">重试</button></div>
    <p v-else-if="!records.length">暂未收到关联录制。录制可能未开启、未命中采样、仍在上传或已经过期。<button type="button" class="text-link" @click="load">重新查询</button></p>
    <div v-else class="replay-markers"><RouterLink v-for="item in records" :key="item.record_id" class="outline-button" :to="{ name: 'record-detail', params: { recordId: item.record_id }, query: { error: detail.eventId } }">{{ item.status === 'complete' ? '播放错误现场' : '查看分片状态' }} · {{ item.route }}</RouterLink></div>
  </section>
</template>
