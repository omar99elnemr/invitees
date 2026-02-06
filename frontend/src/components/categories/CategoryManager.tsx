import React, { useState, useEffect } from 'react';
import { categoriesAPI } from '../../services/api';
import { Category } from '../../types';
import { X, Plus, Edit2, Trash2, Check, AlertTriangle, Power } from 'lucide-react';
import clsx from 'clsx';

interface CategoryManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ isOpen, onClose, onUpdate }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // New category state
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');

    // Delete/Usage state
    const [usageStats, setUsageStats] = useState<{ contacts: number; event_invitations: number } | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
            // Reset states
            setError(null);
            setSuccessMsg(null);
            setNewCategoryName('');
            setEditingId(null);
            setDeletingId(null);
        }
    }, [isOpen]);

    const fetchCategories = async () => {
        try {
            setIsLoading(true);
            const response = await categoriesAPI.getAll(false); // Fetch all, including inactive
            setCategories(response.data);
        } catch (err: any) {
            setError('Failed to load categories');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        try {
            setIsAdding(true);
            await categoriesAPI.create(newCategoryName.trim());
            setSuccessMsg('Category created successfully');
            setNewCategoryName('');
            fetchCategories();
            onUpdate();
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create category');
        } finally {
            setIsAdding(false);
        }
    };

    const handleEdit = (category: Category) => {
        setEditingId(category.id);
        setEditName(category.name);
        setDeletingId(null);
        setError(null);
    };

    const handleSaveEdit = async () => {
        if (!editingId || !editName.trim()) return;

        try {
            await categoriesAPI.update(editingId, editName.trim());
            setEditingId(null);
            fetchCategories();
            onUpdate();
            setSuccessMsg('Category updated');
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update category');
        }
    };

    const handleToggle = async (id: number) => {
        try {
            await categoriesAPI.toggle(id);
            fetchCategories();
            onUpdate();
        } catch (err: any) {
            setError('Failed to toggle category');
        }
    };

    const checkUsage = async (id: number) => {
        try {
            const response = await categoriesAPI.getUsage(id);
            setUsageStats(response.data);
            setDeletingId(id);
            setEditingId(null);
        } catch (err: any) {
            setError('Failed to check usage');
        }
    };

    const handleDelete = async () => {
        if (!deletingId) return;

        try {
            await categoriesAPI.delete(deletingId);
            setDeletingId(null);
            setUsageStats(null);
            fetchCategories();
            onUpdate();
            setSuccessMsg('Category deleted');
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete category');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Manage Categories</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm flex items-start">
                                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md text-sm flex items-center">
                                <Check className="h-5 w-5 mr-2" />
                                {successMsg}
                            </div>
                        )}

                        {/* List */}
                        <div className="max-h-96 overflow-y-auto mb-6">
                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : (
                                <>
                                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Active Categories</h4>
                                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {categories.filter(c => c.is_active).map(category => (
                                            <CategoryRow
                                                key={category.id}
                                                category={category}
                                                editingId={editingId}
                                                editName={editName}
                                                setEditName={setEditName}
                                                onEdit={() => handleEdit(category)}
                                                onSave={handleSaveEdit}
                                                onCancelEdit={() => setEditingId(null)}
                                                onToggle={() => handleToggle(category.id)}
                                                onDelete={() => checkUsage(category.id)}
                                            />
                                        ))}
                                        {categories.filter(c => c.is_active).length === 0 && (
                                            <li className="py-2 text-sm text-gray-500 dark:text-gray-400 italic">No active categories</li>
                                        )}
                                    </ul>

                                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 mt-6">Inactive Categories</h4>
                                    <ul className="divide-y divide-gray-200 dark:divide-gray-700 bg-gray-50 dark:bg-gray-700 rounded-md">
                                        {categories.filter(c => !c.is_active).map(category => (
                                            <CategoryRow
                                                key={category.id}
                                                category={category}
                                                editingId={editingId}
                                                editName={editName}
                                                setEditName={setEditName}
                                                onEdit={() => handleEdit(category)}
                                                onSave={handleSaveEdit}
                                                onCancelEdit={() => setEditingId(null)}
                                                onToggle={() => handleToggle(category.id)}
                                                onDelete={() => checkUsage(category.id)}
                                            />
                                        ))}
                                        {categories.filter(c => !c.is_active).length === 0 && (
                                            <li className="p-2 text-sm text-gray-500 dark:text-gray-400 italic text-center">No inactive categories</li>
                                        )}
                                    </ul>
                                </>
                            )}
                        </div>

                        {/* Add New */}
                        <form onSubmit={handleAdd} className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                            <label htmlFor="new-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add New Category</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    id="new-category"
                                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-white"
                                    placeholder="e.g. Platinum"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={isAdding || !newCategoryName.trim()}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                                >
                                    {isAdding ? 'Adding...' : <Plus className="h-4 w-4" />}
                                </button>
                            </div>
                        </form>

                        {/* Delete Confirmation Modal Overlay */}
                        {deletingId && usageStats && (
                            <div className="absolute inset-x-0 bottom-0 px-4 pb-4 sm:inset-0 sm:flex sm:items-center sm:justify-center">
                                <div className="fixed inset-0 transition-opacity">
                                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 overflow-hidden shadow-xl transform transition-all sm:max-w-sm sm:w-full z-10 relative">
                                    <div>
                                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30">
                                            <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                                        </div>
                                        <div className="mt-3 text-center sm:mt-5">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Delete Category?</h3>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    Are you sure you want to delete this category?
                                                </p>
                                                {(usageStats.contacts > 0 || usageStats.event_invitations > 0) ? (
                                                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/30 rounded text-left text-xs text-red-700 dark:text-red-400">
                                                        <p className="font-bold">Cannot delete:</p>
                                                        <ul className="list-disc pl-4 mt-1">
                                                            {usageStats.contacts > 0 && <li>Used by {usageStats.contacts} contacts</li>}
                                                            {usageStats.event_invitations > 0 && <li>Used in {usageStats.event_invitations} invitations</li>}
                                                        </ul>
                                                        <p className="mt-1">Please reassign or remove these usages first.</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This action cannot be undone.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-5 sm:mt-6 flex gap-2">
                                        <button
                                            type="button"
                                            className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none sm:text-sm"
                                            onClick={() => setDeletingId(null)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            disabled={usageStats.contacts > 0 || usageStats.event_invitations > 0}
                                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={handleDelete}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

interface CategoryRowProps {
    category: Category;
    editingId: number | null;
    editName: string;
    setEditName: (name: string) => void;
    onEdit: () => void;
    onSave: () => void;
    onCancelEdit: () => void;
    onToggle: () => void;
    onDelete: () => void;
}

const CategoryRow: React.FC<CategoryRowProps> = ({
    category, editingId, editName, setEditName, onEdit, onSave, onCancelEdit, onToggle, onDelete
}) => {
    const isEditing = editingId === category.id;

    return (
        <li className="py-3 flex items-center justify-between group">
            {isEditing ? (
                <div className="flex items-center flex-1 mr-2">
                    <input
                        type="text"
                        className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-white"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSave();
                            if (e.key === 'Escape') onCancelEdit();
                        }}
                    />
                    <button onClick={onSave} className="ml-2 text-green-600 hover:text-green-700"><Check className="h-4 w-4" /></button>
                    <button onClick={onCancelEdit} className="ml-1 text-gray-400 hover:text-gray-500"><X className="h-4 w-4" /></button>
                </div>
            ) : (
                <span className={clsx("text-sm font-medium dark:text-white", !category.is_active && "text-gray-500 dark:text-gray-400 line-through")}>
                    {category.name}
                </span>
            )}

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isEditing && (
                    <>
                        <button
                            onClick={onToggle}
                            className={clsx("p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700", category.is_active ? "text-orange-500" : "text-green-500")}
                            title={category.is_active ? "Deactivate" : "Activate"}
                        >
                            <Power className="h-4 w-4" />
                        </button>
                        <button
                            onClick={onEdit}
                            className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                            title="Edit"
                        >
                            <Edit2 className="h-4 w-4" />
                        </button>
                        {!category.is_active && (
                            <button
                                onClick={onDelete}
                                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                title="Delete"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </>
                )}
            </div>
        </li>
    );
};

export default CategoryManager;
