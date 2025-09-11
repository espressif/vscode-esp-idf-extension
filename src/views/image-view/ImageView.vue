<template>
  <div class="image-viewer">
    <!-- Variable Input Section -->
    <div class="variable-input" v-if="!imageData">
      <h3>Load Image from Debug Variable</h3>
      
      <!-- LVGL Object Extraction -->
      <div class="lvgl-section">
        <h4>LVGL Image Object</h4>
        <div class="input-group">
          <label for="lvglObjectName">LVGL Object Name:</label>
          <input 
            type="text" 
            id="lvglObjectName" 
            v-model="lvglObjectName" 
            placeholder="e.g., my_image_obj, img1, etc."
          />
          <small>Name of your lv_obj_t image object variable</small>
        </div>
        <button @click="extractLVGLImageProperties" :disabled="!lvglObjectName">
          Extract LVGL Image Properties
        </button>
        <div v-if="lvglLoadError" class="error">
          {{ lvglLoadError }}
        </div>
      </div>

      <div class="divider">
        <span>OR</span>
      </div>

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
          <small>Enter a number (bytes) or variable name containing the size</small>
        </div>
        <button @click="loadImageFromVariable" :disabled="!variableName || !imageSize">
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
        <canvas ref="canvas" :width="canvasWidth" :height="canvasHeight"></canvas>
      </div>
      
      <!-- Image Properties Display -->
      <div v-if="lvglProperties" class="lvgl-properties">
        <h5>{{ lvglProperties.sourceType === 1 ? 'OpenCV Mat Properties:' : 'LVGL Image Properties:' }}</h5>
        <ul>
          <li><strong>Dimensions:</strong> {{ lvglProperties.width }} × {{ lvglProperties.height }}</li>
          <li><strong>Format:</strong> {{ getFormatName(lvglProperties.format) }} ({{ lvglProperties.format }})</li>
          <li><strong>Data Size:</strong> {{ lvglProperties.dataSize }} bytes</li>
          <li><strong>Data Address:</strong> {{ lvglProperties.dataAddress }}</li>
          <li><strong>Source Type:</strong> {{ lvglProperties.sourceType === 1 ? 'OpenCV Mat' : 'LVGL Image' }}</li>
        </ul>
      </div>
    </div>
    
    <div class="controls">
      <div class="control-group">
        <label for="formatSelect">Format:</label>
        <select id="formatSelect" v-model="selectedFormat" @change="updateImage" :key="selectedFormat">
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
import { ref, onMounted, nextTick, watch } from 'vue';

interface ImageData {
  data: string;
  name: string;
}

