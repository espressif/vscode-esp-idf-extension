<template>
  <div>
    <label class="label">{{ propLabel }}</label>
    <div class="field has-addons align-center">
      <div class="control expanded">
        <input
          type="text"
          class="input"
          v-model="dataModel"
          @keyup.enter="onKeyEnter"
        />
      </div>
      <p class="control" v-if="staticText">
        <a class="button is-static">{{ pathSep + staticText }}</a>
      </p>
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
import { State } from "vuex-class";

@Component
export default class folderOpen extends Vue {
  private folderIcon = "folder";
  @State("pathSep") private storePathSep: string;
  @Prop() keyEnterMethod?: () => void;
  @Prop() onChangeMethod?: () => void;
  @Prop() openMethod: () => void;
  @Prop() propLabel: string;
  @Prop() propModel: string;
  @Prop() propMutate: (val: string) => void;
  @Prop() staticText: string;

  get dataModel() {
    return this.propModel;
  }
  set dataModel(newValue) {
    if (this.onChangeMethod) {
      this.onChangeMethod();
    }
    this.propMutate(newValue);
  }

  get pathSep() {
    return this.storePathSep;
  }

  onKeyEnter() {
    if (this.keyEnterMethod) {
      this.keyEnterMethod();
    }
  }
}
</script>
