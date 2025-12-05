<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, onMounted } from "vue";
import { useWelcomeStore } from "./store";
import Logo from "./components/logo.vue";
import BlogArticles from "./components/BlogArticles.vue";
import {
  IconComment,
  IconFolderOpened,
  IconGear,
  IconGithub,
  IconNewFolder,
  IconTypeHierarchy,
} from "@iconify-prerendered/vue-codicon";

const store = useWelcomeStore();

const { extensionVersion } = storeToRefs(store);

const whatsNewLink = computed(() => {
  return `https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v${extensionVersion.value}`;
});

onMounted(() => {
  store.requestInitValues();
});
</script>

<template>
  <div id="app">
    <!-- Header Section -->
    <div class="header">
      <div class="header-content">
        <Logo class="logo" />
        <h1 class="title">Welcome to Espressif IDF extension</h1>
      </div>
    </div>

    <!-- Version and Links Section -->
    <div class="version-section">
      <div class="version-row">
        <div class="version-info">
          <span class="version-text">Version: {{ extensionVersion }}</span>
          <a :href="whatsNewLink" class="link">See what's new</a>
        </div>

        <div class="checkbox-container">
          <label class="checkbox">
            <input
              type="checkbox"
              v-model="store.showOnInit"
              @change="store.updateShowOnboardingOnInit"
            />
            <span class="checkbox-label"
              >Show Welcome on extension startup</span
            >
          </label>
        </div>

        <div class="external-links">
          <a
            href="https://github.com/espressif/idf-im-ui/releases"
            class="link"
          >
            <IconGithub class="icon" />
            ESP-IDF Installation Manager
          </a>
          <a
            href="https://github.com/espressif/vscode-esp-idf-extension"
            class="link"
          >
            <IconGithub class="icon" />
            Repository
          </a>
          <a href="https://esp32.com/viewforum.php?f=40" class="link">
            <IconComment class="icon" />
            ESP32 Forum
          </a>
          <a href="https://github.com/espressif/esp-idf" class="link">
            <IconGithub class="icon" />
            ESP-IDF
          </a>
          <a
            href="https://github.com/espressif/vscode-esp-idf-extension/issues/new/choose"
            class="link"
          >
            <IconGithub class="icon" />
            Open a new issue
          </a>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Quick Actions Section -->
      <div class="section">
        <h2 class="section-title">Quick actions</h2>
        <div class="button-group">
          <button @click="store.openSetupPanel" class="action-button">
            <IconGear class="icon" />
            Configure extension
          </button>
          <button @click="store.openNewProjectPanel" class="action-button">
            <IconNewFolder class="icon" />
            New project
          </button>
          <button @click="store.openImportProject" class="action-button">
            <IconFolderOpened class="icon" />
            Import project
          </button>
          <button @click="store.exploreComponents" class="action-button">
            <IconTypeHierarchy class="icon" />
            Components manager
          </button>
        </div>
      </div>

      <!-- Getting Started Section -->
      <div class="section">
        <h2 class="section-title">Getting Started</h2>

        <div class="getting-started-grid">
          <!-- Tutorials -->
          <div class="subsection">
            <h3 class="subsection-title">Tutorials</h3>
            <div class="link-group">
              <a
                href="https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/installation.html"
                class="link"
              >
                Install
              </a>
              <a
                href="https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/startproject.html"
                class="link"
              >
                Start a ESP-IDF project
              </a>
              <a
                href="https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/configureproject.html"
                class="link"
              >
                Configure your project
              </a>
              <a
                href="https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/debugproject.html"
                class="link"
              >
                Debugging
              </a>
              <a
                href="https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/index.html"
                class="link"
              >
                Others...
              </a>
            </div>
          </div>

          <!-- Documentation -->
          <div class="subsection">
            <h3 class="subsection-title">Documentation</h3>
            <div class="link-group">
              <a
                href="https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/settings.html"
                class="link"
              >
                Settings
              </a>
              <a
                href="https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/troubleshooting.html"
                class="link"
              >
                Troubleshooting
              </a>
              <a
                href="https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/index.html"
                class="link"
              >
                Features
              </a>
              <a
                href="https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/commands.html"
                class="link"
              >
                Commands
              </a>
              <a
                href="https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/additionalfeatures.html"
                class="link"
              >
                Additional IDE features...
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Latest Articles Section - Full Width -->
    <div class="full-width-section">
      <BlogArticles />
    </div>
  </div>
</template>

<style lang="scss" scoped>
#app {
  color: var(--vscode-foreground);
  background-color: var(--vscode-editor-background);
  height: 100vh;
  overflow-y: auto;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  line-height: 1.4;
}

.header {
  text-align: center;
  margin-bottom: 32px;
  padding-top: 10px;
  padding-bottom: 24px;
}

.header-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.logo {
  margin: 0;
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: var(--vscode-foreground);
  margin: 0;
}

.version-section {
  margin-bottom: 32px;
  padding: 16px;
  background-color: var(--vscode-notifications-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
}

.version-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.version-text {
  color: var(--vscode-descriptionForeground);
  font-size: 14px;
  white-space: nowrap;
}

.checkbox-container {
  flex-shrink: 0;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;

  &:hover {
    color: var(--vscode-button-background);
  }

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--vscode-button-background);
  }

  .checkbox-label {
    font-size: 14px;
    color: var(--vscode-foreground);
  }
}

.external-links {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-left: auto;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 32px;
  align-items: start;
  margin-bottom: 32px;
}

.section {
  background-color: var(--vscode-notifications-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  padding: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--vscode-foreground);
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: var(--vscode-button-hoverBackground);
  }

  &:active {
    background-color: var(--vscode-button-activeBackground);
  }

  &:focus {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }
}

.getting-started-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.subsection {
  margin-bottom: 0;

  &:last-child {
    margin-bottom: 0;
  }
}

.subsection-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-foreground);
  margin: 0 0 12px 0;
}

.link-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--vscode-textLink-foreground);
  text-decoration: none;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    color: var(--vscode-button-background);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-weight: 500;
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    color: var(--vscode-button-activeBackground);
  }

  &:focus {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }

  .icon {
    transition: transform 0.2s ease;
  }

  &:hover .icon {
    transform: scale(1.1);
    color: var(--vscode-button-background);
  }
}

.icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* Responsive design */
@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .external-links {
    flex-direction: column;
    gap: 8px;
  }

  .getting-started-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

.full-width-section {
  width: 100%;
  margin-bottom: 32px;
}
</style>
