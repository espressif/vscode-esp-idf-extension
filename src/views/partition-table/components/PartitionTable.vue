<script setup lang="ts">
</script>

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
                @click="$emit('add')"
              >
                Add New Row
              </button>
            </p>
            <p class="control">
              <button
                class="button is-size-7-mobile is-size-7-tablet"
                @click="$emit('save')"
              >
                Save
              </button>
            </p>
          </div>
        </div>
      </nav>
      <div>
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