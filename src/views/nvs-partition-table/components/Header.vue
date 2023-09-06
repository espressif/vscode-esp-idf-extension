<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNvsPartitionTableStore } from "../store";
import { computed, onMounted } from "vue";
import { Icon } from "@iconify/vue";
let folderIcon = "folder";
const store = useNvsPartitionTableStore();

const {
  encrypt,
  encryptKeyPath,
  generateKey,
  partitionSize,
  partitionSizeError,
} = storeToRefs(store);

const showEncryptionKeyPath = computed(() => {
  return encrypt && !generateKey;
});

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
              <strong>ESP-IDF</strong>
              <span>Non Volatile Storage (NVS) Partition Editor</span>
            </h1>
          </div>
        </div>
        <div class="level-right">
          <div class="level-item">
            <label class="checkbox is-small">
              <input type="checkbox" v-model="encrypt" />
              Encrypt?
            </label>
          </div>
          <div class="level-item" v-if="encrypt">
            <label class="checkbox is-small">
              <input type="checkbox" v-model="generateKey" />
              Generate encryption key ?
            </label>
          </div>
          <div class="level-item">
            <p class="buttons are-small">
              <a class="button" @click="store.genPartition">
                <span class="icon is-small">
                  <Icon icon="symbol-method" />
                </span>
                &nbsp; Generate partition
              </a>
              <button
                class="button"
                title="Retry"
                @click="store.initDataRequest"
              >
                <span class="icon is-small">
                  <Icon icon="refresh" />
                </span>
                &nbsp; Reload file
              </button>
            </p>
          </div>
        </div>
      </nav>
      <p class="subtitle is-size-6-mobile">
        NVS CSV Editor can help you to easily edit NVS CSV, generate encrypted
        and non-encrypted NVS partitions through GUI, without interacting
        directly with the csv files.
      </p>
      <div v-if="showEncryptionKeyPath" class="field">
        <label class="label">Path to encryption key</label>
        <div class="field is-grouped">
          <div class="control is-expanded">
            <input
              class="input"
              placeholder="/path/to/keys.bin"
              v-model="encryptKeyPath"
            />
          </div>
          <div class="control" style="margin: auto;">
            <span class="icon is-size-4">
              <Icon
                :icon="folderIcon"
                @mouseover="folderIcon = 'folder-opened'"
                @mouseout="folderIcon = 'folder'"
                v-on:click="store.openKeyFile"
              />
            </span>
          </div>
        </div>
      </div>
      <div class="field is-grouped">
        <div class="control">
          <label class="label">Size of partition (bytes)</label>
        </div>
        <div class="control">
          <input
            class="input"
            placeholder="0x3000"
            v-model="partitionSize"
            :class="{ sizeErr: partitionSizeError }"
          />
        </div>
        <div class="control">
          <span
            class="icon is-small has-tooltip-arrow"
            :data-tooltip="partitionSizeError"
            v-if="partitionSizeError"
          >
            <Icon icon="question" />
          </span>
        </div>
      </div>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.sizeErr {
  border-color: rgba(176, 81, 41, 0.1);
  border-bottom-width: 5px;
}
</style>
