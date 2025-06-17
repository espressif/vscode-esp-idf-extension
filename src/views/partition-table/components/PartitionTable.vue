<script setup lang="ts"></script>
<template>
  <div class="settings-table">
    <div class="settings-table-header">
      <div class="settings-table-actions">
        <button
          class="vscode-button"
          @click="$emit('add')"
        >
          Add New Row
        </button>
        <button
          class="vscode-button"
          @click="$emit('save')"
        >
          Save
        </button>
      </div>
    </div>
    <div class="settings-table-content">
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
</template>

<style lang="scss" scoped>
.settings-table {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-table-header {
  display: flex;
  justify-content: flex-end;
}

.settings-table-actions {
  display: flex;
  gap: 0.5rem;
}

.vscode-button {
  height: 28px;
  padding: 0 12px;
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 2px;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vscode-button:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.vscode-button:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.settings-table-content {
  overflow-x: auto;
}
</style>