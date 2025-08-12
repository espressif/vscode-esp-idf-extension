<template>
  <div class="image-viewer">
    <!-- Variable Input Section -->
    <div class="variable-input" v-if="!imageData">
      <h3>Load Image from Debug Variable</h3>
      <div class="input-group">
        <label for="variableName">Variable Name:</label>
        <input 
          type="text" 
          id="variableName" 
          v-model="variableName" 
          placeholder="e.g., image_data, buffer, etc."
        />
      </div>
      <div class="input-group">
        <label for="imageSize">Image Size:</label>
        <input 
          type="text" 
          id="imageSize" 
          v-model="imageSize" 
          placeholder="e.g., 191724 or size_variable"
        />
        <small>Enter a number (bytes) or variable name containing the size</small>
      </div>
      <button @click="loadImageFromVariable" :disabled="!variableName || !imageSize">
        Load Image
      </button>
      <div v-if="loadError" class="error">
        {{ loadError }}
      </div>
    </div>

    <!-- Image Display Section -->
    <div v-if="imageData" class="image-display">
      <div class="image-info">
        <h3>{{ imageName }}</h3>
        <p>{{ imageInfo }}</p>
      </div>
      
      <div class="image-container">
        <canvas ref="canvas" :width="canvasWidth" :height="canvasHeight"></canvas>
      </div>
    </div>
    
    <div class="controls">
      <div class="control-group">
        <label for="formatSelect">Format:</label>
                    <select id="formatSelect" v-model="selectedFormat" @change="updateImage">
              <option value="rgb565">RGB565</option>
              <option value="rgb888">RGB888</option>
              <option value="grayscale">Grayscale</option>
              <option value="yuv420">YUV420</option>
              <option value="yuv422">YUV422</option>
              <option value="yuv444">YUV444</option>
            </select>
      </div>
      
      <div class="control-group">
        <label for="widthInput">Width:</label>
        <input 
          type="number" 
          id="widthInput" 
          v-model="customWidth" 
          placeholder="Auto-detect"
          @change="updateImage"
        />
        <label for="heightInput">Height:</label>
        <input 
          type="number" 
          id="heightInput" 
          v-model="customHeight" 
          placeholder="Auto-detect"
          @change="updateImage"
        />
        <button @click="updateImage">Update</button>
        <div class="preset-sizes">
          <button @click="setSize(256, 250)">256×250</button>
          <button @click="setSize(320, 200)">320×200</button>
          <button @click="setSize(512, 125)">512×125</button>
          <button @click="setSize(640, 100)">640×100</button>
        </div>
      </div>
      
      <div v-if="error" class="error">
        {{ error }}
      </div>
      
      <div class="debug-info">
        <details>
          <summary>Debug Information</summary>
          <div class="debug-content">
            <p><strong>Data Preview (first 32 bytes):</strong></p>
            <pre>{{ dataPreview }}</pre>
            <p><strong>Data Statistics:</strong></p>
            <ul>
              <li>Total bytes: {{ imageData ? imageData.length : 0 }}</li>
              <li>Min value: {{ dataStats.min }}</li>
              <li>Max value: {{ dataStats.max }}</li>
              <li>Average: {{ dataStats.avg.toFixed(2) }}</li>
            </ul>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface ImageData {
  data: string;
  name: string;
}

const canvas = ref<HTMLCanvasElement>();
const imageName = ref<string>('');
const imageInfo = ref<string>('Loading...');
const selectedFormat = ref<string>('rgb888');
const customWidth = ref<number | null>(null);
const customHeight = ref<number | null>(null);
const error = ref<string>('');
const canvasWidth = ref<number>(400);
const canvasHeight = ref<number>(300);

// New variables for variable input
const variableName = ref<string>('');
const imageSize = ref<string>('');
const loadError = ref<string>('');

let imageData: Uint8Array | null = null;

// Debug information
const dataPreview = ref<string>('');
const dataStats = ref({
  min: 0,
  max: 0,
  avg: 0
});



const vscode = (window as any).acquireVsCodeApi();

