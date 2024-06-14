<template>
  <div class="section">
    <div class="control centerize">
      <h1 class="title is-spaced">ESP-IDF Extension Troubleshooting Report</h1>
      <br />
    </div>
    <div class="control centerize">
      <form @submit.prevent="store.sendForm" class="centerize">
        <div class="field">
          <div class="control is-flex">
            <label class="label" for="title">Title</label>
          </div>
        </div>
        <div class="field centerize">
          <div class="control centerize">
            <input
              v-model="title"
              id="title"
              type="text"
              class="input"
              required
            />
          </div>
        </div>

        <div class="field">
          <div class="control is-flex">
            <label class="label" for="steps">Steps to Reproduce</label>
          </div>
        </div>
        <div class="field centerize">
          <div class="control centerize">
            <textarea
              v-model="stepsToReproduce"
              id="steps"
              required
              class="textarea"
            ></textarea>
          </div>
        </div>

        <div class="field">
          <div class="control is-flex">
            <label class="label" for="description">Description</label>
          </div>
        </div>
        <div class="field centerize">
          <div class="control centerize">
            <textarea
              v-model="description"
              id="description"
              required
              class="textarea"
            ></textarea>
          </div>
        </div>

        <div class="field centerize">
          <div class="control">
            <button type="submit" class="button">Submit</button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTroubleShootingStore } from "./store";
import { storeToRefs } from "pinia";

const store = useTroubleShootingStore();

const { title, stepsToReproduce, description } = storeToRefs(store);
</script>

<style scoped lang="scss">
@import "../commons/espCommons.scss";
.troubleshooting-report-form {
  align-items: center;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.centerize {
  align-items: center;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.form-group {
  margin-bottom: 20px;
}
</style>
