<template>
  <div class="image-viewer">
    <!-- Variable Input Section -->
    <div class="variable-input" v-if="!imageData">
      <h3>Load Image from Debug Variable</h3>

      <!-- Manual Variable Input -->
      <div class="manual-section">
        <h4>Manual Variable Input</h4>
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
          <small
            >Enter a number (bytes) or variable name containing the size</small
          >
        </div>
        <button
          @click="loadImageFromVariable"
          :disabled="!variableName || !imageSize"
        >
          Load Image
        </button>
        <div v-if="loadError" class="error">
          {{ loadError }}
        </div>
      </div>
    </div>

    <!-- Image Display Section -->
    <div v-if="imageData" class="image-display">
      <div class="image-info">
        <h3>{{ imageName }}</h3>
        <p>{{ imageInfo }}</p>
      </div>

      <div class="image-container">
        <canvas
          ref="canvas"
          :width="canvasWidth"
          :height="canvasHeight"
        ></canvas>
      </div>

      <!-- Image Properties Display -->
      <div v-if="imageProperties" class="image-properties">
        <h5>{{ getPropertiesTitle() }}</h5>
        <ul>
          <li>
            <strong>Dimensions:</strong> {{ imageProperties.width }} ×
            {{ imageProperties.height }}
          </li>
          <li>
            <strong>Format:</strong>
            {{ selectedFormat.toUpperCase() }} ({{ imageProperties.format }})
          </li>
          <li>
            <strong>Data Size:</strong> {{ imageProperties.dataSize }} bytes
          </li>
          <li>
            <strong>Data Address:</strong> {{ imageProperties.dataAddress }}
          </li>
          <li v-if="imageProperties.configName">
            <strong>Configuration:</strong> {{ imageProperties.configName }}
          </li>
        </ul>
      </div>
    </div>

    <div class="controls">
      <div class="control-group">
        <label for="formatSelect">Format:</label>
        <select
          id="formatSelect"
          v-model="selectedFormat"
          @change="updateImage"
          :key="selectedFormat"
        >
          <option value="rgb565">RGB565</option>
          <option value="rgb888">RGB888</option>
          <option value="rgba8888">RGBA8888</option>
          <option value="argb8888">ARGB8888</option>
          <option value="xrgb8888">XRGB8888</option>
          <option value="bgr888">BGR888</option>
          <option value="bgra8888">BGRA8888</option>
          <option value="abgr8888">ABGR8888</option>
          <option value="xbgr8888">XBGR8888</option>
          <option value="rgb332">RGB332</option>
          <option value="rgb444">RGB444</option>
          <option value="rgb555">RGB555</option>
          <option value="rgb666">RGB666</option>
          <option value="rgb777">RGB777</option>
          <option value="rgb101010">RGB101010</option>
          <option value="rgb121212">RGB121212</option>
          <option value="rgb161616">RGB161616</option>
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
import { ref, onMounted, nextTick, watch } from "vue";

interface ImageData {
  data: string;
  name: string;
}

interface ImageProperties {
  width: number;
  height: number;
  format: number;
  dataSize: number;
  dataAddress: string;
  configName?: string;
}

const canvas = ref<HTMLCanvasElement>();
const imageName = ref<string>("");
const imageInfo = ref<string>("Loading...");
const selectedFormat = ref<string>("rgb888");
const customWidth = ref<number | null>(null);
const customHeight = ref<number | null>(null);
const error = ref<string>("");
const canvasWidth = ref<number>(400);
const canvasHeight = ref<number>(300);

// New variables for variable input
const variableName = ref<string>("");
const imageSize = ref<string>("");
const loadError = ref<string>("");

// Image properties
const imageProperties = ref<ImageProperties | null>(null);

const imageData = ref<Uint8Array | null>(null);

// Debug information
const dataPreview = ref<string>("");
const dataStats = ref({
  min: 0,
  max: 0,
  avg: 0,
});

const vscode = (window as any).acquireVsCodeApi();

// Watch for format changes and automatically update the image
watch(selectedFormat, (newFormat, oldFormat) => {
  if (newFormat !== oldFormat && imageData.value) {
    updateImage();
  }
});

// Watch for imageData changes and automatically update the image
watch(imageData, (newImageData, oldImageData) => {
  if (newImageData && newImageData !== oldImageData) {
    // Use nextTick to ensure the canvas is rendered
    nextTick(() => {
      if (canvas.value) {
        updateImage();
      }
    });
  }
});

