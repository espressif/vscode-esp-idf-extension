<template>
  <div class="section no-padding-top">
    <div class="container is-mobile">
      <nav class="level is-mobile">
        <div class="level-left"></div>
        <div class="level-right">
          <div class="field has-addons">
            <p class="control">
              <button
                class="button is-size-7-mobile is-size-7-tablet"
                @click="add"
              >
                Add New Row
              </button>
            </p>
            <p class="control">
              <button
                class="button is-size-7-mobile is-size-7-tablet"
                @click="save"
              >
                Save
              </button>
            </p>
          </div>
        </div>
      </nav>
      <div style="max-height: 350px; overflow: auto;">
        <table class="table is-fullwidth">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Sub Type</th>
              <th>Offset</th>
              <th>Size</th>
              <th>Encrypted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <slot></slot>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Emit, Vue } from "vue-property-decorator";

@Component
export default class PartitionTable extends Vue {
  @Emit()
  add() {}

  @Emit()
  save() {}
}
</script>
