"""
Phone number normalization and validation utilities.
All phone numbers are stored WITHOUT the '+' prefix (for WhatsApp compatibility).
Format: country code + local number, digits only.
Example: 201012345678 (Egypt), 971501234567 (UAE), 14155551234 (US)
"""
import re
import math


def clean_phone(raw):
    """
    Normalize a raw phone value into digits-only international format (no '+').
    Handles:
      - Excel scientific notation (2.01E+11)
      - Excel float suffix (.0)
      - Leading '+' or '00' international prefix
      - Egyptian local format (0XXXXXXXXXX -> 20XXXXXXXXXX)
      - Spaces, dashes, parentheses
    Returns cleaned string or None if input is empty/invalid.
    """
    if raw is None:
        return None

    raw = str(raw).strip()
    if not raw or raw.lower() == 'nan' or raw.lower() == 'none':
        return None

    # Handle Excel scientific notation (e.g., 2.01E+11)
    try:
        if 'e' in raw.lower() and ('+' in raw[1:] or '-' in raw[1:]):
            num = float(raw)
            if not math.isnan(num) and not math.isinf(num):
                raw = f'{int(num)}'
    except (ValueError, OverflowError):
        pass

    # Handle Excel float suffix (e.g., 201012345678.0)
    if raw.endswith('.0'):
        raw = raw[:-2]

    # Strip everything except digits
    cleaned = re.sub(r'[^\d]', '', raw)

    if not cleaned:
        return None

    # Remove leading '00' international dialing prefix (e.g., 00201012345678)
    if cleaned.startswith('00') and len(cleaned) > 9:
        cleaned = cleaned[2:]

    # Convert Egyptian local format to international
    # Local: 01XXXXXXXXX (11 digits) -> 201XXXXXXXXX (12 digits)
    if cleaned.startswith('0') and not cleaned.startswith('00'):
        if len(cleaned) == 11 and cleaned[1] == '1':
            # Egyptian mobile local format
            cleaned = '2' + cleaned
        elif len(cleaned) == 10 and cleaned[1] in ('2', '3'):
            # Egyptian landline local format
            cleaned = '2' + cleaned

    return cleaned


def validate_phone(phone, allow_empty=False):
    """
    Validate a cleaned phone number (output of clean_phone).
    Rules:
      - Digits only, 7-15 characters (E.164 without '+')
      - Must start with 1-9 (valid country code)
    Returns (is_valid, error_message).
    """
    if not phone:
        if allow_empty:
            return True, None
        return False, 'Phone number is required'

    # Must be digits only
    if not phone.isdigit():
        return False, 'Phone must contain only digits (no +, spaces, or dashes)'

    # Must start with 1-9 (valid country code)
    if phone[0] == '0':
        return False, 'Phone must start with country code (e.g., 20 for Egypt, 1 for US)'

    # Length check: E.164 allows 7-15 digits (without '+')
    if len(phone) < 7 or len(phone) > 15:
        return False, f'Phone must be 7-15 digits, got {len(phone)}'

    return True, None


def normalize_and_validate(raw, allow_empty=False):
    """
    Combined clean + validate. Returns (cleaned_phone, is_valid, error_message).
    """
    cleaned = clean_phone(raw)
    if not cleaned:
        if allow_empty:
            return None, True, None
        return None, False, 'Phone number is required'
    is_valid, error = validate_phone(cleaned)
    return cleaned, is_valid, error
