import { Product, ProductCategory } from '../types';

/**
 * Standard Code 128B pattern table (107 symbols).
 * Each 6-character string represents widths of alternating bars and spaces.
 * e.g. '212222' -> bar: 2, space: 1, bar: 2, space: 2, bar: 2, space: 2
 */
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (106 is STOP with 7 elements)
];

const START_CODE_B = 104;
const STOP_CODE = 106;

/**
 * Category two-digit code for standard barcode numbering
 */
const CATEGORY_CODES: Record<string, string> = {
  SEEDS: '01',
  FERTILIZERS: '02',
  AGROCHEMICALS: '03',
  EQUIPMENT: '04',
  SEEDLINGS: '05',
  CROP_CARE: '06',
  IRRIGATION: '07',
  ANIMAL_HEALTH: '08'
};

/**
 * Calculate standard Modulo 10 check digit (EAN/UPC standard)
 */
export function calculateCheckDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const digit = parseInt(digits[i], 10);
    if (isNaN(digit)) continue;
    // Alternate weights 3 and 1 starting from right
    const weight = (digits.length - i) % 2 === 1 ? 3 : 1;
    sum += digit * weight;
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}

/**
 * Result of scanning a barcode (can match either main product or package variant)
 */
export interface ScannedBarcodeMatch {
  product: Product;
  variant?: {
    id: string;
    name: string;
    sizeKg?: number;
    barcode: string;
    sellingPrice: number;
    purchasePrice?: number;
    unit: any;
  };
  displayName: string;
  effectivePrice: number;
  effectiveUnit: any;
  matchedBarcode: string;
}

/**
 * Generate a unique 12-digit barcode with company prefix '200'
 */
export function generateUniqueBarcode(existingProducts: Product[] = [], category?: ProductCategory | string): string {
  const existingBarcodes = new Set<string>();
  
  existingProducts.forEach((p) => {
    if (p.barcode && p.barcode.trim()) {
      existingBarcodes.add(p.barcode.trim().toUpperCase());
    }
    if (p.packageVariants) {
      p.packageVariants.forEach((v) => {
        if (v.barcode && v.barcode.trim()) {
          existingBarcodes.add(v.barcode.trim().toUpperCase());
        }
      });
    }
  });

  const prefix = '200'; // Standard in-store internal prefix
  const catCode = category && CATEGORY_CODES[category] ? CATEGORY_CODES[category] : '01';

  let attempts = 0;
  while (attempts < 5000) {
    attempts++;
    // 6-digit random serial number padded
    const serial = Math.floor(100000 + Math.random() * 900000).toString();
    const base11 = `${prefix}${catCode}${serial}`;
    const checkDigit = calculateCheckDigit(base11);
    const candidate = `${base11}${checkDigit}`;

    if (!existingBarcodes.has(candidate.toUpperCase())) {
      return candidate;
    }
  }

  // Fallback timestamp-based barcode
  const timeSuffix = Date.now().toString().slice(-7);
  const baseFallback = `${prefix}${catCode}${timeSuffix}`;
  return `${baseFallback}${calculateCheckDigit(baseFallback)}`;
}

/**
 * Validates whether a barcode is unique across all other products and variants
 */
