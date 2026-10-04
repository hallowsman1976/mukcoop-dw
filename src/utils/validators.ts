/**
 * Validates and pads Thai Member ID to 5 digits with leading zeros
 * e.g., "12" -> "00012", "428" -> "00428"
 */
export function padMemberId(val: string): string {
  const digitsOnly = val.replace(/\D/g, '');
  if (!digitsOnly) return '';
  if (digitsOnly.length >= 5) {
    return digitsOnly.slice(-5);
  }
  return digitsOnly.padStart(5, '0');
}

/**
 * Validates 13-digit Thai National ID (Check digit formula)
 */
export function isValidCitizenId(id: string): boolean {
  const cleaned = id.replace(/\D/g, '');
  if (cleaned.length !== 13) return false;

  // Check that not all digits are the same e.g. 0000000000000 or 1111111111111
  if (/^(\d)\1{12}$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i), 10) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(cleaned.charAt(12), 10);
}

/**
 * Format Thai Citizen ID into 1-XXXX-XXXXX-XX-X format
 */
export function formatCitizenId(id: string, mask: boolean = false): string {
  const cleaned = id.replace(/\D/g, '');
  if (cleaned.length !== 13) return id;

  if (mask) {
    return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 5)}-XXXXX-${cleaned.slice(10, 12)}-${cleaned.slice(12, 13)}`;
  }

  return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 5)}-${cleaned.slice(5, 10)}-${cleaned.slice(10, 12)}-${cleaned.slice(12, 13)}`;
}

/**
 * Cooperative account number: NN-NNNNN-N (e.g. 15-00003-0).
 * The first two digits are the product code, the middle five are the account
 * running number, and the last digit closes the number.
 */
export const ACCOUNT_PREFIX_REGULAR = '11'; // ออมทรัพย์
export const ACCOUNT_PREFIX_SPECIAL = '15'; // ออมทรัพย์พิเศษ

export function accountPrefixFor(type: string): string {
  return type === 'ออมทรัพย์พิเศษ' ? ACCOUNT_PREFIX_SPECIAL : ACCOUNT_PREFIX_REGULAR;
}

export function accountTypeFromNo(no: string): 'ออมทรัพย์' | 'ออมทรัพย์พิเศษ' {
  return no.replace(/\D/g, '').startsWith(ACCOUNT_PREFIX_SPECIAL) ? 'ออมทรัพย์พิเศษ' : 'ออมทรัพย์';
}

/**
 * Format Bank / Cooperative Account Number (e.g. 15-00003-0)
 */
export function formatAccountNo(no: string): string {
  const cleaned = no.replace(/\D/g, '');
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 7)}-${cleaned.slice(7, 8)}`;
  }
  return no;
}

/**
 * Validate maximum file size (5MB = 5 * 1024 * 1024 bytes)
 */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateFileSize(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `ขนาดไฟล์ (${sizeInMb} MB) เกินขีดจำกัดที่กำหนดไว้ไม่เกิน 5 MB`,
    };
  }
  return { valid: true };
}

/**
 * Format Date to Thai readable format
 */
export function formatThaiDateTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const thaiYear = date.getFullYear() + 543;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${thaiYear} ${hours}:${minutes} น.`;
}

/**
 * Format Date to Thai short date
 */
export function formatThaiDate(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const thaiYear = date.getFullYear() + 543;

  return `${day} ${month} ${thaiYear}`;
}

/**
 * Strict validator for Member ID:
 * Must be 1-5 digits. Automatically pads to 5 digits.
 */
export function isValidMemberId(raw: string): { valid: boolean; padded: string; error?: string } {
  if (!raw || !raw.trim()) {
    return { valid: false, padded: '', error: 'รหัสสมาชิกว่างเปล่า' };
  }
  const trimmed = raw.trim();
  if (/[^0-9]/.test(trimmed)) {
    return { valid: false, padded: '', error: 'รหัสสมาชิกต้องเป็นตัวเลขเท่านั้น (ห้ามมีตัวอักษรหรืออักขระพิเศษ)' };
  }
  if (trimmed.length > 5) {
    return { valid: false, padded: '', error: 'รหัสสมาชิกมีความยาวเกิน 5 หลัก' };
  }
  const padded = padMemberId(trimmed);
  return { valid: true, padded };
}

/**
 * Strict validator for Bank Account Number (e.g. 15-00003-0 or 8 digits).
 */
export function isValidAccountNo(
  rawAccNo: string
): { valid: boolean; formatted: string; error?: string } {
  if (!rawAccNo || !rawAccNo.trim()) {
    return { valid: false, formatted: '', error: 'หมายเลขบัญชีว่างเปล่า' };
  }
  const digitsOnly = rawAccNo.replace(/\D/g, '');
  if (digitsOnly.length !== 8) {
    return {
      valid: false,
      formatted: rawAccNo,
      error: `หมายเลขบัญชีต้องมี 8 หลักในรูปแบบ 00-00000-0 (พบ ${digitsOnly.length} หลัก)`,
    };
  }
  return { valid: true, formatted: formatAccountNo(digitsOnly) };
}
