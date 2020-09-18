<template>
  <div class="field centerize text-size">
    <label class="label">{{ propLabel }}</label>
    <div class="field is-grouped is-grouped-centered expanded">
      <div class="control expanded">
        <input type="text" class="input" v-model="dataModel" />
      </div>
      <p class="control" v-if="staticText">
        <a class="button is-static">{{ pathSep + staticText }}</a>
      </p>
      <div class="control">
        <div class="icon">
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
  @Prop() staticText: string;

  get dataModel() {
    return this.propModel;
  }
  set dataModel(newValue) {
    this.propMutate(newValue);
  }

  get pathSep() {
    return navigator.platform.indexOf("Win") !== -1 ? "\\" : "/";
  }
}
</script>
