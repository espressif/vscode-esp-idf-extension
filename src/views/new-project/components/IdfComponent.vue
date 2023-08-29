<script setup lang="ts">
import { IComponent } from '../../../espIdf/idfComponent/IdfComponent';
const props = defineProps<{
  comp: IComponent;
  removeComponent: (comp: IComponent) => void;
}>();
</script>

<template>
  <div class="field is-grouped">
    <label class="label" :for="comp.name" v-text="comp.path" />
    <div class="control icon">
      <div class="icon is-large is-size-4">
        <iconify-icon icon="close" @click="removeComponent(comp)" />
      </div>
    </div>
  </div>
</template>