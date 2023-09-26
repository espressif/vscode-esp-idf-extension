<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useTracingStore } from "./store";
import { computed, onMounted } from "vue";
import { IconPulse } from "@iconify-prerendered/vue-codicon";

const store = useTracingStore();

const {
  allocLookupTable,
  callStacks,
  callersAddressTranslationTable,
  dataPlot,
  eventIDs,
  errorMsg,
  fileName,
  isCalculating,
  heap,
  heapView,
  log,
  plotDataReceived,
  traceInfo,
  tracePane,
} = storeToRefs(store);

const persistentBytes = computed(() => {
  //amount of allocated memory that hasn’t been freed yet
  return Object.keys(allocLookupTable.value).reduce(
    (acc: any, currentKey: string) => acc + allocLookupTable.value[currentKey].size,
    0
  );
});
const persistentCount = computed(() => {
  //number of allocations that haven’t been freed yet
  return Object.keys(allocLookupTable.value).length;
});
const transientCount = computed(() => {
  //total number of memory allocations that have been freed
  if (!plotDataReceived.value) {
    return 0;
  }
  return (
    plotDataReceived.value.events.filter(
      (event: any) => event.id === eventIDs.value.alloc
    ).length - persistentCount.value
  );
});
const totalBytes = computed(() => {
  //total allocated memory
  if (!plotDataReceived.value) {
    return 0;
  }
  return plotDataReceived.value.events
    .filter((event: any) => event.id === eventIDs.value.alloc)
    .reduce((acc: any, current: any) => acc + current.size, 0);
});
const totalCount = computed(() => {
  return persistentCount.value + transientCount.value;
});

onMounted(() => {
  store.getInitialData();
});
</script>

<template>
  <div id="app">
    <div class="notification is-danger" v-if="errorMsg">
      <button class="delete" v-on:click="errorMsg = ''"></button>
      {{ errorMsg }}
    </div>
    <header class="section">
      <div class="container">
        <nav class="level is-mobile">
          <h1 class="title is-size-5 is-size-6-mobile">
            <strong>ESP-IDF</strong>&nbsp;App Tracing Reporter
          </h1>
        </nav>
        <p class="subtitle is-size-6 is-size-7-mobile">
          App Tracing Reporter will help you with in-depth analysis of the
          runtime. In a nutshell this feature allows you to transfer arbitrary
          data between host and ESP32 via JTAG interface with small overhead on
          program execution.
        </p>
      </div>
    </header>
    <div class="section no-padding-top">
      <div class="container">
        <div class="notification is-clipped">
          <nav class="level is-mobile">
            <div class="level-left">
              <div class="level-item">
                <span class="icon">
                  <IconPulse class="is-size-3" />
                </span>
              </div>
              <div class="level-item">
                {{ fileName }}
              </div>
            </div>
            <div class="level-right">
              <div class="level-item">
                <button
                  class="button"
                  v-on:click="store.showReport"
                  v-bind:class="{
                    'is-loading': isCalculating,
                    'is-static': isCalculating,
                  }"
                >
                  Show Report
                </button>
              </div>
            </div>
          </nav>
        </div>
      </div>
      <br />
      <div class="container" v-if="log">
        <div class="notification">
          <pre v-html="log"></pre>
        </div>
      </div>
      <div class="container" v-if="heap">
        <div class="notification">
          <quick-action-menu
            @change="store.heapViewChange"
          ></quick-action-menu>
          <div>
            <plot
              v-show="heapView.plot"
              v-bind:chart="dataPlot"
              @selected="store.plotSelected"
              v-bind:events="eventIDs"
            >
            </plot>
            <call-stack
              v-show="heapView.callStack"
              v-bind:callstack="callStacks"
              v-bind:cache="callersAddressTranslationTable"
              v-on:event-filter-updated="store.filterCallStacks"
            ></call-stack>
            <leak-list
              v-show="heapView.leaks"
              v-bind:leaks="allocLookupTable"
              v-bind:cache="callersAddressTranslationTable"
            ></leak-list>
            <stats-view
              v-show="heapView.stats"
              v-bind:persistent-count="persistentCount"
              v-bind:persistent-bytes="persistentBytes"
              v-bind:transient-count="transientCount"
              v-bind:total-bytes="totalBytes"
              v-bind:total-count="totalCount"
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
@import "../commons/espCommons.scss";

div.notification {
  max-height: calc(65vh);
  overflow: auto;
  padding: 1.25rem 1.5rem 1.25rem 1.5rem;
}
.button.is-static {
  background-color: transparent;
  color: var(--vscode-foreground);
  border-color: var(--vscode-foreground);
}

.notification pre {
  color: var(--vscode-foreground);
  background-color: transparent;
}

.button.no-bottom-border {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
.button:disabled {
  background-color: transparent;
  border-color: var(--vscode-foreground);
  color: var(--vscode-foreground);
  border-top-width: 0;
}
.button:hover:disabled {
  color: var(--vscode-foreground);
}
</style>
