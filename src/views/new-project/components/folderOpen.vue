<template>
  <div class="field text-size">
    <label class="label">{{ propLabel }}</label>
    <div class="field expanded has-addons">
      <div class="control expanded">
        <input
          type="text"
          class="input"
          v-model="dataModel"
          @keyup.enter="onKeyEnter"
        />
      </div>
      <div class="control" v-if="staticText">
        <a class="button is-static">{{ pathSep + staticText }}</a>
      </div>
      <div class="control">
        <div class="icon is-large is-size-4" style="text-decoration: none;">
          <iconify-icon
            :icon="folderIcon"
            @mouseover="folderIcon = 'folder-opened'"
            @mouseout="folderIcon = 'folder'"
            v-on:click="openMethod"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class folderOpen extends Vue {
  private folderIcon = "folder";
  @Prop() propLabel: string;
  @Prop() propModel: string;
  @Prop() propMutate: (val: string) => void;
  @Prop() openMethod: () => void;
  @Prop() keyEnterMethod?: () => void;
  @Prop() staticText: string;

  get dataModel() {
    return this.propModel;
  }
  set dataModel(newValue) {
    this.propMutate(newValue);
  }

  onKeyEnter() {
    if (this.keyEnterMethod) {
      this.keyEnterMethod();
    }
  }

  get pathSep() {
    return navigator.platform.indexOf("Win") !== -1 ? "\\" : "/";
  }
}
</script>
