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
              Encrypt
            </label>
          </div>
          <div class="level-item" v-if="encrypt">
            <label class="checkbox is-small">
              <input type="checkbox" v-model="generateKey" />
              Generate encryption key
            </label>
          </div>
          <div class="level-item">
            <p class="buttons are-small">
              <a class="button" href="command:espIdf.flashDevice">
                <span class="icon is-small">
                  <iconify-icon icon="symbol-method" />
                </span>
                &nbsp; Generate
              </a>
            </p>
          </div>
        </div>
      </nav>
      <p class="subtitle is-size-6-mobile">
        NVS CSV Editor can help you to easily edit NVS CSV, generate encrypted
        and non-encrypted partitions through GUI, without interacting directly
        with the csv files.
      </p>
      <div v-if="showEncryptionKeyPath">
        <label class="label">Path to encryption key</label>
        <div class="control">
          <input class="input" placeholder="/path/to/keys.bin" />
          <span class="icon is-small">
            <iconify-icon
              :icon="folderIcon"
              @mouseover="folderIcon = 'folder-opened'"
              @mouseout="folderIcon = 'folder'"
              v-on:click="openKeyFile"
            />
          </span>
        </div>
      </div>
      <div>
        <label class="label">Size of partition (bytes)</label>
        <input class="input" placeholder="0x3000" />
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
  @Action private openKeyFile;
  @Mutation setEncrypt;
  @Mutation setEncryptKeyPath;
  @Mutation setGenerateKey;
  @Mutation setPartitionSize;
  @State("encrypt") private storeEncrypt: Boolean;
  @State("generateKey") private storeGenerateKey: Boolean;
  @State("encryptKeyPath") private storeEncryptKeyPath: string;
  @State("partitionSize") private storePartitionSize: string;

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

  get showEncryptionKeyPath() {
    return this.storeEncrypt && !this.storeGenerateKey;
  }
}
</script>
