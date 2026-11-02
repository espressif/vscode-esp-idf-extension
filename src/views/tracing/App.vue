<script setup lang="ts">
import { storeToRefs } from "pinia";
import { TOTAL_SERIES_COLOR } from "./heapTraceModel";
import { useTracingStore } from "./store";
import { computed, onMounted } from "vue";
import { IconPulse, IconClose } from "@iconify-prerendered/vue-codicon";

const store = useTracingStore();

const {
  callStacks,
  callersAddressTranslationTable,
  contextColors,
  contextVisibility,
  contexts,
  dataPlot,
  detailRows,
  errorMsg,
  fileName,
  isCalculating,
  heap,
  heapView,
  log,
  plotRevision,
  selectedDetailIndex,
  showTotal,
  summary,
  traceInfo,
  tracePane,
} = storeToRefs(store);

const activeHeapView = computed(() => {
  const active = Object.entries(heapView.value).find(([, enabled]) => enabled);
  return active ? active[0] : "plot";
});

function onAllContextsToggle(event: Event) {
  store.setAllContextsVisible((event.target as HTMLInputElement).checked);
}

function onTotalToggle(event: Event) {
  store.setShowTotal((event.target as HTMLInputElement).checked);
}

function onContextToggle(context: string, event: Event) {
  store.setContextVisible(context, (event.target as HTMLInputElement).checked);
}

onMounted(() => {
  store.getInitialData();
});
</script>

<template>
  <div id="app">
    <div class="settings-error" v-if="errorMsg">
      <div class="settings-error-content">
        <span>{{ errorMsg }}</span>
        <button class="settings-error-close" v-on:click="errorMsg = ''">
          <IconClose />
        </button>
      </div>
    </div>

    <div class="settings-header">
      <h1 class="settings-title">
        <strong>ESP-IDF</strong>&nbsp;App Tracing Reporter
      </h1>
      <p class="settings-description">
        App Tracing Reporter will help you with in-depth analysis of the
        runtime. In a nutshell this feature allows you to transfer arbitrary
        data between host and ESP32 via JTAG interface with small overhead on
        program execution.
      </p>
    </div>

    <div class="settings-content">
      <div class="settings-section">
        <div class="settings-section-header">
          <div class="settings-section-title">
            <span class="settings-section-icon">
              <IconPulse />
            </span>
            <span>{{ fileName }}</span>
          </div>
          <button
            class="vscode-button"
            v-on:click="store.showReport"
            v-bind:class="{
              'vscode-button-loading': isCalculating,
              'vscode-button-disabled': isCalculating,
            }"
          >
            Show Report
          </button>
        </div>
      </div>

      <div class="settings-section" v-if="log">
        <div class="settings-section-content">
          <pre v-html="log"></pre>
        </div>
      </div>

      <div class="settings-section" v-if="heap">
        <div class="settings-section-content settings-section-content-open">
          <quick-action-menu
            :active="activeHeapView"
            @change="store.heapViewChange"
          ></quick-action-menu>
          <div>
            <div v-show="heapView.plot">
              <div v-if="dataPlot.length" class="context-filters">
                <label>
                  <input
                    type="checkbox"
                    :checked="showTotal"
                    @change="onTotalToggle"
                  />
                  <span
                    class="context-swatch"
                    :style="{ backgroundColor: TOTAL_SERIES_COLOR }"
                  ></span>
                  <span>Total memory</span>
                </label>
                <label v-if="contexts.length">
                  <input
                    type="checkbox"
                    :checked="store.allContextsVisible"
                    @change="onAllContextsToggle"
                  />
                  <span>All contexts</span>
                </label>
                <label v-for="context in contexts" :key="context">
                  <input
                    type="checkbox"
                    :checked="contextVisibility[context] !== false"
                    @change="onContextToggle(context, $event)"
                  />
                  <span
                    class="context-swatch"
                    :style="{ backgroundColor: contextColors[context] }"
                  ></span>
                  <span>{{ context }}</span>
                </label>
              </div>
              <p
                v-if="detailRows.length && dataPlot.length === 0"
                class="context-empty"
              >
                No allocation changes to plot.
              </p>
              <plot
                v-bind:chart="dataPlot"
                v-bind:revision="plotRevision"
                @selected="store.plotSelected"
                @toggle-trace="store.setTraceVisible"
              >
              </plot>
            </div>
            <heap-trace-details
              v-show="heapView.details"
              :rows="detailRows"
              :selected-index="selectedDetailIndex"
              @select="store.selectDetail"
            ></heap-trace-details>
            <call-stack
              v-show="heapView.callStack"
              v-bind:callstack="callStacks"
              v-bind:cache="callersAddressTranslationTable"
              v-on:event-filter-updated="store.filterCallStacks"
            ></call-stack>
            <stats-view
              v-show="heapView.stats"
              v-bind:persistent-count="summary.persistentCount"
              v-bind:persistent-bytes="summary.persistentBytes"
              v-bind:transient-count="summary.transientCount"
              v-bind:total-bytes="summary.totalBytes"
              v-bind:total-count="summary.totalCount"
            ></stats-view>
          </div>
        </div>
        <quick-call-stack
          v-if="tracePane"
          v-bind:info="traceInfo"
          v-on:dismiss="store.tracePane = false"
        >
        </quick-call-stack>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@use "../commons/espCommons.scss" as *;

#app {
  padding: 1rem;
  color: var(--vscode-foreground);
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
}

.settings-error {
  margin-bottom: 1rem;
  padding: 0.5rem 1rem;
  background-color: var(--vscode-errorForeground);
  color: var(--vscode-editor-background);
  border-radius: 2px;
}

.settings-error-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-error-close {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 4px;
  margin: 0;
  cursor: pointer;
  color: var(--vscode-editor-background);
  opacity: 0.8;
  border-radius: 2px;
}

.settings-error-close:hover {
  opacity: 1;
  background-color: rgba(255, 255, 255, 0.1);
}

.settings-error-close :deep(svg) {
  width: 14px;
  height: 14px;
}

.settings-header {
  margin-bottom: 2rem;
}

.settings-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--vscode-settings-headerForeground);
}

.settings-description {
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
  margin: 0;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-section {
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-settings-dropdownBorder);
  border-radius: 2px;
}

.settings-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--vscode-settings-dropdownBorder);
}

.settings-section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 13px;
  font-weight: 600;
  color: var(--vscode-settings-headerForeground);
}

.settings-section-icon {
  display: flex;
  align-items: center;
  color: var(--vscode-settings-headerForeground);
}

.settings-section-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.settings-section-content {
  padding: 1rem;
  max-height: calc(65vh);
  overflow: auto;
}

.settings-section-content-open {
  max-height: none;
  overflow: visible;
}

.context-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  margin: 0.75rem 0;
}

.context-filters label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 12px;
}

.context-swatch {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 2px;
  display: inline-block;
}

.context-empty {
  margin: 0.75rem 0 0;
  color: var(--vscode-descriptionForeground);
  font-size: 12px;
}

.settings-section-content pre {
  color: var(--vscode-foreground);
  background-color: transparent;
  font-family: var(--vscode-editor-font-family);
  font-size: var(--vscode-editor-font-size);
  line-height: 1.4;
  margin: 0;
  white-space: pre-wrap;
}

.vscode-button {
  height: 28px;
  padding: 0 12px;
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 2px;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vscode-button:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.vscode-button:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.vscode-button-loading {
  opacity: 0.7;
  cursor: not-allowed;
}

.vscode-button-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.vscode-button-disabled:hover {
  background-color: var(--vscode-button-background);
}
</style>
