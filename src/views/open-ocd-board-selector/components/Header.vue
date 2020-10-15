<template>
  <header class="section">
    <div class="container">
      <nav class="level is-mobile">
        <div class="level-left">
          <div class="level-item">
            <h1 class="title is-size-5-mobile">
              <strong>{{ title }}</strong>
            </h1>
          </div>
        </div>
        <div class="level-right">
          <div class="level-item">
            <p class="buttons are-small">
              <button class="button" title="Save" @click="save">
                <span class="icon is-small">
                  <i class="fas fa-save"></i>
                </span>
                <span>Save</span>
              </button>
            </p>
          </div>
        </div>
      </nav>
      <p class="subtitle is-size-6-mobile">
        {{ subtitle }}
      </p>
    </div>
  </header>
</template>

<script lang="ts">
import { Emit, Component, Vue, Prop } from "vue-property-decorator";

@Component
export default class OpenOCDBoardManagerApp extends Vue {
  @Prop() title!: string;
  @Prop() subtitle!: string;

  @Emit()
  save() {}
}
</script>
