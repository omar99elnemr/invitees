/**
 * Export Settings Page
 * Admin-only page for managing export logos (left and right) for PDF, Excel, and Print reports
 */
import { useState, useEffect, useRef } from 'react';
import { FormSkeleton } from '../components/common/LoadingSkeleton';
import { Settings, Upload, Trash2, Image, Save, RefreshCw, AlertCircle, CheckCircle, Pencil } from 'lucide-react';
import ImageEditor from '../components/common/ImageEditor';
import { settingsAPI } from '../services/api';
import type { ExportSettings as ExportSettingsType } from '../services/api';
import toast from 'react-hot-toast';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export default function ExportSettings() {
  const [settings, setSettings] = useState<ExportSettingsType>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Pending changes (base64 data URIs or null for removal)
  const [pendingLeft, setPendingLeft] = useState<string | null | undefined>(undefined);
  const [pendingRight, setPendingRight] = useState<string | null | undefined>(undefined);
  const [removeLeft, setRemoveLeft] = useState(false);
  const [removeRight, setRemoveRight] = useState(false);

  const leftInputRef = useRef<HTMLInputElement>(null);
  const rightInputRef = useRef<HTMLInputElement>(null);

  // Image editor state
  const [editingSide, setEditingSide] = useState<'left' | 'right' | null>(null);
  const [editorImage, setEditorImage] = useState<string | null>(null);

  // Fetch current settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getExportSettings();
      setSettings(response.data.settings || {});
    } catch (error) {
      console.error('Failed to fetch export settings:', error);
      toast.error('Failed to load export settings');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (side: 'left' | 'right', file: File | null) => {
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please select a PNG, JPEG, WebP, or SVG image');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUri = e.target?.result as string;
      if (side === 'left') {
        setPendingLeft(dataUri);
        setRemoveLeft(false);
      } else {
        setPendingRight(dataUri);
        setRemoveRight(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (side: 'left' | 'right') => {
    if (side === 'left') {
      setPendingLeft(undefined);
      setRemoveLeft(true);
      if (leftInputRef.current) leftInputRef.current.value = '';
    } else {
      setPendingRight(undefined);
      setRemoveRight(true);
      if (rightInputRef.current) rightInputRef.current.value = '';
    }
  };

  const handleCancelPending = (side: 'left' | 'right') => {
    if (side === 'left') {
      setPendingLeft(undefined);
      setRemoveLeft(false);
      if (leftInputRef.current) leftInputRef.current.value = '';
    } else {
      setPendingRight(undefined);
      setRemoveRight(false);
      if (rightInputRef.current) rightInputRef.current.value = '';
    }
  };

  const hasChanges = pendingLeft !== undefined || pendingRight !== undefined || removeLeft || removeRight;

  const handleOpenEditor = (side: 'left' | 'right') => {
    const img = getDisplayImage(side);
    if (!img) return;
    setEditingSide(side);
    setEditorImage(img);
  };

  const handleEditorApply = (editedImage: string) => {
    if (editingSide === 'left') {
      setPendingLeft(editedImage);
      setRemoveLeft(false);
    } else if (editingSide === 'right') {
      setPendingRight(editedImage);
      setRemoveRight(false);
    }
    setEditingSide(null);
    setEditorImage(null);
  };

  const handleEditorClose = () => {
    setEditingSide(null);
    setEditorImage(null);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    try {
      setSaving(true);
      const payload: any = {};

      if (removeLeft) {
        payload.remove_left = true;
      } else if (pendingLeft !== undefined) {
        payload.logo_left = pendingLeft;
      }

      if (removeRight) {
        payload.remove_right = true;
      } else if (pendingRight !== undefined) {
        payload.logo_right = pendingRight;
      }

      const response = await settingsAPI.updateExportSettings(payload);
      setSettings(response.data.settings || {});

      // Clear pending state
      setPendingLeft(undefined);
      setPendingRight(undefined);
      setRemoveLeft(false);
      setRemoveRight(false);
      if (leftInputRef.current) leftInputRef.current.value = '';
      if (rightInputRef.current) rightInputRef.current.value = '';

      toast.success('Export logos updated successfully');
    } catch (error) {
      console.error('Failed to save export settings:', error);
      toast.error('Failed to save export settings');
    } finally {
      setSaving(false);
    }
  };

  // Determine what to display for each side
  const getDisplayImage = (side: 'left' | 'right'): string | null => {
    if (side === 'left') {
      if (removeLeft) return null;
      if (pendingLeft !== undefined) return pendingLeft;
      return settings.logo_left?.value || null;
    } else {
      if (removeRight) return null;
      if (pendingRight !== undefined) return pendingRight;
      return settings.logo_right?.value || null;
    }
  };

  const getStatus = (side: 'left' | 'right'): 'saved' | 'pending-upload' | 'pending-remove' | 'empty' => {
    if (side === 'left') {
      if (removeLeft) return 'pending-remove';
      if (pendingLeft !== undefined) return 'pending-upload';
      if (settings.logo_left?.value) return 'saved';
      return 'empty';
    } else {
      if (removeRight) return 'pending-remove';
      if (pendingRight !== undefined) return 'pending-upload';
      if (settings.logo_right?.value) return 'saved';
      return 'empty';
    }
  };

  if (loading) {
    return <FormSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            Export Settings
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage logos displayed on exported reports. Changes apply to PDF, Excel, and Print exports.
          </p>
        </div>
      </div>

      {/* PDF Preview Banner */}
      <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Export Header Preview
          </h2>
        </div>
        <div className="p-6">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between min-h-[60px]">
              {/* Left logo preview */}
              <div className="flex items-center gap-3">
                {getDisplayImage('left') ? (
                  <img
                    src={getDisplayImage('left')!}
                    alt="Left logo"
                    className="h-12 max-w-[120px] object-contain"
                  />
                ) : (
                  <div className="h-12 w-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded flex items-center justify-center">
                    <span className="text-xs text-gray-400">No logo</span>
                  </div>
                )}
              </div>

              {/* Center title */}
              <div className="text-center">
                <div className="text-lg font-bold text-gray-800 dark:text-gray-200">Report Title</div>
                <div className="text-xs text-gray-400">Generated: {new Date().toLocaleDateString()}</div>
              </div>

              {/* Right logo preview */}
              <div className="flex items-center gap-3">
                {getDisplayImage('right') ? (
                  <img
                    src={getDisplayImage('right')!}
                    alt="Right logo"
                    className="h-12 max-w-[120px] object-contain"
                  />
                ) : (
                  <div className="h-12 w-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded flex items-center justify-center">
                    <span className="text-xs text-gray-400">No logo</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
            This preview shows how logos will appear in PDF, Excel, and Print report headers
          </p>
        </div>
      </div>

      {/* Logo Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Logo Card */}
        <LogoCard
          side="left"
          title="Left Logo"
          description="Appears in the top-left corner of exported reports"
          image={getDisplayImage('left')}
          status={getStatus('left')}
          meta={settings.logo_left}
          inputRef={leftInputRef}
          onFileSelect={(file) => handleFileSelect('left', file)}
          onRemove={() => handleRemove('left')}
          onCancel={() => handleCancelPending('left')}
          onEdit={() => handleOpenEditor('left')}
        />

        {/* Right Logo Card */}
        <LogoCard
          side="right"
          title="Right Logo"
          description="Appears in the top-right corner of exported reports"
          image={getDisplayImage('right')}
          status={getStatus('right')}
          meta={settings.logo_right}
          inputRef={rightInputRef}
          onFileSelect={(file) => handleFileSelect('right', file)}
          onRemove={() => handleRemove('right')}
          onCancel={() => handleCancelPending('right')}
          onEdit={() => handleOpenEditor('right')}
        />
      </div>

      {/* Save Bar */}
      {/* Image Editor Modal */}
      {editingSide && editorImage && (
        <ImageEditor
          imageSrc={editorImage}
          onApply={handleEditorApply}
          onClose={handleEditorClose}
        />
      )}

      {hasChanges && (
        <div className="sticky bottom-4 z-10">
          <div className="bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl shadow-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">You have unsaved changes</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  handleCancelPending('left');
                  handleCancelPending('right');
                }}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-white text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================
// Logo Card Sub-component
// =========================
interface LogoCardProps {
  side: 'left' | 'right';
  title: string;
  description: string;
  image: string | null;
  status: 'saved' | 'pending-upload' | 'pending-remove' | 'empty';
  meta?: { value: string | null; updated_at: string | null; updated_by_name: string | null };
  inputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (file: File | null) => void;
  onRemove: () => void;
  onCancel: () => void;
  onEdit: () => void;
}

function LogoCard({ side, title, description, image, status, meta, inputRef, onFileSelect, onRemove, onCancel, onEdit }: LogoCardProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Image className="w-4 h-4 text-indigo-500" />
            {title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
        {/* Status badge */}
        {status === 'saved' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3" /> Active
          </span>
        )}
        {status === 'pending-upload' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <AlertCircle className="w-3 h-3" /> Unsaved
          </span>
        )}
        {status === 'pending-remove' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <Trash2 className="w-3 h-3" /> Removing
          </span>
        )}
      </div>

      <div className="p-6">
        {/* Image preview or upload area */}
        {image ? (
          <div className="space-y-4">
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-center min-h-[120px]">
              <img
                src={image}
                alt={`${side} logo`}
                className="max-h-[100px] max-w-full object-contain"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onEdit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => inputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Replace
              </button>
              <button
                onClick={onRemove}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
              {(status === 'pending-upload' || status === 'pending-remove') && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all min-h-[120px] flex flex-col items-center justify-center"
          >
            <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Click or drag & drop to upload
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              PNG, JPEG, WebP, or SVG — max 2MB
            </p>
            {status === 'pending-remove' && (
              <button
                onClick={(e) => { e.stopPropagation(); onCancel(); }}
                className="mt-3 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Undo removal
              </button>
            )}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
        />

        {/* Meta info */}
        {meta?.updated_at && status === 'saved' && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            Last updated by <span className="font-medium">{meta.updated_by_name}</span>{' '}
            on {new Date(meta.updated_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