onMounted(() => {
  // Listen for messages from the extension
  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.command) {
      case "updateImage":
        handleImageUpdate(message);
        break;
      case "updateImageWithProperties":
        handleImageWithPropertiesUpdate(message);
        break;
      case "showError":
        loadError.value = message.error;
        break;
    }
  });

  // Request initial image data if we have an image
  if (imageData) {
    vscode.postMessage({ command: "requestImageData" });
  }
});

function loadImageFromVariable() {
  if (!variableName.value || !imageSize.value) {
    loadError.value = "Please enter both variable name and size";
    return;
  }

  loadError.value = "";

  // Try to parse size as number first
  const sizeValue = isNaN(Number(imageSize.value))
    ? imageSize.value
    : Number(imageSize.value);

  vscode.postMessage({
    command: "loadImageFromVariable",
    variableName: variableName.value,
    size: sizeValue,
  });
}

async function handleImageWithPropertiesUpdate(message: any) {
  // Handle image data with dimensions and format (LVGL, OpenCV, libpng, etc.)
  try {
    // Use configName to determine the format type, fallback to name-based detection
    const configName = message.configName;

    imageName.value = message.name;

    // Set dimensions from LVGL properties
    if (message.width && message.height) {
      customWidth.value = message.width;
      customHeight.value = message.height;
    }

    // Convert base64 to Uint8Array
    let binaryString: string;
    try {
      binaryString = atob(message.data);
      imageData.value = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        imageData.value![i] = binaryString.charCodeAt(i);
      }
    } catch (err) {
      console.error("Base64 decode error:", err);
      imageData.value = new Uint8Array(0);
      error.value = "Failed to decode base64 data";
      return;
    }

    // Set format from backend validated format AFTER image data is loaded
    if (message.validatedFormat) {
      selectedFormat.value = message.validatedFormat;
      // Use nextTick to ensure the dropdown updates before rendering
      await nextTick();
      
      // Force immediate image update with new format (if canvas is ready)
      if (canvas.value) {
        updateImage();
      } else {
        await nextTick();
        if (canvas.value) {
          updateImage();
        }
      }
    }

    // Create properties object for display
    imageProperties.value = {
      width: message.width || 0,
      height: message.height || 0,
      format: message.format || 0,
      dataSize: message.dataSize || imageData.value?.length || 0,
      dataAddress: message.dataAddress || "0x0",
      configName: configName,
    };

    // Calculate debug information
    if (imageData.value && imageData.value!.length > 0) {
      // Data preview (first 32 bytes as hex)
      const previewBytes = imageData.value!.slice(0, 32);
      dataPreview.value = Array.from(previewBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");

      // Data statistics
      let min = 255;
      let max = 0;
      let sum = 0;

      const sampleSize = Math.min(imageData.value!.length, 10000);

      for (let i = 0; i < sampleSize; i++) {
        const val = imageData.value![i];
        if (val < min) min = val;
        if (val > max) max = val;
        sum += val;
      }

      const avg = sum / sampleSize;
      dataStats.value = { min, max, avg };
    }

    // Final attempt to update the image after all data is processed
    await nextTick();
    if (canvas.value && imageData.value) {
      updateImage();
    }
  } catch (err) {
    error.value = `Failed to load image with properties: ${err}`;
  }
}


function getPropertiesTitle(): string {
  if (!imageProperties.value) return "Image Properties:";

  const configName = imageProperties.value.configName;
  if (configName === "OpenCV Mat") {
    return "OpenCV Mat Properties:";
  } else if (configName === "LVGL Image Descriptor") {
    return "LVGL Image Properties:";
  } else if (configName) {
    return `${configName} Properties:`;
  } else {
    return "Image Properties:";
  }
}


