/**
 * Image Editor Modal
 * Client-side image editing for export logos:
 * - Interactive crop with zoom
 * - Remove white/light background → transparent
 * - Resize (max dimension control)
 * - Live preview
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import {
  X,
  Crop,
  ZoomIn,
  ZoomOut,
  Eraser,
  Maximize2,
  RotateCcw,
  Check,
  Eye,
} from 'lucide-react';

interface ImageEditorProps {
  imageSrc: string;
  onApply: (editedImage: string) => void;
  onClose: () => void;
}

type EditorTab = 'crop' | 'background' | 'resize';

// ─── Canvas helpers ──────────────────────────────────────────────

/** Create an offscreen image element from a data URI */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Extract the cropped region from the original image */
async function getCroppedImage(
  imageSrc: string,
  crop: Area
): Promise<string> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return canvas.toDataURL('image/png');
}

/** Remove white / near-white pixels → transparent */
function removeWhiteBackground(
  imageSrc: string,
  tolerance: number
): Promise<string> {
  return new Promise(async (resolve) => {
    const img = await loadImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const threshold = 255 - tolerance;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // If all channels are above threshold, make transparent
      if (r >= threshold && g >= threshold && b >= threshold) {
        data[i + 3] = 0; // alpha = 0
      }
    }
    ctx.putImageData(imageData, 0, 0);
    resolve(canvas.toDataURL('image/png'));
  });
}

