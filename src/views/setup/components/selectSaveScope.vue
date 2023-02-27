<template>
  <div id="select-py-version">
    <div class="field">
      <div class="control centerize">
        <label for="python-version-select" class="label"
          >Select where to save these settings:</label
        >
        <div class="select">
          <select v-model="saveScope" id="settings-location-select">
            <option value="1">Global</option>
            <option value="2">Workspace</option>
            <option value="3">Workspace Folder</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Mutation, State } from "vuex-class";

@Component
export default class selectSaveScope extends Vue {
  @State("saveScope") storeSaveScope: number;
  @Mutation setSaveScope: (id: number) => void;

  get saveScope() {
    return this.storeSaveScope;
  }
  set saveScope(value: number) {
    this.setSaveScope(value);
  }
}
</script>
