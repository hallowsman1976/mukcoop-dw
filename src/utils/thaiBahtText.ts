/**
 * Utility to convert numeric amount to standard Thai Baht text (เช่น 1500.50 -> "หนึ่งพันห้าร้อยบาทห้าสิบสตางค์")
 */
export function thaiBahtText(numberInput: number | string): string {
  const num = typeof numberInput === 'string' ? parseFloat(numberInput.replace(/,/g, '')) : numberInput;
  
  if (isNaN(num) || num === null || num === undefined) {
    return 'ศูนย์บาทถ้วน';
  }

  if (num === 0) {
    return 'ศูนย์บาทถ้วน';
  }

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const [bahtStr, satangStrRaw] = absNum.toFixed(2).split('.');
  const satangStr = satangStrRaw || '00';

  const thaiDigits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const thaiPositions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  function convertGroup(digits: string): string {
    let result = '';
    const len = digits.length;

    for (let i = 0; i < len; i++) {
      const digit = parseInt(digits[i], 10);
      const pos = len - i - 1;

      if (digit !== 0) {
        if (pos === 0 && digit === 1 && len > 1 && parseInt(digits[len - 2], 10) !== 0) {
          result += 'เอ็ด';
        } else if (pos === 1 && digit === 2) {
          result += 'ยี่' + thaiPositions[pos];
        } else if (pos === 1 && digit === 1) {
          result += thaiPositions[pos];
        } else {
          result += thaiDigits[digit] + thaiPositions[pos];
        }
      }
    }
    return result;
  }

  function convertBaht(bahtNumberStr: string): string {
    if (bahtNumberStr === '0' || !bahtNumberStr) return '';
    let result = '';
    let remaining = bahtNumberStr;

    let groupCount = 0;
    while (remaining.length > 0) {
      const chunkLen = remaining.length % 6 || 6;
      const chunk = remaining.slice(0, chunkLen);
      remaining = remaining.slice(chunkLen);

      const chunkText = convertGroup(chunk);
      if (chunkText) {
        result += chunkText + (remaining.length > 0 ? 'ล้าน' : '');
      }
      groupCount++;
    }

    return result ? result + 'บาท' : '';
  }

  function convertSatang(satangNumberStr: string): string {
    const satang = parseInt(satangNumberStr, 10);
    if (satang === 0) return 'ถ้วน';

    const len = satangNumberStr.length;
    let result = '';

    for (let i = 0; i < len; i++) {
      const digit = parseInt(satangNumberStr[i], 10);
      const pos = len - i - 1;

      if (digit !== 0) {
        if (pos === 0 && digit === 1 && len > 1 && parseInt(satangNumberStr[0], 10) !== 0) {
          result += 'เอ็ด';
        } else if (pos === 1 && digit === 2) {
          result += 'ยี่สิบ';
        } else if (pos === 1 && digit === 1) {
          result += 'สิบ';
        } else {
          result += thaiDigits[digit] + (pos === 1 ? 'สิบ' : '');
        }
      }
    }

    return result ? result + 'สตางค์' : 'ถ้วน';
  }

  const bahtText = convertBaht(bahtStr);
  const satangText = convertSatang(satangStr);

  const fullText = (isNegative ? 'ลบ' : '') + (bahtText || 'ศูนย์บาท') + satangText;
  return fullText;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