function handleImageUpdate(data: ImageData) {
  try {
    imageName.value = data.name;
    // Convert base64 to Uint8Array using a more direct approach
    let binaryString: string;
    try {
      binaryString = atob(data.data);
      imageData.value = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        imageData.value![i] = binaryString.charCodeAt(i);
      }
    } catch (err) {
      console.error("Base64 decode error:", err);
      // Fallback: try to use the data as-is
      imageData.value = new Uint8Array(0);
      error.value = "Failed to decode base64 data";
      return;
    }

    // Calculate debug information
    if (imageData && imageData.value!.length > 0) {
      // Data preview (first 32 bytes as hex)
      const previewBytes = imageData.value!.slice(0, 32);
      dataPreview.value = Array.from(previewBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");

      // Data statistics - use efficient iteration instead of spread operator
      let min = 255;
      let max = 0;
      let sum = 0;

      // Only process first 10000 bytes for performance, or all if smaller
      const sampleSize = Math.min(imageData.value!.length, 10000);

      for (let i = 0; i < sampleSize; i++) {
        const val = imageData.value![i];
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
  if (!imageData.value || !canvas.value) {
    return;
  }

  try {
    error.value = "";
    const ctx = canvas.value.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    const width = customWidth.value || estimateWidth();
    const height = customHeight.value || estimateHeight();

    canvasWidth.value = width;
    canvasHeight.value = height;

    const imageDataObj = ctx.createImageData(width, height);
    const pixels = imageDataObj.data;

    switch (selectedFormat.value) {
      case "rgb565":
        renderRGB565(pixels, width, height);
        break;
      case "rgb888":
        renderRGB888(pixels, width, height);
        break;
      case "rgba8888":
        renderRGBA8888(pixels, width, height);
        break;
      case "argb8888":
        renderARGB8888(pixels, width, height);
        break;
      case "xrgb8888":
        renderXRGB8888(pixels, width, height);
        break;
      case "bgr888":
        renderBGR888(pixels, width, height);
        break;
      case "bgra8888":
        renderBGRA8888(pixels, width, height);
        break;
      case "abgr8888":
        renderABGR8888(pixels, width, height);
        break;
      case "xbgr8888":
        renderXBGR8888(pixels, width, height);
        break;
      case "rgb332":
        renderRGB332(pixels, width, height);
        break;
      case "rgb444":
        renderRGB444(pixels, width, height);
        break;
      case "rgb555":
        renderRGB555(pixels, width, height);
        break;
      case "rgb666":
        renderRGB666(pixels, width, height);
        break;
      case "rgb777":
        renderRGB777(pixels, width, height);
        break;
      case "grayscale":
        renderGrayscale(pixels, width, height);
        break;
      case "yuv420":
        renderYUV420(pixels, width, height);
        break;
      case "yuv422":
        renderYUV422(pixels, width, height);
        break;
      case "yuv444":
        renderYUV444(pixels, width, height);
        break;
      default:
        renderRGB888(pixels, width, height);
        break;
    }

    ctx.putImageData(imageDataObj, 0, 0);

    // Add debugging information
    const bytesPerPixel = getBytesPerPixel(selectedFormat.value);
    const expectedPixels = Math.floor(imageData.value!.length / bytesPerPixel);
    const actualPixels = width * height;

    imageInfo.value = `${selectedFormat.value.toUpperCase()} - ${width}x${height} - ${
      imageData.value!.length
    } bytes - ${expectedPixels} pixels (${actualPixels} displayed)`;
  } catch (err) {
    error.value = `Failed to render image: ${err}`;
  }
}

function estimateWidth(): number {
  if (!imageData.value) return 400;

  // For different formats, calculate pixels differently
  const totalPixels = Math.floor(
    imageData.value!.length / getBytesPerPixel(selectedFormat.value)
  );

  // For your data: 191,724 bytes ÷ 3 = 63,908 pixels
  // Let's try to find reasonable dimensions
  // Common image sizes that might work:
  const possibleWidths = [256, 320, 384, 512, 640, 800, 1024];

  for (const testWidth of possibleWidths) {
    const testHeight = Math.floor(totalPixels / testWidth);
    if (testHeight > 0 && testHeight <= 1000) {
      return testWidth;
    }
  }

  // If no reasonable dimensions found, use a simple square approximation
  const squareSize = Math.floor(Math.sqrt(totalPixels));
  return squareSize || 256;
}

function estimateHeight(): number {
  if (!imageData.value || !customWidth.value) return 300;

  // For different formats, calculate pixels differently
  const totalPixels = Math.floor(
    imageData.value!.length / getBytesPerPixel(selectedFormat.value)
  );

  const height = Math.floor(totalPixels / customWidth.value);
  return height || 300;
}

function getBytesPerPixel(format: string): number {
  switch (format) {
    case "rgb565":
    case "rgb555":
      return 2;
    case "rgb888":
    case "bgr888":
    case "yuv444":
      return 3;
    case "rgba8888":
    case "argb8888":
    case "xrgb8888":
    case "bgra8888":
    case "abgr8888":
    case "xbgr8888":
      return 4;
    case "rgb332":
      return 1;
    case "rgb444":
    case "rgb666":
    case "rgb777":
      return 1.5;
    case "yuv420":
      return 1.5;
    case "yuv422":
      return 2;
    case "grayscale":
    default:
      return 1;
  }
}

function renderRGB565(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (!imageData) return;

  const bytesPerPixel = 2;
  const maxPixels = Math.min(
    imageData.value!.length / bytesPerPixel,
    width * height
  );

  for (let i = 0; i < maxPixels; i++) {
    const dataIndex = i * bytesPerPixel;
    const pixelIndex = i * 4;

    if (dataIndex + 1 >= imageData.value!.length) break;

    // Try both endianness interpretations
    const highByte = imageData.value![dataIndex];
    const lowByte = imageData.value![dataIndex + 1];

    // Big-endian interpretation (most common for RGB565)
    let rgb565 = (highByte << 8) | lowByte;

    // If the result looks wrong (all zeros or very low values), try little-endian
    if (rgb565 === 0 || rgb565 < 100) {
      rgb565 = (lowByte << 8) | highByte;
    }

    // Convert RGB565 to RGB888
    const r = ((rgb565 >> 11) & 0x1f) << 3;
    const g = ((rgb565 >> 5) & 0x3f) << 2;
    const b = (rgb565 & 0x1f) << 3;

    pixels[pixelIndex] = r; // Red
    pixels[pixelIndex + 1] = g; // Green
    pixels[pixelIndex + 2] = b; // Blue
    pixels[pixelIndex + 3] = 255; // Alpha
  }
}

function renderRGB888(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (!imageData) return;

  const bytesPerPixel = 3;
  const maxPixels = Math.min(
    imageData.value!.length / bytesPerPixel,
    width * height
  );

  for (let i = 0, j = 0; i < maxPixels; i++, j += bytesPerPixel) {
    const pixelIndex = i * 4;

    if (j + 2 >= imageData.value!.length) break;

    const r = imageData.value![j] || 0;
    const g = imageData.value![j + 1] || 0;
    const b = imageData.value![j + 2] || 0;

    pixels[pixelIndex] = r; // Red
    pixels[pixelIndex + 1] = g; // Green
    pixels[pixelIndex + 2] = b; // Blue
    pixels[pixelIndex + 3] = 255; // Alpha
  }
}

function renderGrayscale(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (!imageData) return;

  const maxPixels = Math.min(imageData.value!.length, width * height);

  for (let i = 0; i < maxPixels; i++) {
    const pixelIndex = i * 4;

    if (i >= imageData.value!.length) break;

    const gray = imageData.value![i];
    pixels[pixelIndex] = gray; // Red
    pixels[pixelIndex + 1] = gray; // Green
    pixels[pixelIndex + 2] = gray; // Blue
    pixels[pixelIndex + 3] = 255; // Alpha
  }
}

function renderYUV420(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (!imageData) return;

  // YUV420 format: Y plane (full size) + U plane (1/4 size) + V plane (1/4 size)
  const ySize = width * height;
  const uvSize = (width / 2) * (height / 2);

  if (imageData.value!.length < ySize + uvSize * 2) {
    error.value = "Insufficient data for YUV420 format";
    return;
  }

  const yData = imageData.value!.slice(0, ySize);
  const uData = imageData.value!.slice(ySize, ySize + uvSize);
  const vData = imageData.value!.slice(ySize + uvSize, ySize + uvSize * 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4;
      const yIndex = y * width + x;
      const uvIndex =
        Math.floor(y / 2) * Math.floor(width / 2) + Math.floor(x / 2);

      const Y = yData[yIndex] || 0;
      const U = uData[uvIndex] || 128;
      const V = vData[uvIndex] || 128;

      // Convert YUV to RGB
      const r = Math.max(0, Math.min(255, Y + 1.402 * (V - 128)));
      const g = Math.max(
        0,
        Math.min(255, Y - 0.344136 * (U - 128) - 0.714136 * (V - 128))
      );
      const b = Math.max(0, Math.min(255, Y + 1.772 * (U - 128)));

      pixels[pixelIndex] = r; // Red
      pixels[pixelIndex + 1] = g; // Green
      pixels[pixelIndex + 2] = b; // Blue
      pixels[pixelIndex + 3] = 255; // Alpha
    }
  }

  error.value = "";
}

function renderYUV422(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (!imageData) return;

  // YUV422 format: Y plane (full size) + U plane (1/2 size) + V plane (1/2 size)
  const ySize = width * height;
  const uvSize = (width * height) / 2;

  if (imageData.value!.length < ySize + uvSize * 2) {
    error.value = "Insufficient data for YUV422 format";
    return;
  }

  const yData = imageData.value!.slice(0, ySize);
  const uData = imageData.value!.slice(ySize, ySize + uvSize);
  const vData = imageData.value!.slice(ySize + uvSize, ySize + uvSize * 2);

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
      const g = Math.max(
        0,
        Math.min(255, Y - 0.344136 * (U - 128) - 0.714136 * (V - 128))
      );
      const b = Math.max(0, Math.min(255, Y + 1.772 * (U - 128)));

      pixels[pixelIndex] = r; // Red
      pixels[pixelIndex + 1] = g; // Green
      pixels[pixelIndex + 2] = b; // Blue
      pixels[pixelIndex + 3] = 255; // Alpha
    }
  }

  error.value = "";
}