interface LVGLImageProperties {
  width: number;
  height: number;
  format: number;
  dataSize: number;
  dataAddress: string;
  sourceType: number;
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

// LVGL-specific variables
const lvglObjectName = ref<string>('');
const lvglProperties = ref<LVGLImageProperties | null>(null);
const lvglLoadError = ref<string>('');

const imageData = ref<Uint8Array | null>(null);

// Debug information
const dataPreview = ref<string>('');
const dataStats = ref({
  min: 0,
  max: 0,
  avg: 0
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
  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.command) {
      case 'updateImage':
        handleImageUpdate(message);
        break;
      case 'updateLVGLImage':
        handleLVGLImageUpdate(message);
        break;
      case 'showError':
        loadError.value = message.error;
        lvglLoadError.value = message.error;
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

function extractLVGLImageProperties() {
  if (!lvglObjectName.value) {
    lvglLoadError.value = 'Please enter LVGL object name';
    return;
  }
  
  lvglLoadError.value = '';
  
  vscode.postMessage({
    command: 'extractLVGLImageProperties',
    variableName: lvglObjectName.value
  });
}


async function handleLVGLImageUpdate(message: any) {
  // Handle LVGL image data with dimensions and format
  try {
    // Determine if this is an OpenCV Mat or LVGL image based on the name or source
    const isOpenCV = message.name && message.name.includes('OpenCV') || 
                    message.sourceType === 'opencv' ||
                    (message.name && message.name.includes('(OpenCV Mat)'));
    
    imageName.value = message.name || (isOpenCV ? 'OpenCV Image' : 'LVGL Image');
    
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
      console.error('Base64 decode error:', err);
      imageData.value = new Uint8Array(0);
      error.value = 'Failed to decode base64 data';
      return;
    }
    
    // Set format from LVGL or OpenCV format AFTER image data is loaded
    if (message.format !== undefined) {
      
      const formatValue = isOpenCV ? 
        getFormatValueFromOpenCVFormat(message.format) : 
        getFormatValueFromLVGLFormat(message.format);
        
      if (formatValue) {
        selectedFormat.value = formatValue;
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
    }
    
    // Create properties object for display (LVGL or OpenCV)
    lvglProperties.value = {
      width: message.width || 0,
      height: message.height || 0,
      format: message.format || 0,
      dataSize: message.dataSize || imageData.value?.length || 0,
      dataAddress: message.dataAddress || '0x0',
      sourceType: isOpenCV ? 1 : 0 // 0 = LVGL, 1 = OpenCV
    };
    
    
    // Calculate debug information
    if (imageData.value && imageData.value!.length > 0) {
      // Data preview (first 32 bytes as hex)
      const previewBytes = imageData.value!.slice(0, 32);
      dataPreview.value = Array.from(previewBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      
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
    error.value = `Failed to load LVGL image: ${err}`;
  }
}



function getFormatName(format: number): string {
  const formatMap: { [key: number]: string } = {
    // LVGL Color Format constants (lv_color_format_t) - from official documentation
    0x00: 'Unknown',          // LV_COLOR_FORMAT_UNKNOWN
    0x01: 'Raw',              // LV_COLOR_FORMAT_RAW
    0x02: 'RawAlpha',         // LV_COLOR_FORMAT_RAW_ALPHA
    0x03: 'L8',               // LV_COLOR_FORMAT_L8
    0x04: 'I1',               // LV_COLOR_FORMAT_I1
    0x05: 'I2',               // LV_COLOR_FORMAT_I2
    0x06: 'I4',               // LV_COLOR_FORMAT_I4
    0x07: 'I8',               // LV_COLOR_FORMAT_I8
    0x08: 'A8',               // LV_COLOR_FORMAT_A8
    0x09: 'RGB565',           // LV_COLOR_FORMAT_RGB565
    0x0A: 'ARGB8565',         // LV_COLOR_FORMAT_ARGB8565
    0x0B: 'RGB565A8',         // LV_COLOR_FORMAT_RGB565A8
    0x0C: 'AL88',             // LV_COLOR_FORMAT_AL88
    0x0D: 'RGB565Swapped',    // LV_COLOR_FORMAT_RGB565_SWAPPED
    0x0E: 'RGB888',           // LV_COLOR_FORMAT_RGB888
    0x0F: 'ARGB8888',         // LV_COLOR_FORMAT_ARGB8888
    0x10: 'XRGB8888',         // LV_COLOR_FORMAT_XRGB8888
    0x11: 'ARGB8888Premult',  // LV_COLOR_FORMAT_ARGB8888_PREMULTIPLIED
    0x12: 'A1',               // LV_COLOR_FORMAT_A1
    0x13: 'A2',               // LV_COLOR_FORMAT_A2
    0x14: 'A4',               // LV_COLOR_FORMAT_A4
    0x15: 'ARGB1555',         // LV_COLOR_FORMAT_ARGB1555
    0x16: 'ARGB4444',         // LV_COLOR_FORMAT_ARGB4444
    0x17: 'ARGB2222',         // LV_COLOR_FORMAT_ARGB2222
    0x18: 'YUVStart',         // LV_COLOR_FORMAT_YUV_START
    0x19: 'I420',             // LV_COLOR_FORMAT_I420
    0x1A: 'I422',             // LV_COLOR_FORMAT_I422
    0x1B: 'I444',             // LV_COLOR_FORMAT_I444
    0x1C: 'I400',             // LV_COLOR_FORMAT_I400
    0x1D: 'NV21',             // LV_COLOR_FORMAT_NV21
    0x1E: 'NV12',             // LV_COLOR_FORMAT_NV12
    0x1F: 'YUY2',             // LV_COLOR_FORMAT_YUY2
    0x20: 'UYVY',             // LV_COLOR_FORMAT_UYVY
    0x21: 'YUVEnd',           // LV_COLOR_FORMAT_YUV_END
    0x22: 'ProprietaryStart', // LV_COLOR_FORMAT_PROPRIETARY_START
    0x23: 'NemaTscStart',     // LV_COLOR_FORMAT_NEMA_TSC_START
    0x24: 'NemaTsc4',         // LV_COLOR_FORMAT_NEMA_TSC4
    0x25: 'NemaTsc6',         // LV_COLOR_FORMAT_NEMA_TSC6
    0x26: 'NemaTsc6A',        // LV_COLOR_FORMAT_NEMA_TSC6A
    0x27: 'NemaTsc6AP',       // LV_COLOR_FORMAT_NEMA_TSC6AP
    0x28: 'NemaTsc12',        // LV_COLOR_FORMAT_NEMA_TSC12
    0x29: 'NemaTsc12A',       // LV_COLOR_FORMAT_NEMA_TSC12A
    0x2A: 'NemaTscEnd',       // LV_COLOR_FORMAT_NEMA_TSC_END
    0x2B: 'Native',           // LV_COLOR_FORMAT_NATIVE
    0x2C: 'NativeWithAlpha',  // LV_COLOR_FORMAT_NATIVE_WITH_ALPHA
  };
  
  return formatMap[format] || `Unknown (0x${format.toString(16).toUpperCase()})`;
}

function getFormatValueFromLVGLFormat(format: number): string {
  const formatMap: { [key: number]: string } = {
    // LVGL Color Format constants (lv_color_format_t) -> dropdown values
    0x00: 'grayscale',        // LV_COLOR_FORMAT_UNKNOWN -> fallback to grayscale
    0x01: 'grayscale',        // LV_COLOR_FORMAT_RAW -> not supported, fallback
    0x02: 'grayscale',        // LV_COLOR_FORMAT_RAW_ALPHA -> not supported, fallback
    0x03: 'grayscale',        // LV_COLOR_FORMAT_L8 -> not supported, fallback
    0x04: 'grayscale',        // LV_COLOR_FORMAT_I1 -> not supported, fallback
    0x05: 'grayscale',        // LV_COLOR_FORMAT_I2 -> not supported, fallback
    0x06: 'grayscale',        // LV_COLOR_FORMAT_I4 -> not supported, fallback
    0x07: 'grayscale',        // LV_COLOR_FORMAT_I8 -> not supported, fallback
    0x08: 'grayscale',        // LV_COLOR_FORMAT_A8 -> not supported, fallback
    0x09: 'rgb565',           // LV_COLOR_FORMAT_RGB565
    0x0A: 'rgb565',           // LV_COLOR_FORMAT_ARGB8565 -> closest match
    0x0B: 'rgb565',           // LV_COLOR_FORMAT_RGB565A8 -> closest match
    0x0C: 'grayscale',        // LV_COLOR_FORMAT_AL88 -> not supported, fallback
    0x0D: 'rgb565',           // LV_COLOR_FORMAT_RGB565_SWAPPED -> closest match
    0x0E: 'rgb888',           // LV_COLOR_FORMAT_RGB888
    0x0F: 'argb8888',         // LV_COLOR_FORMAT_ARGB8888
    0x10: 'bgra8888',         // LV_COLOR_FORMAT_XRGB8888 -> mapped to bgra8888
    0x11: 'argb8888',         // LV_COLOR_FORMAT_ARGB8888_PREMULTIPLIED -> closest match
    0x12: 'grayscale',        // LV_COLOR_FORMAT_A1 -> not supported, fallback
    0x13: 'grayscale',        // LV_COLOR_FORMAT_A2 -> not supported, fallback
    0x14: 'grayscale',        // LV_COLOR_FORMAT_A4 -> not supported, fallback
    0x15: 'rgb555',           // LV_COLOR_FORMAT_ARGB1555 -> closest match
    0x16: 'rgb444',           // LV_COLOR_FORMAT_ARGB4444 -> closest match
    0x17: 'rgb332',           // LV_COLOR_FORMAT_ARGB2222 -> closest match
    0x18: 'yuv420',           // LV_COLOR_FORMAT_YUV_START -> fallback to yuv420
    0x19: 'yuv420',           // LV_COLOR_FORMAT_I420
    0x1A: 'yuv422',           // LV_COLOR_FORMAT_I422
    0x1B: 'yuv444',           // LV_COLOR_FORMAT_I444
    0x1C: 'grayscale',        // LV_COLOR_FORMAT_I400 -> not supported, fallback
    0x1D: 'yuv420',           // LV_COLOR_FORMAT_NV21 -> closest match
    0x1E: 'yuv420',           // LV_COLOR_FORMAT_NV12 -> closest match
    0x1F: 'yuv422',           // LV_COLOR_FORMAT_YUY2 -> closest match
    0x20: 'yuv422',           // LV_COLOR_FORMAT_UYVY -> closest match
    0x21: 'yuv420',           // LV_COLOR_FORMAT_YUV_END -> fallback to yuv420
    0x22: 'rgb888',           // LV_COLOR_FORMAT_PROPRIETARY_START -> fallback
    0x23: 'rgb888',           // LV_COLOR_FORMAT_NEMA_TSC_START -> fallback
    0x24: 'rgb444',           // LV_COLOR_FORMAT_NEMA_TSC4 -> closest match
    0x25: 'rgb666',           // LV_COLOR_FORMAT_NEMA_TSC6 -> closest match
    0x26: 'rgb666',           // LV_COLOR_FORMAT_NEMA_TSC6A -> closest match
    0x27: 'rgb666',           // LV_COLOR_FORMAT_NEMA_TSC6AP -> closest match
    0x28: 'rgb888',           // LV_COLOR_FORMAT_NEMA_TSC12 -> closest match
    0x29: 'rgb888',           // LV_COLOR_FORMAT_NEMA_TSC12A -> closest match
    0x2A: 'rgb888',           // LV_COLOR_FORMAT_NEMA_TSC_END -> fallback
    0x2B: 'rgb888',           // LV_COLOR_FORMAT_NATIVE -> fallback to rgb888
    0x2C: 'rgba8888',         // LV_COLOR_FORMAT_NATIVE_WITH_ALPHA -> fallback to rgba8888
  };
  
  return formatMap[format] || 'rgb888'; // Default fallback
}

function getFormatValueFromOpenCVFormat(format: number): string {
  // OpenCV Mat format mapping - using same format constants as getFormatName
  // OpenCV typically uses BGR888 for color images and grayscale for single channel
  const formatMap: { [key: number]: string } = {
    0x00: 'grayscale',        // OpenCV Grayscale (1 channel) - matches getFormatName 'Unknown'
    0x0E: 'bgr888',           // OpenCV BGR888 (3 channels) - matches getFormatName 'RGB888' 
    0x0F: 'bgra8888',         // OpenCV BGRA8888 (4 channels) - matches getFormatName 'ARGB8888'
    0x10: 'bgra8888',         // OpenCV XRGB8888 (4 channels) - matches getFormatName 'XRGB8888'
  };
  
  return formatMap[format] || 'bgr888'; // Default to BGR888 for OpenCV
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
      console.error('Base64 decode error:', err);
      // Fallback: try to use the data as-is
      imageData.value = new Uint8Array(0);
      error.value = 'Failed to decode base64 data';
      return;
    }
    
    

    
    // Calculate debug information
    if (imageData && imageData.value!.length > 0) {
      // Data preview (first 32 bytes as hex)
      const previewBytes = imageData.value!.slice(0, 32);
      dataPreview.value = Array.from(previewBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      
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
      case 'rgba8888':
        renderRGBA8888(pixels, width, height);
        break;
      case 'argb8888':
        renderARGB8888(pixels, width, height);
        break;
      case 'xrgb8888':
        renderXRGB8888(pixels, width, height);
        break;
      case 'bgr888':
        renderBGR888(pixels, width, height);
        break;
      case 'bgra8888':
        renderBGRA8888(pixels, width, height);
        break;
      case 'abgr8888':
        renderABGR8888(pixels, width, height);
        break;
      case 'xbgr8888':
        renderXBGR8888(pixels, width, height);
        break;
      case 'rgb332':
        renderRGB332(pixels, width, height);
        break;
      case 'rgb444':
        renderRGB444(pixels, width, height);
        break;
      case 'rgb555':
        renderRGB555(pixels, width, height);
        break;
      case 'rgb666':
        renderRGB666(pixels, width, height);
        break;
      case 'rgb777':
        renderRGB777(pixels, width, height);
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
    const bytesPerPixel = getBytesPerPixel(selectedFormat.value);
    const expectedPixels = Math.floor(imageData.value!.length / bytesPerPixel);
    const actualPixels = width * height;
    
    imageInfo.value = `${selectedFormat.value.toUpperCase()} - ${width}x${height} - ${imageData.value!.length} bytes - ${expectedPixels} pixels (${actualPixels} displayed)`;
    
  } catch (err) {
    error.value = `Failed to render image: ${err}`;
  }
}

function estimateWidth(): number {
  if (!imageData.value) return 400;
  
  // For different formats, calculate pixels differently
  const totalPixels = Math.floor(imageData.value!.length / getBytesPerPixel(selectedFormat.value));
  
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
  const totalPixels = Math.floor(imageData.value!.length / getBytesPerPixel(selectedFormat.value));
  
  const height = Math.floor(totalPixels / customWidth.value);
  return height || 300;
}

function getBytesPerPixel(format: string): number {
  switch (format) {
    case 'rgb565':
    case 'rgb555':
      return 2;
    case 'rgb888':
    case 'bgr888':
    case 'yuv444':
      return 3;
    case 'rgba8888':
    case 'argb8888':
    case 'xrgb8888':
    case 'bgra8888':
    case 'abgr8888':
    case 'xbgr8888':
      return 4;
    case 'rgb332':
      return 1;
    case 'rgb444':
    case 'rgb666':
    case 'rgb777':
      return 1.5;
    case 'yuv420':
      return 1.5;
    case 'yuv422':
      return 2;
    case 'grayscale':
    default:
      return 1;
  }
}

function renderRGB565(pixels: Uint8ClampedArray, width: number, height: number) {
  if (!imageData) return;
  
  const bytesPerPixel = 2;
  const maxPixels = Math.min(imageData.value!.length / bytesPerPixel, width * height);
  
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
  const maxPixels = Math.min(imageData.value!.length / bytesPerPixel, width * height);
  
  for (let i = 0, j = 0; i < maxPixels; i++, j += bytesPerPixel) {
    const pixelIndex = i * 4;
    
    if (j + 2 >= imageData.value!.length) break;
    
    const r = imageData.value![j] || 0;
    const g = imageData.value![j + 1] || 0;
    const b = imageData.value![j + 2] || 0;
    
    pixels[pixelIndex] = r;     // Red
    pixels[pixelIndex + 1] = g; // Green
    pixels[pixelIndex + 2] = b; // Blue
    pixels[pixelIndex + 3] = 255; // Alpha
  }
}



function renderGrayscale(pixels: Uint8ClampedArray, width: number, height: number) {
  if (!imageData) return;
  
  const maxPixels = Math.min(imageData.value!.length, width * height);
  
  for (let i = 0; i < maxPixels; i++) {
    const pixelIndex = i * 4;
    
    if (i >= imageData.value!.length) break;
    
    const gray = imageData.value![i];
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
  
  if (imageData.value!.length < ySize + uvSize * 2) {
    error.value = 'Insufficient data for YUV420 format';
    return;
  }
  
  const yData = imageData.value!.slice(0, ySize);
  const uData = imageData.value!.slice(ySize, ySize + uvSize);
  const vData = imageData.value!.slice(ySize + uvSize, ySize + uvSize * 2);
  
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
  
  if (imageData.value!.length < ySize + uvSize * 2) {
    error.value = 'Insufficient data for YUV422 format';
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
  
  if (imageData.value!.length < planeSize * 3) {
    error.value = 'Insufficient data for YUV444 format';
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

// New LVGL format render functions
function renderRGBA8888(pixels: Uint8ClampedArray, width: number, height: number) {
  if (!imageData) return;
  
  const bytesPerPixel = 4;
  const maxPixels = Math.min(imageData.value!.length / bytesPerPixel, width * height);
  
  for (let i = 0, j = 0; i < maxPixels; i++, j += bytesPerPixel) {
    const pixelIndex = i * 4;
    
    if (j + 3 >= imageData.value!.length) break;
    
    pixels[pixelIndex] = imageData.value![j] || 0;     // Red
    pixels[pixelIndex + 1] = imageData.value![j + 1] || 0; // Green
    pixels[pixelIndex + 2] = imageData.value![j + 2] || 0; // Blue
    pixels[pixelIndex + 3] = imageData.value![j + 3] || 255; // Alpha
  }
}

function renderARGB8888(pixels: Uint8ClampedArray, width: number, height: number) {
  if (!imageData) return;
  
  const bytesPerPixel = 4;
  const maxPixels = Math.min(imageData.value!.length / bytesPerPixel, width * height);
  
  for (let i = 0, j = 0; i < maxPixels; i++, j += bytesPerPixel) {
    const pixelIndex = i * 4;
    
    if (j + 3 >= imageData.value!.length) break;
    
    pixels[pixelIndex] = imageData.value![j + 1] || 0;     // Red
    pixels[pixelIndex + 1] = imageData.value![j + 2] || 0; // Green
    pixels[pixelIndex + 2] = imageData.value![j + 3] || 0; // Blue
    pixels[pixelIndex + 3] = imageData.value![j] || 255; // Alpha
  }
}

function renderXRGB8888(pixels: Uint8ClampedArray, width: number, height: number) {
  if (!imageData) return;
  
  const bytesPerPixel = 4;
  const maxPixels = Math.min(imageData.value!.length / bytesPerPixel, width * height);
  
  for (let i = 0, j = 0; i < maxPixels; i++, j += bytesPerPixel) {
    const pixelIndex = i * 4;
    
    if (j + 3 >= imageData.value!.length) break;
    
    pixels[pixelIndex] = imageData.value![j + 1] || 0;     // Red
    pixels[pixelIndex + 1] = imageData.value![j + 2] || 0; // Green
    pixels[pixelIndex + 2] = imageData.value![j + 3] || 0; // Blue
    pixels[pixelIndex + 3] = 255; // Alpha (ignored in XRGB)
  }
}

function renderBGR888(pixels: Uint8ClampedArray, width: number, height: number) {
  if (!imageData) return;
  
  const bytesPerPixel = 3;
  const maxPixels = Math.min(imageData.value!.length / bytesPerPixel, width * height);
  
  for (let i = 0, j = 0; i < maxPixels; i++, j += bytesPerPixel) {
    const pixelIndex = i * 4;
    
    if (j + 2 >= imageData.value!.length) break;
    
    pixels[pixelIndex] = imageData.value![j + 2] || 0;     // Red
    pixels[pixelIndex + 1] = imageData.value![j + 1] || 0; // Green
    pixels[pixelIndex + 2] = imageData.value![j] || 0; // Blue
    pixels[pixelIndex + 3] = 255; // Alpha
  }
}

function renderBGRA8888(pixels: Uint8ClampedArray, width: number, height: number) {
  if (!imageData) return;
  
  const bytesPerPixel = 4;
  const maxPixels = Math.min(imageData.value!.length / bytesPerPixel, width * height);
  
  for (let i = 0, j = 0; i < maxPixels; i++, j += bytesPerPixel) {
    const pixelIndex = i * 4;
    
    if (j + 3 >= imageData.value!.length) break;
    
    pixels[pixelIndex] = imageData.value![j + 2] || 0;     // Red
    pixels[pixelIndex + 1] = imageData.value![j + 1] || 0; // Green
    pixels[pixelIndex + 2] = imageData.value![j] || 0; // Blue
    pixels[pixelIndex + 3] = imageData.value![j + 3] || 255; // Alpha
  }
}

function renderABGR8888(pixels: Uint8ClampedArray, width: number, height: number) {
  if (!imageData) return;
  
  const bytesPerPixel = 4;
  const maxPixels = Math.min(imageData.value!.length / bytesPerPixel, width * height);
  
  for (let i = 0, j = 0; i < maxPixels; i++, j += bytesPerPixel) {
    const pixelIndex = i * 4;
    
    if (j + 3 >= imageData.value!.length) break;
    
    pixels[pixelIndex] = imageData.value![j + 3] || 0;     // Red
    pixels[pixelIndex + 1] = imageData.value![j + 2] || 0; // Green
    pixels[pixelIndex + 2] = imageData.value![j + 1] || 0; // Blue
    pixels[pixelIndex + 3] = imageData.value![j] || 255; // Alpha
  }
}

function renderXBGR8888(pixels: Uint8ClampedArray, width: number, height: number) {
  if (!imageData) return;
  
  const bytesPerPixel = 4;
  const maxPixels = Math.min(imageData.value!.length / bytesPerPixel, width * height);
  
  for (let i = 0, j = 0; i < maxPixels; i++, j += bytesPerPixel) {
    const pixelIndex = i * 4;
    
    if (j + 3 >= imageData.value!.length) break;
    
    pixels[pixelIndex] = imageData.value![j + 3] || 0;     // Red
    pixels[pixelIndex + 1] = imageData.value![j + 2] || 0; // Green
    pixels[pixelIndex + 2] = imageData.value![j + 1] || 0; // Blue
    pixels[pixelIndex + 3] = 255; // Alpha (ignored in XBGR)
  }
}

function renderRGB332(pixels: Uint8ClampedArray, width: number, height: number) {
  if (!imageData) return;
  
  const maxPixels = Math.min(imageData.value!.length, width * height);
  
  for (let i = 0; i < maxPixels; i++) {
    const pixelIndex = i * 4;
    
    if (i >= imageData.value!.length) break;
    
    const packed = imageData.value![i];
    const r = ((packed >> 5) & 0x7) << 5; // 3 bits -> 8 bits
    const g = ((packed >> 2) & 0x7) << 5; // 3 bits -> 8 bits
    const b = (packed & 0x3) << 6; // 2 bits -> 8 bits
    
    pixels[pixelIndex] = r;     // Red
    pixels[pixelIndex + 1] = g; // Green
    pixels[pixelIndex + 2] = b; // Blue
    pixels[pixelIndex + 3] = 255; // Alpha
  }
}

function renderRGB444(pixels: Uint8ClampedArray, width: number, height: number) {
  if (!imageData) return;
  
  const maxPixels = Math.min(imageData.value!.length / 1.5, width * height);
  
  for (let i = 0; i < maxPixels; i++) {
    const pixelIndex = i * 4;
    const dataIndex = Math.floor(i * 1.5);
    
    if (dataIndex + 1 >= imageData.value!.length) break;
    
    const byte1 = imageData.value![dataIndex];
    const byte2 = imageData.value![dataIndex + 1];
    
    // RGB444 packed format: RRRRGGGG BBBBRRRR
    const r = ((byte1 >> 4) & 0xF) << 4;
    const g = (byte1 & 0xF) << 4;
    const b = ((byte2 >> 4) & 0xF) << 4;
    
    pixels[pixelIndex] = r;     // Red
    pixels[pixelIndex + 1] = g; // Green
    pixels[pixelIndex + 2] = b; // Blue
    pixels[pixelIndex + 3] = 255; // Alpha
  }
}

function renderRGB555(pixels: Uint8ClampedArray, width: number, height: number) {
  if (!imageData) return;
  
  const bytesPerPixel = 2;
  const maxPixels = Math.min(imageData.value!.length / bytesPerPixel, width * height);
  
  for (let i = 0; i < maxPixels; i++) {
    const pixelIndex = i * 4;
    const dataIndex = i * bytesPerPixel;
    
    if (dataIndex + 1 >= imageData.value!.length) break;
    
    const packed = (imageData.value![dataIndex + 1] << 8) | imageData.value![dataIndex];
    const r = ((packed >> 10) & 0x1F) << 3;
    const g = ((packed >> 5) & 0x1F) << 3;
    const b = (packed & 0x1F) << 3;
    
    pixels[pixelIndex] = r;     // Red
    pixels[pixelIndex + 1] = g; // Green
    pixels[pixelIndex + 2] = b; // Blue
    pixels[pixelIndex + 3] = 255; // Alpha
  }
}

function renderRGB666(pixels: Uint8ClampedArray, width: number, height: number) {
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
    const r = ((byte1 << 2) | ((byte2 >> 4) & 0x3)) & 0x3F;
    const g = ((byte2 << 4) | ((byte3 >> 4) & 0xF)) & 0x3F;
    const b = byte3 & 0x3F;
    
    pixels[pixelIndex] = r << 2;     // Red (6 bits -> 8 bits)
    pixels[pixelIndex + 1] = g << 2; // Green (6 bits -> 8 bits)
    pixels[pixelIndex + 2] = b << 2; // Blue (6 bits -> 8 bits)
    pixels[pixelIndex + 3] = 255; // Alpha
  }
}

function renderRGB777(pixels: Uint8ClampedArray, width: number, height: number) {
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
    const r = ((byte1 << 1) | ((byte2 >> 7) & 0x1)) & 0x7F;
    const g = ((byte2 << 1) | ((byte3 >> 7) & 0x1)) & 0x7F;
    const b = (byte3 << 1) & 0x7F;
    
    pixels[pixelIndex] = r << 1;     // Red (7 bits -> 8 bits)
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

.lvgl-section, .manual-section {
  margin-bottom: 24px;
}

.lvgl-section h4, .manual-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-foreground);
  border-bottom: 1px solid var(--vscode-panel-border);
  padding-bottom: 8px;
}

.divider {
  text-align: center;
  margin: 24px 0;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background-color: var(--vscode-panel-border);
  }
  
  span {
    background-color: var(--vscode-editor-background);
    padding: 0 16px;
    color: var(--vscode-descriptionForeground);
    font-size: 14px;
    font-weight: 500;
  }
}

.lvgl-properties {
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

.lvgl-object-data {
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
  
  details {
    margin-top: 8px;
  }
  
  summary {
    cursor: pointer;
    font-weight: 500;
    color: var(--vscode-foreground);
    padding: 4px 0;
    
    &:hover {
      color: var(--vscode-textLink-foreground);
    }
  }
  
  .object-data-json {
    background-color: var(--vscode-input-background);
    padding: 12px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    overflow-x: auto;
    margin: 8px 0 0 0;
    border: 1px solid var(--vscode-input-border);
    color: var(--vscode-input-foreground);
    max-height: 300px;
    overflow-y: auto;
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