onMounted(() => {
  // Listen for messages from the extension
  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.command) {
      case 'updateImage':
        handleImageUpdate(message);
        break;
      case 'showError':
        loadError.value = message.error;
        break;
    }
  });
  
  // Request initial image data if we have an image
  if (imageData) {
    vscode.postMessage({ command: 'requestImageData' });
  }
});

function loadImageFromVariable() {
  if (!variableName.value || !imageSize.value) {
    loadError.value = 'Please enter both variable name and size';
    return;
  }
  
  loadError.value = '';
  
  // Try to parse size as number first
  const sizeValue = isNaN(Number(imageSize.value)) ? imageSize.value : Number(imageSize.value);
  
  vscode.postMessage({
    command: 'loadImageFromVariable',
    variableName: variableName.value,
    size: sizeValue
  });
}

function handleImageUpdate(data: ImageData) {
  try {
    imageName.value = data.name;
    // Convert base64 to Uint8Array using a more direct approach
    let binaryString: string;
    try {
      binaryString = atob(data.data);
      imageData = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        imageData[i] = binaryString.charCodeAt(i);
      }
    } catch (err) {
      console.error('Base64 decode error:', err);
      // Fallback: try to use the data as-is
      imageData = new Uint8Array(0);
      error.value = 'Failed to decode base64 data';
      return;
    }
    
    console.log('Data conversion debug:', {
      base64Length: data.data.length,
      binaryStringLength: binaryString.length,
      imageDataLength: imageData.length,
      firstBytes: Array.from(imageData.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')
    });
    

    
    // Calculate debug information
    if (imageData && imageData.length > 0) {
      // Data preview (first 32 bytes as hex)
      const previewBytes = imageData.slice(0, 32);
      dataPreview.value = Array.from(previewBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      
      // Data statistics - use efficient iteration instead of spread operator
      let min = 255;
      let max = 0;
      let sum = 0;
      
      // Only process first 10000 bytes for performance, or all if smaller
      const sampleSize = Math.min(imageData.length, 10000);
      
      for (let i = 0; i < sampleSize; i++) {
        const val = imageData[i];
        if (val < min) min = val;
        if (val > max) max = val;
        sum += val;
      }
      
      const avg = sum / sampleSize;
      
      dataStats.value = { min, max, avg };
    }
    
    updateImage();
  } catch (err) {
    error.value = `Failed to load image: ${err}`;
  }
}

function setSize(width: number, height: number) {
  customWidth.value = width;
  customHeight.value = height;
  updateImage();
}

function updateImage() {
  if (!imageData || !canvas.value) {
    return;
  }
  
  try {
    error.value = '';
    const ctx = canvas.value.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    const width = customWidth.value || estimateWidth();
    const height = customHeight.value || estimateHeight();
    
    canvasWidth.value = width;
    canvasHeight.value = height;
    
    const imageDataObj = ctx.createImageData(width, height);
    const pixels = imageDataObj.data;
    
    switch (selectedFormat.value) {
      case 'rgb565':
        renderRGB565(pixels, width, height);
        break;
      case 'rgb888':
        renderRGB888(pixels, width, height);
        break;
      case 'grayscale':
        renderGrayscale(pixels, width, height);
        break;
      case 'yuv420':
        renderYUV420(pixels, width, height);
        break;
      case 'yuv422':
        renderYUV422(pixels, width, height);
        break;
      case 'yuv444':
        renderYUV444(pixels, width, height);
        break;
      default:
        renderRGB888(pixels, width, height);
        break;
    }
    
    ctx.putImageData(imageDataObj, 0, 0);
    
    // Add debugging information
    const bytesPerPixel = selectedFormat.value === 'rgb565' ? 2 : 
                         (selectedFormat.value === 'rgb888' || selectedFormat.value === 'yuv444') ? 3 :
                         selectedFormat.value === 'yuv420' ? 1.5 :
                         selectedFormat.value === 'yuv422' ? 2 : 1;
    const expectedPixels = Math.floor(imageData.length / bytesPerPixel);
    const actualPixels = width * height;
    
    imageInfo.value = `${selectedFormat.value.toUpperCase()} - ${width}x${height} - ${imageData.length} bytes - ${expectedPixels} pixels (${actualPixels} displayed)`;
    
    // Add more detailed debugging
    console.log('Image rendering debug:', {
      format: selectedFormat.value,
      width,
      height,
      dataLength: imageData.length,
      bytesPerPixel,
      expectedPixels,
      actualPixels,
      firstBytes: Array.from(imageData.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')
    });
  } catch (err) {
    error.value = `Failed to render image: ${err}`;
  }
}

function estimateWidth(): number {
  if (!imageData) return 400;
  
  // For different formats, calculate pixels differently
  let totalPixels = imageData.length;
  
  switch (selectedFormat.value) {
    case 'rgb565':
      totalPixels = Math.floor(imageData.length / 2); // 2 bytes per pixel
      break;
    case 'rgb888':
    case 'yuv444':
      totalPixels = Math.floor(imageData.length / 3); // 3 bytes per pixel
      break;
    case 'yuv420':
      // YUV420: Y plane + U plane (1/4 size) + V plane (1/4 size)
      // For width*height pixels: width*height + (width*height)/4 + (width*height)/4 = width*height * 1.5
      totalPixels = Math.floor(imageData.length / 1.5);
      break;
    case 'yuv422':
      // YUV422: Y plane + U plane (1/2 size) + V plane (1/2 size)
      // For width*height pixels: width*height + (width*height)/2 + (width*height)/2 = width*height * 2
      totalPixels = Math.floor(imageData.length / 2);
      break;
    case 'grayscale':
    default:
      totalPixels = imageData.length; // 1 byte per pixel
      break;
  }
  
  console.log('Width estimation:', {
    format: selectedFormat.value,
    dataLength: imageData.length,
    totalPixels
  });
  
  // For your data: 191,724 bytes ÷ 3 = 63,908 pixels
  // Let's try to find reasonable dimensions
  // Common image sizes that might work:
  const possibleWidths = [256, 320, 384, 512, 640, 800, 1024];
  
  for (const testWidth of possibleWidths) {
    const testHeight = Math.floor(totalPixels / testWidth);
    if (testHeight > 0 && testHeight <= 1000) {
      console.log('Found reasonable dimensions:', testWidth, 'x', testHeight);
      return testWidth;
    }
  }
  
  // If no reasonable dimensions found, use a simple square approximation
  const squareSize = Math.floor(Math.sqrt(totalPixels));
  console.log('Using square size:', squareSize);
  return squareSize || 256;
}

function estimateHeight(): number {
  if (!imageData || !customWidth.value) return 300;
  
  // For different formats, calculate pixels differently
  let totalPixels = imageData.length;
  
  switch (selectedFormat.value) {
    case 'rgb565':
      totalPixels = Math.floor(imageData.length / 2); // 2 bytes per pixel
      break;
    case 'rgb888':
    case 'yuv444':
      totalPixels = Math.floor(imageData.length / 3); // 3 bytes per pixel
      break;
    case 'yuv420':
      // YUV420: Y plane + U plane (1/4 size) + V plane (1/4 size)
      // For width*height pixels: width*height + (width*height)/4 + (width*height)/4 = width*height * 1.5
      totalPixels = Math.floor(imageData.length / 1.5);
      break;
    case 'yuv422':
      // YUV422: Y plane + U plane (1/2 size) + V plane (1/2 size)
      // For width*height pixels: width*height + (width*height)/2 + (width*height)/2 = width*height * 2
      totalPixels = Math.floor(imageData.length / 2);
      break;
    case 'grayscale':
    default:
      totalPixels = imageData.length; // 1 byte per pixel
      break;
  }
  
  const height = Math.floor(totalPixels / customWidth.value);
  console.log('Height estimation:', {
    totalPixels,
    width: customWidth.value,
    height
  });
  return height || 300;
}

function renderRGB565(pixels: Uint8ClampedArray, width: number, height: number) {
  if (!imageData) return;
  
  const bytesPerPixel = 2;
  const maxPixels = Math.min(imageData.length / bytesPerPixel, width * height);
  
  for (let i = 0; i < maxPixels; i++) {
    const dataIndex = i * bytesPerPixel;
    const pixelIndex = i * 4;
    
    if (dataIndex + 1 >= imageData.length) break;
    
    // Try both endianness interpretations
    const highByte = imageData[dataIndex];
    const lowByte = imageData[dataIndex + 1];
    
    // Big-endian interpretation (most common for RGB565)
    let rgb565 = (highByte << 8) | lowByte;
    
    // If the result looks wrong (all zeros or very low values), try little-endian
    if (rgb565 === 0 || rgb565 < 100) {
      rgb565 = (lowByte << 8) | highByte;
    }
    
    // Convert RGB565 to RGB888
    const r = ((rgb565 >> 11) & 0x1F) << 3;
    const g = ((rgb565 >> 5) & 0x3F) << 2;
    const b = (rgb565 & 0x1F) << 3;
    
    pixels[pixelIndex] = r;     // Red
    pixels[pixelIndex + 1] = g; // Green
    pixels[pixelIndex + 2] = b; // Blue
    pixels[pixelIndex + 3] = 255; // Alpha
  }
}

function renderRGB888(pixels: Uint8ClampedArray, width: number, height: number) {
  if (!imageData) return;
  
  const bytesPerPixel = 3;
  const maxPixels = Math.min(imageData.length / bytesPerPixel, width * height);
  
  console.log('RGB888 rendering:', {
    dataLength: imageData.length,
    width,
    height,
    maxPixels,
    firstPixel: [imageData[0], imageData[1], imageData[2]]
  });
  
  for (let i = 0, j = 0; i < maxPixels; i++, j += bytesPerPixel) {
    const pixelIndex = i * 4;
    
    if (j + 2 >= imageData.length) break;
    
    const r = imageData[j] || 0;
    const g = imageData[j + 1] || 0;
    const b = imageData[j + 2] || 0;
    
    pixels[pixelIndex] = r;     // Red
    pixels[pixelIndex + 1] = g; // Green
    pixels[pixelIndex + 2] = b; // Blue
    pixels[pixelIndex + 3] = 255; // Alpha
  }
}



function renderGrayscale(pixels: Uint8ClampedArray, width: number, height: number) {
  if (!imageData) return;
  
  const maxPixels = Math.min(imageData.length, width * height);
  
  for (let i = 0; i < maxPixels; i++) {
    const pixelIndex = i * 4;
    
    if (i >= imageData.length) break;
    
    const gray = imageData[i];
    pixels[pixelIndex] = gray;     // Red
    pixels[pixelIndex + 1] = gray; // Green
    pixels[pixelIndex + 2] = gray; // Blue
    pixels[pixelIndex + 3] = 255;  // Alpha
  }
}

function renderYUV420(pixels: Uint8ClampedArray, width: number, height: number) {
  if (!imageData) return;
  
  // YUV420 format: Y plane (full size) + U plane (1/4 size) + V plane (1/4 size)
  const ySize = width * height;
  const uvSize = (width / 2) * (height / 2);
  
  if (imageData.length < ySize + uvSize * 2) {
    error.value = 'Insufficient data for YUV420 format';
    return;
  }
  
  const yData = imageData.slice(0, ySize);
  const uData = imageData.slice(ySize, ySize + uvSize);
  const vData = imageData.slice(ySize + uvSize, ySize + uvSize * 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4;
      const yIndex = y * width + x;
      const uvIndex = Math.floor(y / 2) * Math.floor(width / 2) + Math.floor(x / 2);
      
      const Y = yData[yIndex] || 0;
      const U = uData[uvIndex] || 128;
      const V = vData[uvIndex] || 128;
      
      // Convert YUV to RGB
      const r = Math.max(0, Math.min(255, Y + 1.402 * (V - 128)));
      const g = Math.max(0, Math.min(255, Y - 0.344136 * (U - 128) - 0.714136 * (V - 128)));
      const b = Math.max(0, Math.min(255, Y + 1.772 * (U - 128)));
      
      pixels[pixelIndex] = r;     // Red
      pixels[pixelIndex + 1] = g; // Green
      pixels[pixelIndex + 2] = b; // Blue
      pixels[pixelIndex + 3] = 255; // Alpha
    }
  }
  
  error.value = '';
}

function renderYUV422(pixels: Uint8ClampedArray, width: number, height: number) {
  if (!imageData) return;
  
  // YUV422 format: Y plane (full size) + U plane (1/2 size) + V plane (1/2 size)
  const ySize = width * height;
  const uvSize = width * height / 2;
  
  if (imageData.length < ySize + uvSize * 2) {
    error.value = 'Insufficient data for YUV422 format';
    return;
  }
  
  const yData = imageData.slice(0, ySize);
  const uData = imageData.slice(ySize, ySize + uvSize);
  const vData = imageData.slice(ySize + uvSize, ySize + uvSize * 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4;
      const yIndex = y * width + x;
      const uvIndex = y * width + Math.floor(x / 2);
      
      const Y = yData[yIndex] || 0;
      const U = uData[uvIndex] || 128;
      const V = vData[uvIndex] || 128;
      
      // Convert YUV to RGB
      const r = Math.max(0, Math.min(255, Y + 1.402 * (V - 128)));
      const g = Math.max(0, Math.min(255, Y - 0.344136 * (U - 128) - 0.714136 * (V - 128)));
      const b = Math.max(0, Math.min(255, Y + 1.772 * (U - 128)));
      
      pixels[pixelIndex] = r;     // Red
      pixels[pixelIndex + 1] = g; // Green
      pixels[pixelIndex + 2] = b; // Blue
      pixels[pixelIndex + 3] = 255; // Alpha
    }
  }
  
  error.value = '';
}

