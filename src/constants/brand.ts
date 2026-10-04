export const SYSTEM_NAME = 'ระบบฝาก-ถอนเงินออนไลน์';
// Fallbacks used until (or unless) the Settings sheet provides cooperativeName / logoUrl.
export const COOP_NAME = 'สหกรณ์ออมทรัพย์สาธารณสุขจังหวัดมุกดาหาร จำกัด';
export const COOP_LOGO_SRC = '/logo.svg';

const BRAND_CACHE_KEY = 'coop_brand_v1';

export function readCachedBrand(): { logoUrl: string; coopName: string } {
  try {
    const raw = localStorage.getItem(BRAND_CACHE_KEY);
    const b = raw ? JSON.parse(raw) : {};
    return { logoUrl: String(b.logoUrl || ''), coopName: String(b.coopName || '') };
  } catch {
    return { logoUrl: '', coopName: '' };
  }
}

export function cacheBrand(logoUrl: string, coopName: string) {
  try {
    localStorage.setItem(BRAND_CACHE_KEY, JSON.stringify({ logoUrl, coopName }));
  } catch {
    // storage unavailable: splash falls back to the bundled logo
  }
}
