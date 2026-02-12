/**
 * Export Settings Page
 * Admin-only page for managing export logos (left and right) for PDF, Excel, and Print reports
 */
import { useState, useEffect, useRef } from 'react';
import { FormSkeleton } from '../components/common/LoadingSkeleton';
import { Upload, Trash2, Image, Save, RefreshCw, AlertCircle, CheckCircle, Pencil, Download, Database, FileSpreadsheet, FileText, FileJson, Shield, Users as UsersIcon, Calendar, UserCheck, Tag, Building, ZoomIn, ChevronDown, Settings } from 'lucide-react';
import ImageEditor from '../components/common/ImageEditor';
import { settingsAPI } from '../services/api';
import type { ExportSettings as ExportSettingsType } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import Papa from 'papaparse';

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

  // Logo sizing state
  const [logoScale, setLogoScale] = useState<number>(100);
  const [logoPaddingTop, setLogoPaddingTop] = useState<number>(0);
  const [logoPaddingBottom, setLogoPaddingBottom] = useState<number>(0);
  const [sizingChanged, setSizingChanged] = useState(false);

  // Accordion state
  const [logoSectionOpen, setLogoSectionOpen] = useState(true);
  const [backupSectionOpen, setBackupSectionOpen] = useState(false);

  // Fetch current settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getExportSettings();
      const s = response.data.settings || {};
      setSettings(s);
      // Load sizing values from settings
      if (s.logo_scale?.value) setLogoScale(Number(s.logo_scale.value) || 100);
      if (s.logo_padding_top?.value) setLogoPaddingTop(Number(s.logo_padding_top.value) || 0);
      if (s.logo_padding_bottom?.value) setLogoPaddingBottom(Number(s.logo_padding_bottom.value) || 0);
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

  const hasChanges = pendingLeft !== undefined || pendingRight !== undefined || removeLeft || removeRight || sizingChanged;

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

      // Include sizing settings if changed
      if (sizingChanged) {
        payload.logo_scale = logoScale;
        payload.logo_padding_top = logoPaddingTop;
        payload.logo_padding_bottom = logoPaddingBottom;
      }

      const response = await settingsAPI.updateExportSettings(payload);
      const s = response.data.settings || {};
      setSettings(s);
      if (s.logo_scale?.value) setLogoScale(Number(s.logo_scale.value) || 100);
      if (s.logo_padding_top?.value) setLogoPaddingTop(Number(s.logo_padding_top.value) || 0);
      if (s.logo_padding_bottom?.value) setLogoPaddingBottom(Number(s.logo_padding_bottom.value) || 0);

      // Clear pending state
      setPendingLeft(undefined);
      setPendingRight(undefined);
      setRemoveLeft(false);
      setRemoveRight(false);
      setSizingChanged(false);
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

  // Compute preview dimensions from sizing controls
  const previewScale = logoScale / 100;
  const previewH = Math.round(48 * previewScale);
  const previewMaxW = Math.round(120 * previewScale);
  const previewPadTop = logoPaddingTop;
  const previewPadBot = logoPaddingBottom;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            Settings
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage export logos, data backup, and system preferences.
          </p>
        </div>
      </div>

      {/* ==================== SECTION 1: Export Logos (Collapsible) ==================== */}
      <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        {/* Accordion Header */}
        <button
          onClick={() => setLogoSectionOpen(!logoSectionOpen)}
          className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow">
              <Image className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Export Logos</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Left & right logos, sizing, and preview for PDF, Excel, and Print exports</p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${logoSectionOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Accordion Body */}
        {logoSectionOpen && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            {/* Live Preview */}
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Live Preview</h3>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
                <div
                  className="flex items-center justify-between px-6 bg-gray-100 dark:bg-gray-800/60"
                  style={{ paddingTop: `${12 + previewPadTop}px`, paddingBottom: `${12 + previewPadBot}px` }}
                >
                  {/* Left logo preview */}
                  <div className="flex items-center">
                    {getDisplayImage('left') ? (
                      <img
                        src={getDisplayImage('left')!}
                        alt="Left logo"
                        style={{ height: `${previewH}px`, maxWidth: `${previewMaxW}px` }}
                        className="object-contain"
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
                  <div className="flex items-center">
                    {getDisplayImage('right') ? (
                      <img
                        src={getDisplayImage('right')!}
                        alt="Right logo"
                        style={{ height: `${previewH}px`, maxWidth: `${previewMaxW}px` }}
                        className="object-contain"
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
                Adjust logos and sizing below — changes reflect here in real time
              </p>
            </div>

            {/* Logo Upload Cards */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LogoCard
                  side="left"
                  title="Left Logo"
                  description="Top-left corner of exported reports"
                  image={getDisplayImage('left')}
                  status={getStatus('left')}
                  meta={settings.logo_left}
                  inputRef={leftInputRef}
                  onFileSelect={(file) => handleFileSelect('left', file)}
                  onRemove={() => handleRemove('left')}
                  onCancel={() => handleCancelPending('left')}
                  onEdit={() => handleOpenEditor('left')}
                />
                <LogoCard
                  side="right"
                  title="Right Logo"
                  description="Top-right corner of exported reports"
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
            </div>

            {/* Logo Sizing Controls */}
            <div className="px-6 pb-6">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5 space-y-5">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <ZoomIn className="w-3.5 h-3.5 text-indigo-500" />
                  Logo Size & Position
                </h3>
                {/* Scale */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Logo Scale</label>
                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{logoScale}%</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={200}
                    step={5}
                    value={logoScale}
                    onChange={(e) => { setLogoScale(Number(e.target.value)); setSizingChanged(true); }}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>60%</span>
                    <span>100% (default)</span>
                    <span>200%</span>
                  </div>
                </div>

                {/* Vertical padding */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Extend Up</label>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{logoPaddingTop}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={logoPaddingTop}
                      onChange={(e) => { setLogoPaddingTop(Number(e.target.value)); setSizingChanged(true); }}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Extend Down</label>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{logoPaddingBottom}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={logoPaddingBottom}
                      onChange={(e) => { setLogoPaddingBottom(Number(e.target.value)); setSizingChanged(true); }}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                </div>

                {logoScale !== 100 || logoPaddingTop !== 0 || logoPaddingBottom !== 0 ? (
                  <button
                    onClick={() => { setLogoScale(100); setLogoPaddingTop(0); setLogoPaddingBottom(0); setSizingChanged(true); }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Reset to defaults
                  </button>
                ) : null}

                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Adjust logo size in export headers. The preview above updates in real time. Save to apply to PDF, Excel, and Print exports.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Editor Modal */}
      {editingSide && editorImage && (
        <ImageEditor
          imageSrc={editorImage}
          onApply={handleEditorApply}
          onClose={handleEditorClose}
        />
      )}

      {/* Save Bar */}
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
                  setLogoScale(Number(settings.logo_scale?.value) || 100);
                  setLogoPaddingTop(Number(settings.logo_padding_top?.value) || 0);
                  setLogoPaddingBottom(Number(settings.logo_padding_bottom?.value) || 0);
                  setSizingChanged(false);
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

      {/* ==================== SECTION 2: Data Backup (Collapsible) ==================== */}
      <DataBackupSection isOpen={backupSectionOpen} onToggle={() => setBackupSectionOpen(!backupSectionOpen)} />
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


// =========================
// Data Backup Section
// =========================
const BACKUP_TABLES = [
  { key: 'users', label: 'Users', icon: UsersIcon, desc: 'All user accounts and roles' },
  { key: 'inviter_groups', label: 'Inviter Groups', icon: Building, desc: 'Department / team groups' },
  { key: 'inviters', label: 'Inviters', icon: UserCheck, desc: 'Individual inviters within groups' },
  { key: 'contacts', label: 'Contacts', icon: UsersIcon, desc: 'All invitee/contact records' },
  { key: 'events', label: 'Events', icon: Calendar, desc: 'All event definitions' },
  { key: 'event_invitees', label: 'Event Assignments', icon: Tag, desc: 'Event-invitee links, statuses, attendance' },
  { key: 'categories', label: 'Categories', icon: Tag, desc: 'Invitee categories' },
];

function DataBackupSection({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const [selectedTables, setSelectedTables] = useState<string[]>(BACKUP_TABLES.map(t => t.key));
  const [includePasswords, setIncludePasswords] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<{ date: string; summary: Record<string, number> } | null>(null);

  const allSelected = selectedTables.length === BACKUP_TABLES.length;

  const toggleTable = (key: string) => {
    setSelectedTables(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleAll = () => {
    setSelectedTables(allSelected ? [] : BACKUP_TABLES.map(t => t.key));
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (fmt: 'json' | 'csv' | 'excel') => {
    if (selectedTables.length === 0) {
      toast.error('Select at least one data table');
      return;
    }

    const toastId = toast.loading('Preparing backup…');
    setExporting(true);

    try {
      const res = await settingsAPI.getBackupData(selectedTables, includePasswords);
      const { backup_date, summary, data } = res.data;
      const ts = format(new Date(backup_date), 'yyyy-MM-dd_HHmm');

      if (fmt === 'json') {
        const json = JSON.stringify({ backup_date, summary, data }, null, 2);
        downloadFile(json, `backup_${ts}.json`, 'application/json');
      } else if (fmt === 'csv') {
        // One CSV per table, bundled as separate downloads
        const tableKeys = Object.keys(data);
        if (tableKeys.length === 1) {
          const csv = Papa.unparse(data[tableKeys[0]]);
          downloadFile(csv, `backup_${tableKeys[0]}_${ts}.csv`, 'text/csv');
        } else {
          for (const tbl of tableKeys) {
            if (data[tbl] && data[tbl].length > 0) {
              const csv = Papa.unparse(data[tbl]);
              downloadFile(csv, `backup_${tbl}_${ts}.csv`, 'text/csv');
            }
          }
        }
      } else {
        // Excel via ExcelJS
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();

        for (const tbl of Object.keys(data)) {
          if (!data[tbl] || data[tbl].length === 0) continue;
          const ws = workbook.addWorksheet(tbl.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
          const headers = Object.keys(data[tbl][0]);
          const headerRow = ws.addRow(headers.map(h => h.toUpperCase().replace(/_/g, ' ')));
          headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2980B9' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          });
          data[tbl].forEach((row: any) => {
            ws.addRow(headers.map(h => row[h] ?? ''));
          });
          headers.forEach((h, i) => {
            let max = h.length;
            data[tbl].forEach((r: any) => { const v = String(r[h] || ''); if (v.length > max) max = v.length; });
            ws.getColumn(i + 1).width = Math.min(Math.max(max + 2, 10), 40);
          });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${ts}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setLastBackup({ date: backup_date, summary });
      toast.dismiss(toastId);
      toast.success(`Backup exported as ${fmt.toUpperCase()}`);
    } catch (err: any) {
      console.error('Backup failed:', err);
      toast.dismiss(toastId);
      toast.error(`Backup failed: ${err?.response?.data?.error || err.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      {/* Accordion Header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/30 dark:hover:to-teal-900/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow">
            <Database className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="text-left">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Data Backup & Export</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Download a full backup of your system data for migration or archival</p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && <div className="border-t border-gray-200 dark:border-gray-700 p-6 space-y-6">
        {/* Table Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Select Data to Export</h3>
            <button
              onClick={toggleAll}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {BACKUP_TABLES.map(({ key, label, icon: Icon, desc }) => {
              const checked = selectedTables.includes(key);
              return (
                <label
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    checked
                      ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTable(key)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Icon className={`w-4 h-4 flex-shrink-0 ${checked ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{label}</div>
                    <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center gap-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg">
          <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <label className="flex items-center gap-2 cursor-pointer flex-1">
            <input
              type="checkbox"
              checked={includePasswords}
              onChange={e => setIncludePasswords(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <div>
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Include password hashes</span>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">Required for full system migration. Keep this file secure.</p>
            </div>
          </label>
        </div>

        {/* Export Buttons */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Export Format</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => handleExport('json')}
              disabled={exporting || selectedTables.length === 0}
              className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileJson className="w-5 h-5" />
              JSON
              <span className="text-[10px] font-normal opacity-70">Full structure</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting || selectedTables.length === 0}
              className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileText className="w-5 h-5" />
              CSV
              <span className="text-[10px] font-normal opacity-70">One file per table</span>
            </button>
            <button
              onClick={() => handleExport('excel')}
              disabled={exporting || selectedTables.length === 0}
              className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 font-medium text-sm hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Excel
              <span className="text-[10px] font-normal opacity-70">Multi-sheet workbook</span>
            </button>
          </div>
        </div>

        {/* Last backup info */}
        {lastBackup && (
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-lg">
            <Download className="w-4 h-4 text-green-600 dark:text-green-400" />
            <div className="text-sm text-green-700 dark:text-green-300">
              <span className="font-medium">Last backup:</span>{' '}
              {format(new Date(lastBackup.date), 'MMM dd, yyyy h:mm a')} —{' '}
              {Object.entries(lastBackup.summary).map(([k, v]) => `${v} ${k}`).join(', ')}
            </div>
          </div>
        )}
      </div>}
    </div>
  );
}