export function isBarcodeUnique(barcode: string, currentProductId: string, products: Product[], currentVariantId?: string): boolean {
  if (!barcode || !barcode.trim()) return true;
  const clean = barcode.trim().toUpperCase();

  for (const p of products) {
    if (p.id !== currentProductId && p.barcode && p.barcode.trim().toUpperCase() === clean) {
      return false;
    }
    if (p.packageVariants) {
      for (const v of p.packageVariants) {
        if (v.id !== currentVariantId && v.barcode && v.barcode.trim().toUpperCase() === clean) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Find product matching scanned code (matches barcode, SKU, or variant barcode)
 */
export function findProductByBarcode(code: string, products: Product[]): Product | undefined {
  if (!code || !code.trim()) return undefined;
  const clean = code.trim().toLowerCase();

  return products.find(
    (p) =>
      (p.barcode && p.barcode.trim().toLowerCase() === clean) ||
      (p.sku && p.sku.trim().toLowerCase() === clean) ||
      (p.packageVariants && p.packageVariants.some((v) => v.barcode && v.barcode.trim().toLowerCase() === clean))
  );
}

/**
 * Find detailed match (product + specific variant if applicable)
 */
export function findProductOrVariantByBarcode(code: string, products: Product[]): ScannedBarcodeMatch | undefined {
  if (!code || !code.trim()) return undefined;
  const clean = code.trim().toLowerCase();

  for (const p of products) {
    // Check variants first
    if (p.packageVariants && p.packageVariants.length > 0) {
      const matchedVariant = p.packageVariants.find(
        (v) => v.barcode && v.barcode.trim().toLowerCase() === clean
      );
      if (matchedVariant) {
        return {
          product: p,
          variant: matchedVariant,
          displayName: `${p.name} (${matchedVariant.name})`,
          effectivePrice: matchedVariant.sellingPrice,
          effectiveUnit: matchedVariant.unit,
          matchedBarcode: matchedVariant.barcode
        };
      }
    }

    // Check main product barcode or SKU
    if (
      (p.barcode && p.barcode.trim().toLowerCase() === clean) ||
      (p.sku && p.sku.trim().toLowerCase() === clean)
    ) {
      return {
        product: p,
        displayName: p.name,
        effectivePrice: p.sellingPrice,
        effectiveUnit: p.unit,
        matchedBarcode: p.barcode || p.sku
      };
    }
  }

  return undefined;
}

/**
 * Ensure all existing products have a valid unique barcode
 */
export function ensureProductsHaveBarcodes(products: Product[]): Product[] {
  const existingBarcodes = new Set<string>();

  return products.map((p, idx) => {
    let currentBarcode = p.barcode?.trim();
    if (currentBarcode && currentBarcode.length >= 4) {
      existingBarcodes.add(currentBarcode);
      return p;
    }

    // Generate deterministic barcode from index or SKU
    const catCode = p.category && CATEGORY_CODES[p.category] ? CATEGORY_CODES[p.category] : '01';
    const serial = (100000 + (idx + 1) * 7).toString().padStart(6, '0');
    const base = `200${catCode}${serial}`;
    const checkDigit = calculateCheckDigit(base);
    const generated = `${base}${checkDigit}`;

    existingBarcodes.add(generated);
    return {
      ...p,
      barcode: generated
    };
  });
}

/**
 * Encodes an ASCII string into Code 128B pattern
 */
export function encodeCode128B(text: string): { modules: number[]; checkValue: number } | null {
  if (!text || text.length === 0) return null;

  const codes: number[] = [START_CODE_B];
  let checkSum = START_CODE_B;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    // Code 128B represents ASCII 32 to 127
    const val = charCode - 32;
    if (val < 0 || val > 95) {
      // Out of standard 128B printable ASCII range; map to space or fallback
      codes.push(0);
      checkSum += (i + 1) * 0;
    } else {
      codes.push(val);
      checkSum += (i + 1) * val;
    }
  }

  const checkValue = checkSum % 103;
  codes.push(checkValue);
  codes.push(STOP_CODE);

  // Convert codes to continuous binary module widths
  const modules: number[] = [];
  codes.forEach((code) => {
    const pattern = CODE128_PATTERNS[code];
    if (!pattern) return;

    let isBar = true;
    for (let j = 0; j < pattern.length; j++) {
      const width = parseInt(pattern[j], 10);
      for (let w = 0; w < width; w++) {
        modules.push(isBar ? 1 : 0);
      }
      isBar = !isBar;
    }
  });

  return { modules, checkValue };
}

/**
 * Pure SVG Code 128 barcode generator
 * Produces crisp, vector-sharp barcode at any resolution
 */
export function renderCode128Svg(
  value: string,
  options?: {
    height?: number;
    barWidth?: number;
    showText?: boolean;
    fontSize?: number;
    barColor?: string;
    bgColor?: string;
    quietZone?: number;
  }
): string {
  const height = options?.height || 50;
  const barWidth = options?.barWidth || 1.8;
  const showText = options?.showText !== false;
  const fontSize = options?.fontSize || 11;
  const barColor = options?.barColor || '#111827';
  const bgColor = options?.bgColor || 'transparent';
  const quietZone = options?.quietZone || 10;

  const encoded = encodeCode128B(value);
  if (!encoded) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="${height}"><text x="10" y="25" fill="#ef4444" font-size="10">Invalid barcode</text></svg>`;
  }

  const totalModules = encoded.modules.length;
  const totalBarWidth = totalModules * barWidth;
  const svgWidth = totalBarWidth + quietZone * 2;
  const textHeight = showText ? fontSize + 4 : 0;
  const svgHeight = height + textHeight;

  let rects = '';
  let inBar = false;
  let barStartModule = 0;

  for (let i = 0; i < totalModules; i++) {
    const isBar = encoded.modules[i] === 1;

    if (isBar && !inBar) {
      inBar = true;
      barStartModule = i;
    } else if (!isBar && inBar) {
      inBar = false;
      const x = quietZone + barStartModule * barWidth;
      const w = (i - barStartModule) * barWidth;
      rects += `<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${height}" fill="${barColor}" />`;
    }
  }

  // Handle final bar if ending on a bar
  if (inBar) {
    const x = quietZone + barStartModule * barWidth;
    const w = (totalModules - barStartModule) * barWidth;
    rects += `<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${height}" fill="${barColor}" />`;
  }

  const textElement = showText
    ? `<text x="${(svgWidth / 2).toFixed(2)}" y="${(height + fontSize + 2).toFixed(
        2
      )}" text-anchor="middle" font-family="monospace, Courier" font-size="${fontSize}" font-weight="bold" fill="${barColor}" letter-spacing="1.5">${value}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth.toFixed(2)} ${svgHeight.toFixed(
    2
  )}" width="${svgWidth.toFixed(2)}" height="${svgHeight.toFixed(
    2
  )}" style="background:${bgColor};display:block;max-width:100%;height:auto">${rects}${textElement}</svg>`;
}

/**
 * Web Audio API synthesizer for instant scan feedback tones (works 100% offline)
 */
export function playScanFeedbackSound(type: 'success' | 'error' | 'warning' = 'success'): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'success') {
      // High-pitched pleasant double chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.setValueAtTime(1760, now + 0.08); // A6
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'error') {
      // Low buzz error tone
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(140, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else {
      // Warning single tone
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (_e) {
    // Audio context may be restricted by autoplay policy; silent ignore
  }
}
