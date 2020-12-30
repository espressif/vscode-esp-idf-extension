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
              <a class="button" @click="genPartition">
                <span class="icon is-small">
                  <iconify-icon icon="symbol-method" />
                </span>
                &nbsp; Generate partition
              </a>
              <button class="button" title="Retry" @click="initDataRequest">
                <span class="icon is-small">
                  <iconify-icon icon="refresh" />
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
              <iconify-icon
                :icon="folderIcon"
                @mouseover="folderIcon = 'folder-opened'"
                @mouseout="folderIcon = 'folder'"
                v-on:click="openKeyFile"
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
            <iconify-icon icon="question" />
          </span>
        </div>
      </div>
    </div>
  </header>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";

@Component
export default class Header extends Vue {
  private folderIcon = "folder";
  @Action private genPartition;
  @Action private openKeyFile;
  @Action private initDataRequest;
  @Mutation setEncrypt;
  @Mutation setEncryptKeyPath;
  @Mutation setGenerateKey;
  @Mutation setPartitionSize;
  @State("encrypt") private storeEncrypt: Boolean;
  @State("generateKey") private storeGenerateKey: Boolean;
  @State("encryptKeyPath") private storeEncryptKeyPath: string;
  @State("partitionSize") private storePartitionSize: string;
  @State("partitionSizeError") private storePartSizeError: string;

  get encrypt() {
    return this.storeEncrypt;
  }
  set encrypt(val: Boolean) {
    this.setEncrypt(val);
  }

  get encryptKeyPath() {
    return this.storeEncryptKeyPath;
  }
  set encryptKeyPath(val: string) {
    this.setEncryptKeyPath(val);
  }

  get generateKey() {
    return this.storeGenerateKey;
  }
  set generateKey(val: Boolean) {
    this.setGenerateKey(val);
  }

  get partitionSize() {
    return this.storePartitionSize;
  }
  set partitionSize(val: string) {
    this.setPartitionSize(val);
  }

  get partitionSizeError() {
    return this.storePartSizeError;
  }

  get showEncryptionKeyPath() {
    return this.storeEncrypt && !this.storeGenerateKey;
  }

  mounted() {
    this.initDataRequest();
  }
}
</script>

<style lang="scss" scoped>
.sizeErr {
  border-color: rgba(176, 81, 41, 0.1);
  border-bottom-width: 5px;
}
</style>
