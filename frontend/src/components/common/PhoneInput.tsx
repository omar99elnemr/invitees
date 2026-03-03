import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

// Country codes data with phone validation patterns
// `digits` = country calling code as digits (no '+'), used for storage & matching
export const countryCodes = [
  { code: '+20', digits: '20', country: 'Egypt', iso: 'EG', pattern: /^\d{10}$/, placeholder: '1012345678', maxLength: 10 },
  { code: '+1', digits: '1', country: 'United States', iso: 'US', pattern: /^\d{10}$/, placeholder: '5551234567', maxLength: 10 },
  { code: '+1', digits: '1', country: 'Canada', iso: 'CA', pattern: /^\d{10}$/, placeholder: '5551234567', maxLength: 10 },
  { code: '+44', digits: '44', country: 'United Kingdom', iso: 'GB', pattern: /^\d{10,11}$/, placeholder: '7911123456', maxLength: 11 },
  { code: '+971', digits: '971', country: 'UAE', iso: 'AE', pattern: /^\d{9}$/, placeholder: '501234567', maxLength: 9 },
  { code: '+966', digits: '966', country: 'Saudi Arabia', iso: 'SA', pattern: /^\d{9}$/, placeholder: '501234567', maxLength: 9 },
  { code: '+962', digits: '962', country: 'Jordan', iso: 'JO', pattern: /^\d{9}$/, placeholder: '791234567', maxLength: 9 },
  { code: '+961', digits: '961', country: 'Lebanon', iso: 'LB', pattern: /^\d{7,8}$/, placeholder: '71123456', maxLength: 8 },
  { code: '+33', digits: '33', country: 'France', iso: 'FR', pattern: /^\d{9}$/, placeholder: '612345678', maxLength: 9 },
  { code: '+49', digits: '49', country: 'Germany', iso: 'DE', pattern: /^\d{10,11}$/, placeholder: '15112345678', maxLength: 11 },
  { code: '+39', digits: '39', country: 'Italy', iso: 'IT', pattern: /^\d{9,10}$/, placeholder: '3123456789', maxLength: 10 },
  { code: '+34', digits: '34', country: 'Spain', iso: 'ES', pattern: /^\d{9}$/, placeholder: '612345678', maxLength: 9 },
  { code: '+31', digits: '31', country: 'Netherlands', iso: 'NL', pattern: /^\d{9}$/, placeholder: '612345678', maxLength: 9 },
  { code: '+32', digits: '32', country: 'Belgium', iso: 'BE', pattern: /^\d{9}$/, placeholder: '470123456', maxLength: 9 },
  { code: '+41', digits: '41', country: 'Switzerland', iso: 'CH', pattern: /^\d{9}$/, placeholder: '781234567', maxLength: 9 },
  { code: '+43', digits: '43', country: 'Austria', iso: 'AT', pattern: /^\d{10,11}$/, placeholder: '6641234567', maxLength: 11 },
  { code: '+90', digits: '90', country: 'Turkey', iso: 'TR', pattern: /^\d{10}$/, placeholder: '5321234567', maxLength: 10 },
  { code: '+7', digits: '7', country: 'Russia', iso: 'RU', pattern: /^\d{10}$/, placeholder: '9123456789', maxLength: 10 },
  { code: '+86', digits: '86', country: 'China', iso: 'CN', pattern: /^\d{11}$/, placeholder: '13912345678', maxLength: 11 },
  { code: '+81', digits: '81', country: 'Japan', iso: 'JP', pattern: /^\d{10}$/, placeholder: '9012345678', maxLength: 10 },
  { code: '+82', digits: '82', country: 'South Korea', iso: 'KR', pattern: /^\d{10,11}$/, placeholder: '1012345678', maxLength: 11 },
  { code: '+91', digits: '91', country: 'India', iso: 'IN', pattern: /^\d{10}$/, placeholder: '9876543210', maxLength: 10 },
  { code: '+92', digits: '92', country: 'Pakistan', iso: 'PK', pattern: /^\d{10}$/, placeholder: '3001234567', maxLength: 10 },
  { code: '+880', digits: '880', country: 'Bangladesh', iso: 'BD', pattern: /^\d{10}$/, placeholder: '1712345678', maxLength: 10 },
  { code: '+94', digits: '94', country: 'Sri Lanka', iso: 'LK', pattern: /^\d{9}$/, placeholder: '712345678', maxLength: 9 },
  { code: '+60', digits: '60', country: 'Malaysia', iso: 'MY', pattern: /^\d{9,10}$/, placeholder: '123456789', maxLength: 10 },
  { code: '+65', digits: '65', country: 'Singapore', iso: 'SG', pattern: /^\d{8}$/, placeholder: '91234567', maxLength: 8 },
  { code: '+66', digits: '66', country: 'Thailand', iso: 'TH', pattern: /^\d{9}$/, placeholder: '812345678', maxLength: 9 },
  { code: '+84', digits: '84', country: 'Vietnam', iso: 'VN', pattern: /^\d{9,10}$/, placeholder: '912345678', maxLength: 10 },
  { code: '+62', digits: '62', country: 'Indonesia', iso: 'ID', pattern: /^\d{9,12}$/, placeholder: '81234567890', maxLength: 12 },
  { code: '+63', digits: '63', country: 'Philippines', iso: 'PH', pattern: /^\d{10}$/, placeholder: '9171234567', maxLength: 10 },
  { code: '+61', digits: '61', country: 'Australia', iso: 'AU', pattern: /^\d{9}$/, placeholder: '412345678', maxLength: 9 },
  { code: '+64', digits: '64', country: 'New Zealand', iso: 'NZ', pattern: /^\d{9}$/, placeholder: '211234567', maxLength: 9 },
  { code: '+55', digits: '55', country: 'Brazil', iso: 'BR', pattern: /^\d{10,11}$/, placeholder: '11912345678', maxLength: 11 },
  { code: '+52', digits: '52', country: 'Mexico', iso: 'MX', pattern: /^\d{10}$/, placeholder: '5512345678', maxLength: 10 },
  { code: '+54', digits: '54', country: 'Argentina', iso: 'AR', pattern: /^\d{10}$/, placeholder: '1112345678', maxLength: 10 },
  { code: '+56', digits: '56', country: 'Chile', iso: 'CL', pattern: /^\d{9}$/, placeholder: '912345678', maxLength: 9 },
  { code: '+57', digits: '57', country: 'Colombia', iso: 'CO', pattern: /^\d{10}$/, placeholder: '3123456789', maxLength: 10 },
  { code: '+51', digits: '51', country: 'Peru', iso: 'PE', pattern: /^\d{9}$/, placeholder: '987654321', maxLength: 9 },
  { code: '+27', digits: '27', country: 'South Africa', iso: 'ZA', pattern: /^\d{9}$/, placeholder: '821234567', maxLength: 9 },
  { code: '+234', digits: '234', country: 'Nigeria', iso: 'NG', pattern: /^\d{10}$/, placeholder: '8031234567', maxLength: 10 },
  { code: '+254', digits: '254', country: 'Kenya', iso: 'KE', pattern: /^\d{9}$/, placeholder: '712345678', maxLength: 9 },
  { code: '+212', digits: '212', country: 'Morocco', iso: 'MA', pattern: /^\d{9}$/, placeholder: '612345678', maxLength: 9 },
  { code: '+213', digits: '213', country: 'Algeria', iso: 'DZ', pattern: /^\d{9}$/, placeholder: '551234567', maxLength: 9 },
  { code: '+216', digits: '216', country: 'Tunisia', iso: 'TN', pattern: /^\d{8}$/, placeholder: '22123456', maxLength: 8 },
  { code: '+218', digits: '218', country: 'Libya', iso: 'LY', pattern: /^\d{9}$/, placeholder: '911234567', maxLength: 9 },
  { code: '+249', digits: '249', country: 'Sudan', iso: 'SD', pattern: /^\d{9}$/, placeholder: '912345678', maxLength: 9 },
  { code: '+965', digits: '965', country: 'Kuwait', iso: 'KW', pattern: /^\d{8}$/, placeholder: '50123456', maxLength: 8 },
  { code: '+968', digits: '968', country: 'Oman', iso: 'OM', pattern: /^\d{8}$/, placeholder: '92123456', maxLength: 8 },
  { code: '+973', digits: '973', country: 'Bahrain', iso: 'BH', pattern: /^\d{8}$/, placeholder: '36123456', maxLength: 8 },
  { code: '+974', digits: '974', country: 'Qatar', iso: 'QA', pattern: /^\d{8}$/, placeholder: '55123456', maxLength: 8 },
  { code: '+964', digits: '964', country: 'Iraq', iso: 'IQ', pattern: /^\d{10}$/, placeholder: '7901234567', maxLength: 10 },
  { code: '+972', digits: '972', country: 'Israel', iso: 'IL', pattern: /^\d{9}$/, placeholder: '501234567', maxLength: 9 },
  { code: '+98', digits: '98', country: 'Iran', iso: 'IR', pattern: /^\d{10}$/, placeholder: '9123456789', maxLength: 10 },
  { code: '+93', digits: '93', country: 'Afghanistan', iso: 'AF', pattern: /^\d{9}$/, placeholder: '701234567', maxLength: 9 },
];