/** Resize image to fit within maxDim, preserving aspect ratio */
async function resizeImage(
  imageSrc: string,
  maxWidth: number,
  maxHeight: number
): Promise<string> {
  const img = await loadImage(imageSrc);
  let { width, height } = img;

  if (width <= maxWidth && height <= maxHeight) {
    // Already within bounds
    return imageSrc;
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/png');
}

// ─── Editor Component ────────────────────────────────────────────

export default function ImageEditor({ imageSrc, onApply, onClose }: ImageEditorProps) {
  // Working image — starts as original, updated as edits are applied
  const [workingImage, setWorkingImage] = useState(imageSrc);
  const [activeTab, setActiveTab] = useState<EditorTab>('crop');
  const [processing, setProcessing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Crop state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Background removal state
  const [bgTolerance, setBgTolerance] = useState(30);
  const [bgPreview, setBgPreview] = useState<string | null>(null);

  // Resize state
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  const [maxWidth, setMaxWidth] = useState(300);
  const [maxHeight, setMaxHeight] = useState(300);
  const [resizePreview, setResizePreview] = useState<string | null>(null);

  // History for undo
  const historyRef = useRef<string[]>([imageSrc]);

  // Load dimensions when working image changes
  useEffect(() => {
    loadImage(workingImage).then((img) => {
      setImgDimensions({ width: img.width, height: img.height });
    });
  }, [workingImage]);

  // Reset sub-tool state when switching tabs
  useEffect(() => {
    setBgPreview(null);
    setResizePreview(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [activeTab]);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // ── Apply actions ──

  const applyCrop = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const cropped = await getCroppedImage(workingImage, croppedAreaPixels);
      historyRef.current.push(workingImage);
      setWorkingImage(cropped);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } finally {
      setProcessing(false);
    }
  };

  const previewBgRemoval = async () => {
    setProcessing(true);
    try {
      const result = await removeWhiteBackground(workingImage, bgTolerance);
      setBgPreview(result);
    } finally {
      setProcessing(false);
    }
  };

  const applyBgRemoval = () => {
    if (!bgPreview) return;
    historyRef.current.push(workingImage);
    setWorkingImage(bgPreview);
    setBgPreview(null);
  };

  const previewResize = async () => {
    setProcessing(true);
    try {
      const result = await resizeImage(workingImage, maxWidth, maxHeight);
      setResizePreview(result);
    } finally {
      setProcessing(false);
    }
  };

  const applyResize = () => {
    if (!resizePreview) return;
    historyRef.current.push(workingImage);
    setWorkingImage(resizePreview);
    setResizePreview(null);
  };

  const handleUndo = () => {
    if (historyRef.current.length > 0) {
      const prev = historyRef.current.pop()!;
      setWorkingImage(prev);
      setBgPreview(null);
      setResizePreview(null);
    }
  };

  const handleApply = () => {
    onApply(workingImage);
  };

  const canUndo = historyRef.current.length > 1;
  const hasChanges = workingImage !== imageSrc;

  const tabs: { id: EditorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'crop', label: 'Crop', icon: <Crop className="w-4 h-4" /> },
    { id: 'background', label: 'Background', icon: <Eraser className="w-4 h-4" /> },
    { id: 'resize', label: 'Resize', icon: <Maximize2 className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Logo</h2>
          <div className="flex items-center gap-2">
            {canUndo && (
              <button
                onClick={handleUndo}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Undo last edit"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {/* ── CROP TAB ── */}
          {activeTab === 'crop' && (
            <div className="space-y-4">
              <div className="relative w-full h-[340px] bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden">
                <Cropper
                  image={workingImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={undefined}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  style={{
                    containerStyle: { borderRadius: '0.75rem' },
                  }}
                />
              </div>
              {/* Zoom slider */}
              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <ZoomIn className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-500 w-12 text-right">{zoom.toFixed(1)}x</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Drag to reposition. Use the slider or scroll to zoom. Drag corners to adjust the crop area.
              </p>
              <button
                onClick={applyCrop}
                disabled={processing}
                className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Crop className="w-4 h-4" />
                {processing ? 'Cropping...' : 'Apply Crop'}
              </button>
            </div>
          )}

          {/* ── BACKGROUND TAB ── */}
          {activeTab === 'background' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Converts white and near-white pixels to transparent. Ideal for logos on white backgrounds.
                </p>
              </div>

              {/* Tolerance slider */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
                  <span>Tolerance</span>
                  <span className="text-xs text-gray-400 font-normal">{bgTolerance}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={1}
                  value={bgTolerance}
                  onChange={(e) => { setBgTolerance(Number(e.target.value)); setBgPreview(null); }}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Exact white only</span>
                  <span>More aggressive</span>
                </div>
              </div>

              {/* Preview area */}
              <div
                className="rounded-xl p-4 flex items-center justify-center min-h-[200px]"
                style={{ background: 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 50% / 20px 20px' }}
              >
                <img
                  src={bgPreview || workingImage}
                  alt="Background preview"
                  className="max-h-[180px] max-w-full object-contain"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Checkerboard pattern indicates transparent areas
              </p>

              <div className="flex gap-3">
                <button
                  onClick={previewBgRemoval}
                  disabled={processing}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {processing ? 'Processing...' : 'Preview'}
                </button>
                <button
                  onClick={applyBgRemoval}
                  disabled={!bgPreview || processing}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Eraser className="w-4 h-4" />
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* ── RESIZE TAB ── */}
          {activeTab === 'resize' && (
            <div className="space-y-4">
              {/* Current dimensions */}
              <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Current:</span> {imgDimensions.width} × {imgDimensions.height} px
                </div>
              </div>

              {/* Max dimension controls */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max Width (px)</label>
                  <input
                    type="number"
                    min={16}
                    max={2000}
                    value={maxWidth}
                    onChange={(e) => { setMaxWidth(Number(e.target.value)); setResizePreview(null); }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max Height (px)</label>
                  <input
                    type="number"
                    min={16}
                    max={2000}
                    value={maxHeight}
                    onChange={(e) => { setMaxHeight(Number(e.target.value)); setResizePreview(null); }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                The image will be scaled down to fit within these bounds while preserving its aspect ratio. Images already smaller will not be enlarged.
              </p>

              {/* Preview */}
              {resizePreview && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 flex flex-col items-center gap-2">
                  <img
                    src={resizePreview}
                    alt="Resize preview"
                    className="max-h-[160px] max-w-full object-contain"
                  />
                  <ResizeDimensions src={resizePreview} />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={previewResize}
                  disabled={processing}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {processing ? 'Processing...' : 'Preview'}
                </button>
                <button
                  onClick={applyResize}
                  disabled={!resizePreview || processing}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Maximize2 className="w-4 h-4" />
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Full preview toggle */}
        {previewMode && (
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
            <div
              className="rounded-lg p-4 flex items-center justify-center min-h-[80px]"
              style={{ background: 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 50% / 16px 16px' }}
            >
              <img src={workingImage} alt="Full preview" className="max-h-[80px] max-w-full object-contain" />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex-shrink-0">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
              previewMode
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-400'
            }`}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!hasChanges}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Use This Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tiny helper to show dimensions of the resized preview */
function ResizeDimensions({ src }: { src: string }) {
  const [dims, setDims] = useState({ w: 0, h: 0 });
  useEffect(() => {
    loadImage(src).then((img) => setDims({ w: img.width, h: img.height }));
  }, [src]);
  if (!dims.w) return null;
  return (
    <span className="text-xs text-gray-500 dark:text-gray-400">
      Result: {dims.w} × {dims.h} px
    </span>
  );
}
