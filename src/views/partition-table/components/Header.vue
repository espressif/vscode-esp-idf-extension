<script setup lang="ts">
import { onMounted } from "vue";
import { usePartitionTableStore } from "../store";
import {
  IconStarEmpty,
  IconSymbolEvent,
  IconRefresh,
  IconTools,
} from "@iconify-prerendered/vue-codicon";

const store = usePartitionTableStore();

onMounted(() => {
  store.initDataRequest();
});
</script>

<template>
  <header class="section">
    <div class="container">
      <nav class="level is-mobile">
        <div class="level-left">
          <div class="level-item">
            <h1 class="title is-size-5-mobile">
              <strong>ESP-IDF </strong>
              <span>Partition Table Editor</span>
            </h1>
          </div>
        </div>
        <div class="level-right">
          <div class="level-item">
            <p class="buttons are-small">
              <a class="button" href="command:espIdf.selectFlashMethodAndFlash">
                <span class="icon is-small">
                  <IconStarEmpty />
                </span>
                &nbsp; Select Flash Method
              </a>
              <a class="button" href="command:espIdf.buildDevice">
                <span class="icon is-small">
                  <IconTools />
                </span>
                &nbsp; Build
              </a>
              <a class="button" href="command:espIdf.flashDevice">
                <span class="icon is-small">
                  <IconSymbolEvent />
                </span>
                &nbsp; Flash
              </a>
              <button
                class="button"
                title="Reset values"
                @click="store.initDataRequest"
              >
                <span class="icon is-small">
                  <IconRefresh />
                </span>
              </button>
            </p>
          </div>
        </div>
      </nav>
      <p class="subtitle is-size-6-mobile">
        Partition Editor can help you to easily edit, build &amp; flash
        partition table through GUI, without interacting directly with the csv
        files.
      </p>
    </div>
  </header>
</template>
