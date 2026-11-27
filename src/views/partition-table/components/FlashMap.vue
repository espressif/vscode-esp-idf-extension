<script setup lang="ts">
export interface FlashSegmentView {
  id: string;
  kind: "reserved" | "partition" | "free";
  name: string;
  meta: string;
  title: string;
  width: number;
  index?: number;
}

const props = defineProps<{
  segments: FlashSegmentView[];
}>();

const palette = [
  "#2f6fad",
  "#2e7d4f",
  "#8a5a22",
  "#6a4c93",
  "#8d3a3a",
  "#20706f",
  "#6b6a22",
  "#3d4d86",
];

function segmentStyle(segment: FlashSegmentView, position: number) {
  const style: Record<string, string> = {
    flexGrow: String(segment.width),
    flexBasis: "0",
  };
  if (segment.kind === "partition") {
    style.background = palette[(segment.index ?? position) % palette.length];
  }
  return style;
}
</script>

<template>
  <div class="flash-map" role="img" aria-label="Flash layout">
    <div
      v-for="(segment, position) in props.segments"
      :key="segment.id"
      class="flash-segment"
      :class="`flash-segment-${segment.kind}`"
      :style="segmentStyle(segment, position)"
      :title="segment.title"
    >
      <span class="flash-segment-name">{{ segment.name }}</span>
      <span v-if="segment.width > 8" class="flash-segment-meta">{{ segment.meta }}</span>
    </div>
  </div>
</template>

<style scoped>
.flash-map {
  display: flex;
  width: 100%;
  min-height: 58px;
  overflow-x: auto;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 2px;
  background: var(--vscode-editor-background);
}

.flash-segment {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: max-content;
  padding: 6px 4px;
  text-align: center;
}

.flash-segment + .flash-segment {
  border-left: 1px solid var(--vscode-panel-border);
}

.flash-segment-partition {
  color: #ffffff;
}

.flash-segment-reserved {
  color: var(--vscode-descriptionForeground);
  background: var(--vscode-editor-inactiveSelectionBackground);
}

.flash-segment-free {
  color: var(--vscode-descriptionForeground);
  background: repeating-linear-gradient(
    135deg,
    var(--vscode-editor-background),
    var(--vscode-editor-background) 6px,
    var(--vscode-editor-inactiveSelectionBackground) 6px,
    var(--vscode-editor-inactiveSelectionBackground) 12px
  );
}

.flash-segment-name,
.flash-segment-meta {
  white-space: nowrap;
}

.flash-segment-name {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.flash-segment-meta {
  font-size: 10px;
  opacity: 0.9;
}
</style>