// Pre-sorted by digits length DESC for longest-prefix-first matching
const sortedByDigitsLen = [...countryCodes].sort((a, b) => b.digits.length - a.digits.length);

/** Given a digits-only phone string, detect country + local number */
export function parseDigitsPhone(digits: string): { country: typeof countryCodes[0]; local: string } | null {
  if (!digits) return null;
  const clean = digits.replace(/[^\d]/g, '');
  if (!clean) return null;
  for (const c of sortedByDigitsLen) {
    if (clean.startsWith(c.digits)) {
      const local = clean.slice(c.digits.length);
      if (c.pattern.test(local)) {
        return { country: c, local };
      }
    }
  }
  // Fallback: couldn't match — try Egypt (default) if it starts with 20
  const egypt = countryCodes[0];
  if (clean.startsWith('20')) {
    return { country: egypt, local: clean.slice(2) };
  }
  // Last resort: return Egypt with full digits as local
  return { country: egypt, local: clean };
}

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
  const initialParseDone = useRef(false);

  // Parse existing digits-only value on mount or when value changes externally
  useEffect(() => {
    if (initialParseDone.current) return;
    if (value) {
      // Strip any '+' that may have leaked in
      const clean = value.replace(/[^\d]/g, '');
      const parsed = parseDigitsPhone(clean);
      if (parsed) {
        setSelectedCountry(parsed.country);
        setPhoneNumber(parsed.local);
      } else {
        setPhoneNumber(clean);
      }
      initialParseDone.current = true;
    }
  }, [value]);

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
      c.digits.includes(search) ||
      c.iso.toLowerCase().includes(search.toLowerCase())
  );

  // Emit digits-only value: countryDigits + localNumber (no '+')
  const emitValue = useCallback((country: typeof countryCodes[0], local: string) => {
    onChange(local ? `${country.digits}${local}` : '');
  }, [onChange]);

  // Handle phone number change
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, ''); // Only digits
    const limited = rawValue.slice(0, selectedCountry.maxLength);
    setPhoneNumber(limited);
    initialParseDone.current = true;
    emitValue(selectedCountry, limited);
  };

  // Handle country selection
  const handleSelectCountry = (country: typeof countryCodes[0]) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearch('');
    initialParseDone.current = true;
    emitValue(country, phoneNumber);
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

// Helper function to validate a digits-only phone number (no '+' prefix)
export function validatePhoneNumber(phone: string): { valid: boolean; message?: string } {
  if (!phone) return { valid: false, message: 'Phone number is required' };
  
  const clean = phone.replace(/[^\d]/g, '');
  if (!clean) return { valid: false, message: 'Phone number is required' };

  const parsed = parseDigitsPhone(clean);
  if (!parsed) {
    return { valid: false, message: 'Invalid phone number' };
  }

  if (!parsed.country.pattern.test(parsed.local)) {
    return { valid: false, message: `${parsed.country.country} numbers require ${parsed.country.maxLength} digits` };
  }
  
  return { valid: true };
}
