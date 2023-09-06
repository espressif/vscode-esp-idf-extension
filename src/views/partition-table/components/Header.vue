<script setup lang="ts">
import { usePartitionTableStore } from '../store';
import { Icon } from '@iconify/vue';

const store = usePartitionTableStore();
</script>

<template>
  <header class="section">
    <div class="container">
      <nav class="level is-mobile">
        <div class="level-left">
          <div class="level-item">
            <h1 class="title is-size-5-mobile">
              <strong>ESP-IDF</strong>
              <span>Partition Table Editor</span>
            </h1>
          </div>
        </div>
        <div class="level-right">
          <div class="level-item">
            <p class="buttons are-small">
              <a class="button" href="command:espIdf.selectFlashMethodAndFlash">
                <span class="icon is-small">
                  <Icon icon="star-empty" />
                </span>
                &nbsp; Select Flash Method
              </a>
              <a class="button" href="command:espIdf.buildDevice">
                <span class="icon is-small">
                  <Icon icon="tools" />
                </span>
                &nbsp; Build
              </a>
              <a class="button" href="command:espIdf.flashDevice">
                <span class="icon is-small">
                  <Icon icon="symbol-event" />
                </span>
                &nbsp; Flash
              </a>
              <button class="button" title="Retry" @click="store.initDataRequest">
                <span class="icon is-small">
                  <Icon icon="refresh" />
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