function renderYUV444(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (!imageData) return;

  // YUV444 format: Y, U, V planes all full size
  const planeSize = width * height;

  if (imageData.value!.length < planeSize * 3) {
    error.value = "Insufficient data for YUV444 format";
    return;
  }

  const yData = imageData.value!.slice(0, planeSize);
  const uData = imageData.value!.slice(planeSize, planeSize * 2);
  const vData = imageData.value!.slice(planeSize * 2, planeSize * 3);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4;
      const planeIndex = y * width + x;

      const Y = yData[planeIndex] || 0;
      const U = uData[planeIndex] || 128;
      const V = vData[planeIndex] || 128;

      // Convert YUV to RGB
      const r = Math.max(0, Math.min(255, Y + 1.402 * (V - 128)));
      const g = Math.max(
        0,
        Math.min(255, Y - 0.344136 * (U - 128) - 0.714136 * (V - 128))
      );
      const b = Math.max(0, Math.min(255, Y + 1.772 * (U - 128)));

      pixels[pixelIndex] = r; // Red
      pixels[pixelIndex + 1] = g; // Green
      pixels[pixelIndex + 2] = b; // Blue
      pixels[pixelIndex + 3] = 255; // Alpha
    }
  }

  error.value = "";
}

// New LVGL format render functions
function renderRGBA8888(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (!imageData) return;

  const bytesPerPixel = 4;
  const maxPixels = Math.min(
    imageData.value!.length / bytesPerPixel,
    width * height
  );

  for (let i = 0, j = 0; i < maxPixels; i++, j += bytesPerPixel) {
    const pixelIndex = i * 4;

    if (j + 3 >= imageData.value!.length) break;

    pixels[pixelIndex] = imageData.value![j] || 0; // Red
    pixels[pixelIndex + 1] = imageData.value![j + 1] || 0; // Green
    pixels[pixelIndex + 2] = imageData.value![j + 2] || 0; // Blue
    pixels[pixelIndex + 3] = imageData.value![j + 3] || 255; // Alpha
  }
}

