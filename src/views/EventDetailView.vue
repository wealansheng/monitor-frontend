<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { AlertCircle, ArrowLeft, RefreshCw } from "@lucide/vue";
import { useEventDetail } from "../composables/useEventDetail";
import SourceLocationPanel from "../components/SourceLocationPanel.vue";
import {
  buildEventDetailGroups,
  buildEventSummary,
} from "../utils/eventFields";

const router = useRouter();
const { detail, loading, loadError, reload } = useEventDetail();

const summary = computed(() =>
  detail.value
    ? buildEventSummary(detail.value.event, detail.value.category)
    : [],
);

const groups = computed(() =>
  detail.value
    ? buildEventDetailGroups(detail.value.event, detail.value.category)
    : [],
);

function backToEvents() {
  void router.push({ name: "events" });
}
</script>

<template>
  <button class="text-link back-link" type="button" @click="backToEvents">
    <ArrowLeft :size="15" />返回事件列表
  </button>

  <section v-if="summary.length" class="section-summary" aria-label="事件摘要">
    <div v-for="item in summary" :key="item.label">
      <span>{{ item.label }}</span>
      <strong>{{ item.value }}</strong>
      <small>{{ item.note }}</small>
    </div>
  </section>

  <div v-if="loading" class="empty-state">
    <RefreshCw :size="28" class="spinning" />
    <h2>正在读取事件详情</h2>
    <p>读取完成后会按字段分组显示这条上报。</p>
  </div>
  <div v-else-if="loadError" class="notice error-notice" role="alert">
    <AlertCircle :size="18" /><span>{{ loadError }}</span
    ><button type="button" @click="reload">重新读取</button>
  </div>
  <template v-else-if="detail">
    <SourceLocationPanel :detail="detail" />
    <section
      v-for="group in groups"
      :key="group.title"
      class="panel detail-panel"
    >
      <div class="panel-heading">
        <div>
          <h2>{{ group.title }}</h2>
          <p>{{ group.description }}</p>
        </div>
        <span class="panel-tag">{{ group.fields.length }} 个字段</span>
      </div>
      <div class="table-scroll">
        <table class="field-table">
          <tbody>
            <tr v-for="field in group.fields" :key="field.key">
              <th class="field-label" scope="row">{{ field.label }}</th>
              <td>
                <pre v-if="field.multiline">{{ field.value }}</pre>
                <template v-else>{{ field.value }}</template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </template>
  <div v-else class="panel-empty">没有找到这条事件。</div>
</template>
