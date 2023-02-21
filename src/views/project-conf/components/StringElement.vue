<template>
  <div class="block">
    <div class="field">
      <div class="control is-flex">
        <label :for="value" class="label">{{ title }} </label>
      </div>
    </div>
    <div class="field has-addons">
      <div class="control expanded">
        <input type="text is-small" v-model="stringValue" class="input" />
      </div>
      <div class="control" v-if="openMethod">
        <div class="icon is-large is-size-4" style="text-decoration: none;">
          <iconify-icon
            :icon="folderIcon"
            @mouseover="folderIcon = 'folder-opened'"
            @mouseout="folderIcon = 'folder'"
            v-on:click="openMethod(sections)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class CMakeListElement extends Vue {
  private folderIcon = "folder";
  @Prop() public title: string;
  @Prop() public value: string;
  @Prop() public updateMethod: (sections: string[], newValue: any) => void;
  @Prop() public sections: string[];
  @Prop() openMethod: (sections: string[]) => void;

  get stringValue() {
    return this.value;
  }
  set stringValue(newVal: any) {
    this.updateMethod(this.sections, newVal);
  }
}
</script>

<style scoped>
.expanded {
  width: 70%;
  align-items: center;
  display: flex;
  justify-content: center;
}
</style>