function renderYUV444(pixels: Uint8ClampedArray, width: number, height: number) {
  if (!imageData) return;
  
  // YUV444 format: Y, U, V planes all full size
  const planeSize = width * height;
  
  if (imageData.length < planeSize * 3) {
    error.value = 'Insufficient data for YUV444 format';
    return;
  }
  
  const yData = imageData.slice(0, planeSize);
  const uData = imageData.slice(planeSize, planeSize * 2);
  const vData = imageData.slice(planeSize * 2, planeSize * 3);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4;
      const planeIndex = y * width + x;
      
      const Y = yData[planeIndex] || 0;
      const U = uData[planeIndex] || 128;
      const V = vData[planeIndex] || 128;
      
      // Convert YUV to RGB
      const r = Math.max(0, Math.min(255, Y + 1.402 * (V - 128)));
      const g = Math.max(0, Math.min(255, Y - 0.344136 * (U - 128) - 0.714136 * (V - 128)));
      const b = Math.max(0, Math.min(255, Y + 1.772 * (U - 128)));
      
      pixels[pixelIndex] = r;     // Red
      pixels[pixelIndex + 1] = g; // Green
      pixels[pixelIndex + 2] = b; // Blue
      pixels[pixelIndex + 3] = 255; // Alpha
    }
  }
  
  error.value = '';
}
</script>