function renderARGB8888(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (!imageData) return;

  const bytesPerPixel = 4;
  const maxPixels = Math.min(
    imageData.value!.length / bytesPerPixel,
    width * height
  );

  for (let i = 0, j = 0; i < maxPixels; i++, j += bytesPerPixel) {
    const pixelIndex = i * 4;

    if (j + 3 >= imageData.value!.length) break;

    pixels[pixelIndex] = imageData.value![j + 1] || 0; // Red
    pixels[pixelIndex + 1] = imageData.value![j + 2] || 0; // Green
    pixels[pixelIndex + 2] = imageData.value![j + 3] || 0; // Blue
    pixels[pixelIndex + 3] = imageData.value![j] || 255; // Alpha
  }
}

function renderXRGB8888(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (!imageData) return;

  const bytesPerPixel = 4;
  const maxPixels = Math.min(
    imageData.value!.length / bytesPerPixel,
    width * height
  );

  for (let i = 0, j = 0; i < maxPixels; i++, j += bytesPerPixel) {
    const pixelIndex = i * 4;

    if (j + 3 >= imageData.value!.length) break;

    pixels[pixelIndex] = imageData.value![j + 1] || 0; // Red
    pixels[pixelIndex + 1] = imageData.value![j + 2] || 0; // Green
    pixels[pixelIndex + 2] = imageData.value![j + 3] || 0; // Blue
    pixels[pixelIndex + 3] = 255; // Alpha (ignored in XRGB)
  }
}

