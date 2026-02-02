import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

// Country codes data with phone validation patterns
export const countryCodes = [
  { code: '+20', country: 'Egypt', iso: 'EG', pattern: /^\d{10}$/, placeholder: '123 456 7890', maxLength: 10 },
  { code: '+1', country: 'United States', iso: 'US', pattern: /^\d{10}$/, placeholder: '555 123 4567', maxLength: 10 },
  { code: '+1', country: 'Canada', iso: 'CA', pattern: /^\d{10}$/, placeholder: '555 123 4567', maxLength: 10 },
  { code: '+44', country: 'United Kingdom', iso: 'GB', pattern: /^\d{10,11}$/, placeholder: '7911 123456', maxLength: 11 },
  { code: '+971', country: 'UAE', iso: 'AE', pattern: /^\d{9}$/, placeholder: '50 123 4567', maxLength: 9 },
  { code: '+966', country: 'Saudi Arabia', iso: 'SA', pattern: /^\d{9}$/, placeholder: '50 123 4567', maxLength: 9 },
  { code: '+962', country: 'Jordan', iso: 'JO', pattern: /^\d{9}$/, placeholder: '79 123 4567', maxLength: 9 },
  { code: '+961', country: 'Lebanon', iso: 'LB', pattern: /^\d{7,8}$/, placeholder: '71 123456', maxLength: 8 },
  { code: '+33', country: 'France', iso: 'FR', pattern: /^\d{9}$/, placeholder: '6 12 34 56 78', maxLength: 9 },
  { code: '+49', country: 'Germany', iso: 'DE', pattern: /^\d{10,11}$/, placeholder: '151 12345678', maxLength: 11 },
  { code: '+39', country: 'Italy', iso: 'IT', pattern: /^\d{9,10}$/, placeholder: '312 345 6789', maxLength: 10 },
  { code: '+34', country: 'Spain', iso: 'ES', pattern: /^\d{9}$/, placeholder: '612 34 56 78', maxLength: 9 },
  { code: '+31', country: 'Netherlands', iso: 'NL', pattern: /^\d{9}$/, placeholder: '6 12345678', maxLength: 9 },
  { code: '+32', country: 'Belgium', iso: 'BE', pattern: /^\d{9}$/, placeholder: '470 12 34 56', maxLength: 9 },
  { code: '+41', country: 'Switzerland', iso: 'CH', pattern: /^\d{9}$/, placeholder: '78 123 45 67', maxLength: 9 },
  { code: '+43', country: 'Austria', iso: 'AT', pattern: /^\d{10,11}$/, placeholder: '664 1234567', maxLength: 11 },
  { code: '+90', country: 'Turkey', iso: 'TR', pattern: /^\d{10}$/, placeholder: '532 123 4567', maxLength: 10 },
  { code: '+7', country: 'Russia', iso: 'RU', pattern: /^\d{10}$/, placeholder: '912 345 6789', maxLength: 10 },
  { code: '+86', country: 'China', iso: 'CN', pattern: /^\d{11}$/, placeholder: '139 1234 5678', maxLength: 11 },
  { code: '+81', country: 'Japan', iso: 'JP', pattern: /^\d{10}$/, placeholder: '90 1234 5678', maxLength: 10 },
  { code: '+82', country: 'South Korea', iso: 'KR', pattern: /^\d{10,11}$/, placeholder: '10 1234 5678', maxLength: 11 },
  { code: '+91', country: 'India', iso: 'IN', pattern: /^\d{10}$/, placeholder: '98765 43210', maxLength: 10 },
  { code: '+92', country: 'Pakistan', iso: 'PK', pattern: /^\d{10}$/, placeholder: '300 1234567', maxLength: 10 },
  { code: '+880', country: 'Bangladesh', iso: 'BD', pattern: /^\d{10}$/, placeholder: '1712 345678', maxLength: 10 },
  { code: '+94', country: 'Sri Lanka', iso: 'LK', pattern: /^\d{9}$/, placeholder: '71 234 5678', maxLength: 9 },
  { code: '+60', country: 'Malaysia', iso: 'MY', pattern: /^\d{9,10}$/, placeholder: '12 345 6789', maxLength: 10 },
  { code: '+65', country: 'Singapore', iso: 'SG', pattern: /^\d{8}$/, placeholder: '9123 4567', maxLength: 8 },
  { code: '+66', country: 'Thailand', iso: 'TH', pattern: /^\d{9}$/, placeholder: '81 234 5678', maxLength: 9 },
  { code: '+84', country: 'Vietnam', iso: 'VN', pattern: /^\d{9,10}$/, placeholder: '91 234 5678', maxLength: 10 },
  { code: '+62', country: 'Indonesia', iso: 'ID', pattern: /^\d{9,12}$/, placeholder: '812 3456 7890', maxLength: 12 },
  { code: '+63', country: 'Philippines', iso: 'PH', pattern: /^\d{10}$/, placeholder: '917 123 4567', maxLength: 10 },
  { code: '+61', country: 'Australia', iso: 'AU', pattern: /^\d{9}$/, placeholder: '412 345 678', maxLength: 9 },
  { code: '+64', country: 'New Zealand', iso: 'NZ', pattern: /^\d{9}$/, placeholder: '21 123 4567', maxLength: 9 },
  { code: '+55', country: 'Brazil', iso: 'BR', pattern: /^\d{10,11}$/, placeholder: '11 91234 5678', maxLength: 11 },
  { code: '+52', country: 'Mexico', iso: 'MX', pattern: /^\d{10}$/, placeholder: '55 1234 5678', maxLength: 10 },
  { code: '+54', country: 'Argentina', iso: 'AR', pattern: /^\d{10}$/, placeholder: '11 1234 5678', maxLength: 10 },
  { code: '+56', country: 'Chile', iso: 'CL', pattern: /^\d{9}$/, placeholder: '9 1234 5678', maxLength: 9 },
  { code: '+57', country: 'Colombia', iso: 'CO', pattern: /^\d{10}$/, placeholder: '312 345 6789', maxLength: 10 },
  { code: '+51', country: 'Peru', iso: 'PE', pattern: /^\d{9}$/, placeholder: '987 654 321', maxLength: 9 },
  { code: '+27', country: 'South Africa', iso: 'ZA', pattern: /^\d{9}$/, placeholder: '82 123 4567', maxLength: 9 },
  { code: '+234', country: 'Nigeria', iso: 'NG', pattern: /^\d{10}$/, placeholder: '803 123 4567', maxLength: 10 },
  { code: '+254', country: 'Kenya', iso: 'KE', pattern: /^\d{9}$/, placeholder: '712 345678', maxLength: 9 },
  { code: '+212', country: 'Morocco', iso: 'MA', pattern: /^\d{9}$/, placeholder: '612 345678', maxLength: 9 },
  { code: '+213', country: 'Algeria', iso: 'DZ', pattern: /^\d{9}$/, placeholder: '551 234567', maxLength: 9 },
  { code: '+216', country: 'Tunisia', iso: 'TN', pattern: /^\d{8}$/, placeholder: '22 123 456', maxLength: 8 },
  { code: '+218', country: 'Libya', iso: 'LY', pattern: /^\d{9}$/, placeholder: '91 1234567', maxLength: 9 },
  { code: '+249', country: 'Sudan', iso: 'SD', pattern: /^\d{9}$/, placeholder: '91 234 5678', maxLength: 9 },
  { code: '+965', country: 'Kuwait', iso: 'KW', pattern: /^\d{8}$/, placeholder: '5012 3456', maxLength: 8 },
  { code: '+968', country: 'Oman', iso: 'OM', pattern: /^\d{8}$/, placeholder: '9212 3456', maxLength: 8 },
  { code: '+973', country: 'Bahrain', iso: 'BH', pattern: /^\d{8}$/, placeholder: '3612 3456', maxLength: 8 },
  { code: '+974', country: 'Qatar', iso: 'QA', pattern: /^\d{8}$/, placeholder: '5512 3456', maxLength: 8 },
  { code: '+964', country: 'Iraq', iso: 'IQ', pattern: /^\d{10}$/, placeholder: '790 123 4567', maxLength: 10 },
  { code: '+972', country: 'Israel', iso: 'IL', pattern: /^\d{9}$/, placeholder: '50 123 4567', maxLength: 9 },
  { code: '+98', country: 'Iran', iso: 'IR', pattern: /^\d{10}$/, placeholder: '912 345 6789', maxLength: 10 },
  { code: '+93', country: 'Afghanistan', iso: 'AF', pattern: /^\d{9}$/, placeholder: '70 123 4567', maxLength: 9 },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

export default function PhoneInput({ value, onChange, error, required = false }: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]); // Egypt default
  const [phoneNumber, setPhoneNumber] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse existing value on mount
  useEffect(() => {
    if (value) {
      // Try to parse existing phone number
      const matched = countryCodes.find(c => value.startsWith(c.code));
      if (matched) {
        setSelectedCountry(matched);
        setPhoneNumber(value.slice(matched.code.length).replace(/\s/g, ''));
      } else if (value.startsWith('+')) {
        // Unknown country code, just use the number part
        const parts = value.match(/^\+(\d+)\s*(.*)$/);
        if (parts) {
          setPhoneNumber(parts[2].replace(/\s/g, ''));
        }
      } else {
        setPhoneNumber(value.replace(/\s/g, ''));
      }
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter countries
  const filteredCountries = countryCodes.filter(
    c =>
      c.country.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search) ||
      c.iso.toLowerCase().includes(search.toLowerCase())
  );

  // Handle phone number change
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, ''); // Only digits
    const limited = rawValue.slice(0, selectedCountry.maxLength);
    setPhoneNumber(limited);
    onChange(`${selectedCountry.code}${limited}`);
  };

  // Handle country selection
  const handleSelectCountry = (country: typeof countryCodes[0]) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearch('');
    onChange(`${country.code}${phoneNumber}`);
    inputRef.current?.focus();
  };

  // Validate phone number
  const isValid = phoneNumber.length === 0 || selectedCountry.pattern.test(phoneNumber);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className={`flex border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary ${
        error || (!isValid && phoneNumber.length > 0) ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
      }`}>
        {/* Country Code Selector */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border-r border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 min-w-[100px]"
        >
          <span className="font-medium text-gray-700 dark:text-gray-300">{selectedCountry.code}</span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Phone Number Input */}
        <input
          ref={inputRef}
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder={selectedCountry.placeholder}
          className="flex-1 px-3 py-2 focus:outline-none bg-white dark:bg-gray-800 dark:text-white"
          required={required}
        />
      </div>

      {/* Validation Message */}
      {!isValid && phoneNumber.length > 0 && (
        <p className="mt-1 text-sm text-red-500">
          {selectedCountry.country} numbers require {selectedCountry.maxLength} digits
        </p>
      )}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      {/* Country Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-gray-700 dark:text-white"
                autoFocus
              />
            </div>
          </div>

          {/* Country List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <div className="p-3 text-center text-gray-500 dark:text-gray-400 text-sm">No countries found</div>
            ) : (
              filteredCountries.map((country, idx) => (
                <button
                  key={`${country.iso}-${idx}`}
                  type="button"
                  onClick={() => handleSelectCountry(country)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    selectedCountry.iso === country.iso && selectedCountry.code === country.code
                      ? 'bg-primary/5'
                      : ''
                  }`}
                >
                  <span className="w-12 font-medium text-gray-700 dark:text-gray-300">{country.code}</span>
                  <span className="flex-1 text-sm text-gray-900 dark:text-white">{country.country}</span>
                  {selectedCountry.iso === country.iso && selectedCountry.code === country.code && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to validate phone number with country code
export function validatePhoneNumber(phone: string): { valid: boolean; message?: string } {
  if (!phone) return { valid: false, message: 'Phone number is required' };
  
  const matched = countryCodes.find(c => phone.startsWith(c.code));
  if (!matched) {
    return { valid: false, message: 'Invalid country code' };
  }
  
  const numberPart = phone.slice(matched.code.length);
  if (!matched.pattern.test(numberPart)) {
    return { valid: false, message: `${matched.country} numbers require ${matched.maxLength} digits` };
  }
  
  return { valid: true };
}
