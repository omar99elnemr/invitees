/**
 * Column Visibility Context
 * Global admin-configurable column visibility for system tables.
 * Fetches config from backend on mount, provides isVisible() helper to all pages.
 */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { settingsAPI } from '../services/api';
import { useAuth } from './AuthContext';

// ---- Column definitions per table ----
// Each table has fixed columns (always shown) and optional columns (configurable).

export interface ColumnDef {
  key: string;
  label: string;
  fixed?: boolean; // true = always shown, not configurable
}

export const TABLE_COLUMNS: Record<string, ColumnDef[]> = {
  invitees_events: [
    { key: 'name', label: 'Name', fixed: true },
    { key: 'unit_number', label: 'Unit No.' },
    { key: 'inviter', label: 'Inviter' },
    { key: 'category', label: 'Category' },
    { key: 'guests', label: 'Guests' },
    { key: 'position', label: 'Position / Company' },
    { key: 'group', label: 'Group (Admin)', fixed: true },
    { key: 'actions', label: 'Actions', fixed: true },
  ],
  invitees_contacts: [
    { key: 'name', label: 'Name', fixed: true },
    { key: 'unit_number', label: 'Unit No.' },
    { key: 'inviter', label: 'Inviter' },
    { key: 'category', label: 'Category' },
    { key: 'guests', label: 'Guests' },
    { key: 'position', label: 'Position / Company' },
    { key: 'group', label: 'Group (Admin)', fixed: true },
    { key: 'events_count', label: 'Events' },
    { key: 'actions', label: 'Actions', fixed: true },
  ],
  approvals: [
    { key: 'invitee', label: 'Invitee', fixed: true },
    { key: 'event', label: 'Event', fixed: true },
    { key: 'unit_number', label: 'Unit No.' },
    { key: 'invited_by', label: 'Invited By' },
    { key: 'position', label: 'Position / Company' },
    { key: 'submitted_by', label: 'Submitted By' },
    { key: 'approved_by', label: 'Approved By' },
    { key: 'actions', label: 'Actions', fixed: true },
  ],
  attendance: [
    { key: 'name', label: 'Name', fixed: true },
    { key: 'unit_number', label: 'Unit No.' },
    { key: 'code', label: 'Code' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status', fixed: true },
    { key: 'guests', label: 'Guests' },
    { key: 'inviter', label: 'Inviter' },
    { key: 'group', label: 'Group (Admin)', fixed: true },
    { key: 'actions', label: 'Actions', fixed: true },
  ],
  reports_detail: [
    { key: 'invitee', label: 'Invitee', fixed: true },
    { key: 'event', label: 'Event', fixed: true },
    { key: 'unit_number', label: 'Unit No.' },
    { key: 'inviter', label: 'Inviter' },
    { key: 'category', label: 'Category' },
    { key: 'submitted_by', label: 'Submitted By' },
    { key: 'status', label: 'Status' },
    { key: 'approved_by', label: 'Approved/Rejected By' },
    { key: 'date', label: 'Date' },
  ],
  reports_approved: [
    { key: 'invitee', label: 'Invitee', fixed: true },
    { key: 'event', label: 'Event', fixed: true },
    { key: 'unit_number', label: 'Unit No.' },
    { key: 'inviter', label: 'Inviter' },
    { key: 'category', label: 'Category' },
    { key: 'submitted_by', label: 'Submitted By' },
    { key: 'approved_by', label: 'Approved By' },
    { key: 'code', label: 'Code' },
    { key: 'sent', label: 'Sent' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'checked_in', label: 'Checked In' },
    { key: 'guests', label: 'Guests' },
    { key: 'date', label: 'Approval Date' },
  ],
};

// Max optional (non-fixed) columns that can be enabled per table
export const MAX_OPTIONAL_COLUMNS = 10;

// Default visible optional columns per table (used when no setting saved)
export const DEFAULT_COLUMNS: Record<string, string[]> = {
  invitees_events: ['inviter', 'category', 'guests'],
  invitees_contacts: ['inviter', 'category', 'guests', 'events_count'],
  approvals: ['invited_by', 'submitted_by'],
  attendance: ['code', 'guests', 'inviter'],
  reports_detail: ['unit_number', 'inviter', 'category', 'submitted_by', 'status', 'approved_by', 'date'],
  reports_approved: ['unit_number', 'inviter', 'submitted_by', 'approved_by', 'sent', 'confirmed', 'date'],
};

export const TABLE_LABELS: Record<string, string> = {
  invitees_events: 'Invitees – Events Tab',
  invitees_contacts: 'Invitees – Contacts Tab',
  approvals: 'Approvals',
  attendance: 'Attendance',
  reports_detail: 'Reports – Detailed Invitees',
  reports_approved: 'Reports – Full Approved Details',
};

interface ColumnVisibilityContextType {
  /** Check if a column is visible for a given table */
  isVisible: (table: string, columnKey: string) => boolean;
  /** Get all visible optional column keys for a table */
  getVisibleColumns: (table: string) => string[];
  /** Set visible optional columns for a table (admin only) */
  setTableColumns: (table: string, columns: string[]) => void;
  /** Save current config to backend */
  saveConfig: () => Promise<void>;
  /** Reset a table to defaults */
  resetTable: (table: string) => void;
  /** The full config object */
  config: Record<string, string[]>;
  /** Whether config has been loaded */
  loaded: boolean;
  /** Whether a save is in progress */
  saving: boolean;
}

const ColumnVisibilityContext = createContext<ColumnVisibilityContextType | undefined>(undefined);

export function ColumnVisibilityProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Record<string, string[]>>({ ...DEFAULT_COLUMNS });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const { generalSettings } = useAuth();

  // Apply column visibility from AuthContext's generalSettings.
  // This fires after auth succeeds and settings are fetched — no more
  // race condition where settings were fetched before auth was ready.
  useEffect(() => {
    if (!generalSettings) return;
    try {
      const raw = generalSettings.column_visibility;
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (parsed && typeof parsed === 'object') {
          const merged: Record<string, string[]> = { ...DEFAULT_COLUMNS };
          for (const key of Object.keys(DEFAULT_COLUMNS)) {
            if (Array.isArray(parsed[key])) {
              merged[key] = parsed[key];
            }
          }
          setConfig(merged);
        }
      }
    } catch (error) {
      console.error('Failed to parse column visibility settings:', error);
    } finally {
      setLoaded(true);
    }
  }, [generalSettings]);

  const isVisible = useCallback((table: string, columnKey: string): boolean => {
    const tableDef = TABLE_COLUMNS[table];
    if (!tableDef) return true;

    const colDef = tableDef.find(c => c.key === columnKey);
    if (!colDef) return true; // Unknown column, show by default
    if (colDef.fixed) return true; // Fixed columns always visible

    const visibleCols = config[table] || DEFAULT_COLUMNS[table] || [];
    return visibleCols.includes(columnKey);
  }, [config]);

  const getVisibleColumns = useCallback((table: string): string[] => {
    return config[table] || DEFAULT_COLUMNS[table] || [];
  }, [config]);

  const setTableColumns = useCallback((table: string, columns: string[]) => {
    setConfig(prev => ({ ...prev, [table]: columns }));
  }, []);

  const saveConfig = useCallback(async () => {
    setSaving(true);
    try {
      await settingsAPI.updateGeneralSettings({ column_visibility: config });
    } finally {
      setSaving(false);
    }
  }, [config]);

  const resetTable = useCallback((table: string) => {
    setConfig(prev => ({ ...prev, [table]: [...(DEFAULT_COLUMNS[table] || [])] }));
  }, []);

  return (
    <ColumnVisibilityContext.Provider value={{ isVisible, getVisibleColumns, setTableColumns, saveConfig, resetTable, config, loaded, saving }}>
      {children}
    </ColumnVisibilityContext.Provider>
  );
}

export function useColumnVisibility() {
  const context = useContext(ColumnVisibilityContext);
  if (!context) {
    throw new Error('useColumnVisibility must be used within a ColumnVisibilityProvider');
  }
  return context;
}