function renderBGR888(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (!imageData) return;

  const bytesPerPixel = 3;
  const maxPixels = Math.min(
    imageData.value!.length / bytesPerPixel,
    width * height
  );

  for (let i = 0, j = 0; i < maxPixels; i++, j += bytesPerPixel) {
    const pixelIndex = i * 4;

    if (j + 2 >= imageData.value!.length) break;

    pixels[pixelIndex] = imageData.value![j + 2] || 0; // Red
    pixels[pixelIndex + 1] = imageData.value![j + 1] || 0; // Green
    pixels[pixelIndex + 2] = imageData.value![j] || 0; // Blue
    pixels[pixelIndex + 3] = 255; // Alpha
  }
}

function renderBGRA8888(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (!imageData) return;

  const bytesPerPixel = 4;
  const maxPixels = Math.min(
    imageData.value!.length / bytesPerPixel,
    width * height
  );

  for (let i = 0, j = 0; i < maxPixels; i++, j += bytesPerPixel) {
    const pixelIndex = i * 4;

    if (j + 3 >= imageData.value!.length) break;

    pixels[pixelIndex] = imageData.value![j + 2] || 0; // Red
    pixels[pixelIndex + 1] = imageData.value![j + 1] || 0; // Green
    pixels[pixelIndex + 2] = imageData.value![j] || 0; // Blue
    pixels[pixelIndex + 3] = imageData.value![j + 3] || 255; // Alpha
  }
}

function renderABGR8888(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (!imageData) return;

  const bytesPerPixel = 4;
  const maxPixels = Math.min(
    imageData.value!.length / bytesPerPixel,
    width * height
  );

  for (let i = 0, j = 0; i < maxPixels; i++, j += bytesPerPixel) {
    const pixelIndex = i * 4;

    if (j + 3 >= imageData.value!.length) break;

    pixels[pixelIndex] = imageData.value![j + 3] || 0; // Red
    pixels[pixelIndex + 1] = imageData.value![j + 2] || 0; // Green
    pixels[pixelIndex + 2] = imageData.value![j + 1] || 0; // Blue
    pixels[pixelIndex + 3] = imageData.value![j] || 255; // Alpha
  }
}

function renderXBGR8888(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (!imageData) return;

  const bytesPerPixel = 4;
  const maxPixels = Math.min(
    imageData.value!.length / bytesPerPixel,
    width * height
  );

  for (let i = 0, j = 0; i < maxPixels; i++, j += bytesPerPixel) {
    const pixelIndex = i * 4;

    if (j + 3 >= imageData.value!.length) break;

    pixels[pixelIndex] = imageData.value![j + 3] || 0; // Red
    pixels[pixelIndex + 1] = imageData.value![j + 2] || 0; // Green
    pixels[pixelIndex + 2] = imageData.value![j + 1] || 0; // Blue
    pixels[pixelIndex + 3] = 255; // Alpha (ignored in XBGR)
  }
}

function renderRGB332(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (!imageData) return;

  const maxPixels = Math.min(imageData.value!.length, width * height);

  for (let i = 0; i < maxPixels; i++) {
    const pixelIndex = i * 4;

    if (i >= imageData.value!.length) break;

    const packed = imageData.value![i];
    const r = ((packed >> 5) & 0x7) << 5; // 3 bits -> 8 bits
    const g = ((packed >> 2) & 0x7) << 5; // 3 bits -> 8 bits
    const b = (packed & 0x3) << 6; // 2 bits -> 8 bits

    pixels[pixelIndex] = r; // Red
    pixels[pixelIndex + 1] = g; // Green
    pixels[pixelIndex + 2] = b; // Blue
    pixels[pixelIndex + 3] = 255; // Alpha
  }
}

