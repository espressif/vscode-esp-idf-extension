<script setup lang="ts">
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useWelcomeStore } from "../store";
import { IconLinkExternal } from "@iconify-prerendered/vue-codicon";
import Logo from "./logo.vue";

const store = useWelcomeStore();
const { blogArticles, isLoadingArticles } = storeToRefs(store);

// Track failed images
const failedImages = ref(new Set<string>());
const imageAttempts = ref(new Map<string, number>());

const handleImageError = (imageUrl: string) => {
  console.error('Image failed to load:', imageUrl);
  
  const attempts = imageAttempts.value.get(imageUrl) || 0;
  imageAttempts.value.set(imageUrl, attempts + 1);
  
  // If this is a WebP image and we haven't tried alternatives yet
  if (imageUrl.includes('.webp') && attempts === 0) {
    // Try JPG version
    const jpgUrl = imageUrl.replace(/\.webp$/i, '.jpg');
    console.log('Trying JPG fallback:', jpgUrl);
    
    // Update the image source
    const imgElement = event?.target as HTMLImageElement;
    if (imgElement) {
      imgElement.src = jpgUrl;
      return; // Don't mark as failed yet
    }
  } else if (imageUrl.includes('.webp') && attempts === 1) {
    // Try PNG version
    const pngUrl = imageUrl.replace(/\.webp$/i, '.png');
    console.log('Trying PNG fallback:', pngUrl);
    
    const imgElement = event?.target as HTMLImageElement;
    if (imgElement) {
      imgElement.src = pngUrl;
      return; // Don't mark as failed yet
    }
  }
  
  // All attempts failed, mark as failed
  failedImages.value.add(imageUrl);
};

const handleImageLoad = (imageUrl: string) => {
  console.log('Image loaded successfully:', imageUrl);
  failedImages.value.delete(imageUrl);
  imageAttempts.value.delete(imageUrl);
};

const getImageUrl = (originalUrl: string) => {
  console.log('Processing image URL:', originalUrl);
  return originalUrl; // Always try the original URL first
};

// onMounted(() => {
//   store.fetchBlogArticles();
// });
</script>

<template>
  <div class="section">
    <h2 class="section-title">Espressif Developer Portal Latest Articles</h2>

    <div v-if="isLoadingArticles" class="loading">
      <div class="loading-spinner"></div>
      <span>Loading articles...</span>
    </div>

    <div v-else-if="blogArticles.length === 0" class="no-articles">
      <span>No articles available</span>
    </div>

    <div v-else class="articles-grid">
      <article
        v-for="article in blogArticles"
        :key="article.url"
        class="article-card"
        @click="store.openArticle(article.url)"
      >
        <div class="article-image" v-if="article.image && !failedImages.has(article.image)">
          <img 
            :src="getImageUrl(article.image)" 
            :alt="article.title"
            @error="handleImageError(article.image)"
            @load="handleImageLoad(article.image)"
          />
        </div>
        <div class="article-image-placeholder" v-else>
          <Logo class="placeholder-icon" />
          <span class="placeholder-text">No image</span>
        </div>
        <div class="article-content">
          <h4 class="article-title">{{ article.title }}</h4>
          <p class="article-description">{{ article.description }}</p>
          <div class="article-meta">
            <span class="article-date">{{ article.pubDate }}</span>
            <IconLinkExternal class="external-icon" />
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.loading,
.no-articles {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--vscode-descriptionForeground);
  font-size: 14px;
  gap: 12px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--vscode-panel-border);
  border-top: 2px solid var(--vscode-button-background);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--vscode-foreground);
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  width: 100%;
}

.article-card {
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--vscode-button-background);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  &:focus {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }
}

.article-image {
  width: 100%;
  height: 160px;
  overflow: hidden;
  background-color: var(--vscode-notifications-background);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.2s ease;
  }

  .article-card:hover & img {
    transform: scale(1.05);
  }
}

.article-image-placeholder {
  width: 100%;
  height: 160px;
  background-color: var(--vscode-notifications-background);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--vscode-descriptionForeground);
}

.placeholder-icon {
  width: 32px;
  height: 32px;
  opacity: 0.5;
}

.placeholder-text {
  font-size: 12px;
  opacity: 0.7;
}

.article-content {
  padding: 16px;
}

.article-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-foreground);
  margin: 0 0 8px 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-description {
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
  margin: 0 0 12px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.article-date {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.external-icon {
  width: 14px;
  height: 14px;
  color: var(--vscode-descriptionForeground);
  opacity: 0.7;
  transition: opacity 0.2s ease;

  .article-card:hover & {
    opacity: 1;
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .articles-grid {
    grid-template-columns: 1fr;
  }

  .article-image {
    height: 140px;
  }
}
</style>
