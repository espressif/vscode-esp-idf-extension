<template>
  <div class="section no-padding-top">
    <div class="container is-mobile">
      <nav class="level is-mobile">
        <div class="level-left"></div>
        <div class="level-right">
          <div class="field is-grouped">
            <div class="control">
              <button class="button is-size-7" @click="$emit('addNewRow')">
                Add new row
              </button>
            </div>
            <div class="control">
              <button class="button is-size-7" @click="$emit('save')">
                Save
              </button>
            </div>
          </div>
        </div>
      </nav>
      <div>
        <table class="table is-fullwidth">
          <thead>
            <tr>
              <th>Key</th>
              <th>Type</th>
              <th>Encoding</th>
              <th>Value</th>
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
