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
        <div class="icon" style="text-decoration: none;">
          <i
            :class="folderIcon"
            @mouseover="folderIcon = 'codicon codicon-folder-opened'"
            @mouseout="folderIcon = 'codicon codicon-folder'"
            v-on:click="openMethod"
          ></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class folderOpen extends Vue {
  private folderIcon = "codicon codicon-folder";
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