function renderRGB444(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (!imageData) return;

  const maxPixels = Math.min(imageData.value!.length / 1.5, width * height);

  for (let i = 0; i < maxPixels; i++) {
    const pixelIndex = i * 4;
    const dataIndex = Math.floor(i * 1.5);

    if (dataIndex + 1 >= imageData.value!.length) break;

    const byte1 = imageData.value![dataIndex];
    const byte2 = imageData.value![dataIndex + 1];

    // RGB444 packed format: RRRRGGGG BBBBRRRR
    const r = ((byte1 >> 4) & 0xf) << 4;
    const g = (byte1 & 0xf) << 4;
    const b = ((byte2 >> 4) & 0xf) << 4;

    pixels[pixelIndex] = r; // Red
    pixels[pixelIndex + 1] = g; // Green
    pixels[pixelIndex + 2] = b; // Blue
    pixels[pixelIndex + 3] = 255; // Alpha
  }
}

function renderRGB555(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (!imageData) return;

  const bytesPerPixel = 2;
  const maxPixels = Math.min(
    imageData.value!.length / bytesPerPixel,
    width * height
  );

  for (let i = 0; i < maxPixels; i++) {
    const pixelIndex = i * 4;
    const dataIndex = i * bytesPerPixel;

    if (dataIndex + 1 >= imageData.value!.length) break;

    const packed =
      (imageData.value![dataIndex + 1] << 8) | imageData.value![dataIndex];
    const r = ((packed >> 10) & 0x1f) << 3;
    const g = ((packed >> 5) & 0x1f) << 3;
    const b = (packed & 0x1f) << 3;

    pixels[pixelIndex] = r; // Red
    pixels[pixelIndex + 1] = g; // Green
    pixels[pixelIndex + 2] = b; // Blue
    pixels[pixelIndex + 3] = 255; // Alpha
  }
}

function renderRGB666(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (!imageData) return;

  const maxPixels = Math.min(imageData.value!.length / 1.5, width * height);

  for (let i = 0; i < maxPixels; i++) {
    const pixelIndex = i * 4;
    const dataIndex = Math.floor(i * 1.5);

    if (dataIndex + 2 >= imageData.value!.length) break;

    const byte1 = imageData.value![dataIndex];
    const byte2 = imageData.value![dataIndex + 1];
    const byte3 = imageData.value![dataIndex + 2];

    // RGB666 packed format: RRRRRRGG GGGGBBBB BBBB0000
    const r = ((byte1 << 2) | ((byte2 >> 4) & 0x3)) & 0x3f;
    const g = ((byte2 << 4) | ((byte3 >> 4) & 0xf)) & 0x3f;
    const b = byte3 & 0x3f;

    pixels[pixelIndex] = r << 2; // Red (6 bits -> 8 bits)
    pixels[pixelIndex + 1] = g << 2; // Green (6 bits -> 8 bits)
    pixels[pixelIndex + 2] = b << 2; // Blue (6 bits -> 8 bits)
    pixels[pixelIndex + 3] = 255; // Alpha
  }
}

function renderRGB777(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (!imageData) return;

  const maxPixels = Math.min(imageData.value!.length / 1.5, width * height);

  for (let i = 0; i < maxPixels; i++) {
    const pixelIndex = i * 4;
    const dataIndex = Math.floor(i * 1.5);

    if (dataIndex + 2 >= imageData.value!.length) break;

    const byte1 = imageData.value![dataIndex];
    const byte2 = imageData.value![dataIndex + 1];
    const byte3 = imageData.value![dataIndex + 2];

    // RGB777 packed format: RRRRRRRG GGGGGGBB BBBBBBB0
    const r = ((byte1 << 1) | ((byte2 >> 7) & 0x1)) & 0x7f;
    const g = ((byte2 << 1) | ((byte3 >> 7) & 0x1)) & 0x7f;
    const b = (byte3 << 1) & 0x7f;

    pixels[pixelIndex] = r << 1; // Red (7 bits -> 8 bits)
    pixels[pixelIndex + 1] = g << 1; // Green (7 bits -> 8 bits)
    pixels[pixelIndex + 2] = b << 1; // Blue (7 bits -> 8 bits)
    pixels[pixelIndex + 3] = 255; // Alpha
  }
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

.manual-section {
  margin-bottom: 24px;
}

.manual-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-foreground);
  border-bottom: 1px solid var(--vscode-panel-border);
  padding-bottom: 8px;
}

.image-properties {
  margin-top: 16px;
  padding: 16px;
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;

  h5 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
  }

  ul {
    margin: 0;
    padding-left: 20px;
    color: var(--vscode-foreground);
  }

  li {
    margin: 6px 0;
    line-height: 1.4;
    font-size: 13px;
  }
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
  font-family: "Courier New", monospace;
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
