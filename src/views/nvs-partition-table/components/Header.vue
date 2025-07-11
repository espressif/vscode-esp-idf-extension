<script setup lang="ts">
import { ref, watch } from "vue";
import { useNvsPartitionTableStore } from "../store";
import { storeToRefs } from "pinia";
import {
  IconSymbolMethod,
  IconRefresh,
  IconFolder,
} from "@iconify-prerendered/vue-codicon";
import { vMaska } from "maska";

const store = useNvsPartitionTableStore();
const {
  encrypt,
  generateKey,
  encryptKeyPath,
  partitionSize,
  partitionSizeError,
} = storeToRefs(store);
const showEncryptionKeyPath = ref(false);

// Watch for encryption changes
watch(encrypt, (newValue) => {
  showEncryptionKeyPath.value = newValue && !generateKey.value;
});

// Watch for generate key changes
watch(generateKey, (newValue) => {
  showEncryptionKeyPath.value = encrypt.value && !newValue;
});
</script>

<template>
  <div class="header">
    <div class="header-content">
      <div class="header-title">
        <div class="title-container">
          <strong>ESP-IDF</strong>
          <span>NVS Partition Table</span>
        </div>
        <div class="settings-description">
          Configure your NVS partition table. Each row represents a key-value
          pair in the NVS partition.
        </div>
      </div>
      <div class="header-actions">
        <div class="action-group">
          <div class="settings-control">
            <div class="checkbox-wrapper">
              <label
                class="vscode-checkbox"
                role="checkbox"
                :aria-checked="encrypt"
              >
                <input
                  type="checkbox"
                  :checked="encrypt"
                  @change="encrypt = ($event.target as HTMLInputElement)?.checked"
                  style="display: none;"
                />
                <span class="icon" :class="{ 'is-checked': encrypt }">
                  <span class="check-mark" v-if="encrypt">✓</span>
                </span>
                <span>Encrypt</span>
              </label>
            </div>
            <div class="checkbox-wrapper" v-if="encrypt">
              <label
                class="vscode-checkbox"
                role="checkbox"
                :aria-checked="generateKey"
              >
                <input
                  type="checkbox"
                  :checked="generateKey"
                  @change="generateKey = ($event.target as HTMLInputElement)?.checked"
                  style="display: none;"
                />
                <span class="icon" :class="{ 'is-checked': generateKey }">
                  <span class="check-mark" v-if="generateKey">✓</span>
                </span>
                <span>Generate encryption key</span>
              </label>
            </div>
          </div>
        </div>
        <div class="action-group">
          <div class="settings-control">
            <div class="field has-addons">
              <div class="control">
                <div class="settings-header-actions">
                  <input
                    class="input is-size-7-mobile is-size-7-tablet"
                    v-maska
                    data-maska="0xWWWWWWWWWW"
                    data-maska-tokens="W:[0-9a-fA-F]"
                    placeholder="0x3000"
                    v-model="partitionSize"
                    :class="{ 'is-danger': partitionSizeError }"
                  />
                  <button class="button" @click="store.genPartition">
                    <span class="icon">
                      <IconSymbolMethod />
                    </span>
                    <span>Generate</span>
                  </button>
                  <button class="button" @click="store.initDataRequest">
                    <span class="icon">
                      <IconRefresh />
                    </span>
                    <span>Reload</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="action-group" v-if="showEncryptionKeyPath">
          <div class="settings-control">
            <div class="field has-addons">
              <div class="control is-expanded">
                <input
                  class="input is-size-7-mobile is-size-7-tablet"
                  placeholder="/path/to/keys.bin"
                  v-model="encryptKeyPath"
                />
              </div>
              <div class="control">
                <div class="settings-header-actions">
                  <button class="button" @click="store.openKeyFile">
                    <span class="icon">
                      <IconFolder />
                    </span>
                    <span>Browse</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.header {
  background-color: var(--vscode-editor-background);
  border-bottom: 1px solid var(--vscode-panel-border);
  padding: 16px;
  margin-bottom: 16px;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-title {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .title-container {
    display: flex;
    gap: 8px;
    align-items: center;
    color: var(--vscode-settings-headerForeground);

    strong {
      font-size: 18px;
      font-weight: 600;
    }

    span {
      color: var(--vscode-foreground);
      font-size: 18px;
      font-weight: 400;
    }
  }

  .settings-description {
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
    line-height: 1.4;
  }
}

.header-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-group {
  display: flex;
  gap: 16px;
  align-items: center;
}

.settings-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
}

.vscode-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--vscode-foreground);
  font-size: 13px;
  cursor: pointer;
  user-select: none;

  .icon {
    width: 16px;
    height: 16px;
    border: 1px solid var(--vscode-checkbox-border);
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--vscode-checkbox-background);
    transition: background-color 0.1s ease;

    &.is-checked {
      background-color: var(--vscode-checkbox-selectBackground);
      border-color: var(--vscode-checkbox-selectBorder);
    }

    .check-mark {
      color: var(--vscode-checkbox-foreground);
      font-size: 12px;
      line-height: 1;
    }
  }

  &:hover .icon {
    background-color: var(--vscode-checkbox-hoverBackground);
  }
}

.field.has-addons {
  display: flex;
  gap: 8px;
}

.input.is-size-7-mobile.is-size-7-tablet {
  height: 32px;
  padding: 0 8px;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 2px;
  font-size: 13px;
  line-height: 1.4;
  width: 100%;
  box-sizing: border-box;

  &:hover {
    border-color: var(--vscode-input-border);
  }

  &:focus {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: -1px;
  }

  &::placeholder {
    color: var(--vscode-input-placeholderForeground);
  }

  &.is-danger {
    border-color: var(--vscode-errorForeground);
  }
}

.settings-header-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.button {
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: none;
  height: 32px !important;
  padding: 0 12px;
  font-size: 13px !important;
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 2px;
  cursor: pointer;
  transition: background-color 0.1s ease;

  &:hover {
    background-color: var(--vscode-button-secondaryHoverBackground);
  }

  .icon {
    font-size: 16px;
  }
}
</style>
