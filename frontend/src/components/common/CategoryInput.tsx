import { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Plus } from 'lucide-react';
import { inviteesAPI } from '../../services/api';

interface CategoryInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export default function CategoryInput({
  value,
  onChange,
  placeholder = 'Select or type a category...',
  error,
}: CategoryInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await inviteesAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter categories based on search
  const filteredCategories = categories.filter(cat =>
    cat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if exact match exists
  const exactMatchExists = categories.some(
    cat => cat.toLowerCase() === searchQuery.toLowerCase()
  );

  const handleSelect = (category: string) => {
    onChange(category);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
    if (!isOpen) setIsOpen(true);
  };

  const handleClear = () => {
    onChange('');
    setSearchQuery('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value || searchQuery}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 pr-16 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white ${
            error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-gray-500 dark:text-gray-400">Loading categories...</div>
          ) : (
            <>
              {/* Add new category option */}
              {searchQuery && !exactMatchExists && (
                <button
                  type="button"
                  onClick={() => handleSelect(searchQuery)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-primary/5 text-primary"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add "{searchQuery}"</span>
                </button>
              )}

              {/* Divider if showing both */}
              {searchQuery && !exactMatchExists && filteredCategories.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700" />
              )}

              {/* Existing categories */}
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleSelect(category)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      value === category ? 'bg-primary/5 text-primary' : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {category}
                  </button>
                ))
              ) : (
                !searchQuery && (
                  <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                    No categories yet. Type to create one.
                  </div>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
