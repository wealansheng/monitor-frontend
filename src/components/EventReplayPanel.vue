<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import type { MonitorEventDetail } from '../types'
import { getEventRecords, recordError, type RecordSummary } from '../api/records'
import { useDashboardStore } from '../stores/dashboard'
const props = defineProps<{ detail: MonitorEventDetail }>()
const dashboard = useDashboardStore()
const records = ref<RecordSummary[]>([]); const loading = ref(false); const error = ref('')
let request: AbortController | undefined; let sequence = 0
async function load() {
  const current = ++sequence; request?.abort(); request = new AbortController()
  records.value = []; error.value = ''; loading.value = false
  if (!['error', 'behavior'].includes(props.detail.category) || dashboard.mode.value === 'demo') return
  loading.value = true
  try { const result = await getEventRecords(props.detail.appId, props.detail.eventId, request.signal); if (current === sequence) records.value = result.records }
  catch (cause) { if (current === sequence && !request?.signal.aborted) error.value = recordError(cause) }
  finally { if (current === sequence) loading.value = false }
}
watch([() => props.detail, dashboard.mode], () => void load(), { immediate: true })
onScopeDispose(() => { sequence++; request?.abort() })
</script>
<template>
  <section v-if="['error', 'behavior'].includes(detail.category)" class="panel detail-panel replay-panel">
    <div class="panel-heading"><div><h2>操作回放</h2><p>{{ detail.category === 'error' ? '还原这次错误发生前后的操作。' : '查看这次行为触发的录制与补传片段。' }}</p></div></div>
    <p v-if="dashboard.mode.value === 'demo'">演示事件未关联真实录制。<RouterLink class="text-link" to="/records">查看合成回放演示</RouterLink></p>
    <p v-else-if="loading" role="status">正在查询关联录制…</p>
    <div v-else-if="error" class="notice error-notice" role="alert">{{ error }} <button type="button" @click="load">重试</button></div>
    <p v-else-if="!records.length">暂未收到关联录制。录制可能未开启、未命中采样、仍在上传或已经过期。<button type="button" class="text-link" @click="load">重新查询</button></p>
    <div v-else class="replay-markers"><RouterLink v-for="item in records" :key="item.record_id" class="outline-button" :to="{ name: 'record-detail', params: { recordId: item.record_id }, query: { event: detail.eventId } }">{{ item.status === 'complete' ? detail.category === 'error' ? '播放错误现场' : '播放行为现场' : '查看分片状态' }} · {{ item.route }}</RouterLink></div>
  </section>
</template>