<style lang="scss">
@import "../commons/espCommons.scss";

.image-viewer {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  background-color: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
}

.variable-input {
  max-width: 600px;
  margin: 0 auto 32px auto;
  padding: 24px;
  background-color: var(--vscode-notifications-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.variable-input h3 {
  margin: 0 0 24px 0;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--vscode-foreground);
  font-size: 14px;
}

.input-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-size: 14px;
  font-family: var(--vscode-font-family);
  transition: border-color 0.2s ease;
  
  &:hover {
    border-color: var(--vscode-inputOption-activeBorder);
  }
  
  &:focus {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: 2px;
    border-color: var(--vscode-inputOption-activeBorder);
  }
  
  &::placeholder {
    color: var(--vscode-input-placeholderForeground);
  }
}

.input-group small {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  line-height: 1.4;
}

.variable-input button {
  width: 100%;
  padding: 12px 16px;
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: var(--vscode-font-family);
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background-color: var(--vscode-button-hoverBackground);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  &:active:not(:disabled) {
    background-color: var(--vscode-button-activeBackground);
    transform: translateY(0);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
  
  &:focus {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: var(--vscode-notifications-background);
  }
}

.image-display {
  width: 100%;
  margin-bottom: 32px;
}

.image-info {
  margin-bottom: 24px;
  padding: 16px;
  background-color: var(--vscode-notifications-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
}

.image-info h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.image-info p {
  margin: 0;
  font-size: 14px;
  color: var(--vscode-descriptionForeground);
  line-height: 1.4;
}

.image-container {
  display: inline-block;
  max-width: 100%;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

canvas {
  max-width: 100%;
  height: auto;
  display: block;
}

.controls {
  margin-top: 24px;
  padding: 20px;
  background-color: var(--vscode-notifications-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
}

.control-group {
  margin: 16px 0;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  
  &:first-child {
    margin-top: 0;
  }
  
  &:last-child {
    margin-bottom: 0;
  }
}

.control-group label {
  font-weight: 500;
  color: var(--vscode-foreground);
  font-size: 14px;
  min-width: 60px;
}

.control-group select,
.control-group input {
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 14px;
  font-family: var(--vscode-font-family);
  transition: border-color 0.2s ease;
  
  &:hover {
    border-color: var(--vscode-inputOption-activeBorder);
  }
  
  &:focus {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: 2px;
    border-color: var(--vscode-inputOption-activeBorder);
  }
  
  &::placeholder {
    color: var(--vscode-input-placeholderForeground);
  }
}

.control-group button {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: 1px solid var(--vscode-button-border);
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-family: var(--vscode-font-family);
  transition: all 0.2s ease;
  
  &:hover {
    background-color: var(--vscode-button-hoverBackground);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  &:active {
    background-color: var(--vscode-button-activeBackground);
    transform: translateY(0);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
  
  &:focus {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }
}

.preset-sizes {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-sizes button {
  font-size: 12px;
  padding: 4px 8px;
  background-color: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  border: 1px solid var(--vscode-badge-border);
  
  &:hover {
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-border);
  }
}

.error {
  color: var(--vscode-errorForeground);
  padding: 12px 16px;
  background-color: var(--vscode-inputValidation-errorBackground);
  border: 1px solid var(--vscode-inputValidation-errorBorder);
  border-radius: 4px;
  margin-top: 16px;
  font-size: 14px;
  line-height: 1.4;
}

.debug-info {
  margin-top: 24px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  overflow: hidden;
  background-color: var(--vscode-notifications-background);
}

.debug-info summary {
  padding: 16px;
  background-color: var(--vscode-editor-inactiveSelectionBackground);
  cursor: pointer;
  font-weight: 500;
  color: var(--vscode-foreground);
  font-size: 14px;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: var(--vscode-list-hoverBackground);
  }
  
  &:focus {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: -2px;
  }
}

.debug-content {
  padding: 20px;
  background-color: var(--vscode-editor-background);
}

.debug-content pre {
  background-color: var(--vscode-input-background);
  padding: 12px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  overflow-x: auto;
  margin: 12px 0;
  border: 1px solid var(--vscode-input-border);
  color: var(--vscode-input-foreground);
}

.debug-content ul {
  margin: 12px 0;
  padding-left: 20px;
  color: var(--vscode-foreground);
}

.debug-content li {
  margin: 6px 0;
  line-height: 1.4;
}

/* Responsive design */
@media (max-width: 768px) {
  .image-viewer {
    padding: 16px;
  }
  
  .variable-input {
    padding: 20px;
    margin-bottom: 24px;
  }
  
  .control-group {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .control-group label {
    min-width: auto;
  }
  
  .preset-sizes {
    justify-content: center;
  }
}
</style> 