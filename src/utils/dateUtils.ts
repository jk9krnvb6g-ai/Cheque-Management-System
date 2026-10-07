/**
 * Date utilities with Thai Buddhist Era (พ.ศ.) support
 */

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

/**
 * Converts a Date object or ISO string to Thai Buddhist date format (DD/MM/YYYY พ.ศ.)
 * e.g. "02/10/2569"
 */
export function formatThaiDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const thaiYear = d.getFullYear() + 543;

  return `${day}/${month}/${thaiYear}`;
}

/**
 * Returns formatted short date with 2-digit year (e.g. "02/10/69")
 */
export function formatThaiShortDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const thaiYear = String(d.getFullYear() + 543).slice(-2);

  return `${day}/${month}/${thaiYear}`;
}

/**
 * Returns formatted date with short month (e.g. "02 ต.ค. 2569")
 */
export function formatThaiDateWithMonth(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';

  const day = d.getDate();
  const month = THAI_MONTHS_SHORT[d.getMonth()];
  const thaiYear = d.getFullYear() + 543;

  return `${day} ${month} ${thaiYear}`;
}

/**
 * Returns formatted date & time in Thai (e.g. "02/10/2569 10:35 น.")
 */
export function formatThaiDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';

  const dateStr = formatThaiDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${dateStr} ${hours}:${minutes} น.`;
}

/**
 * Returns today's ISO date string in YYYY-MM-DD
 */
export function getTodayISODate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns Thai fiscal year (ปีงบประมาณ)
 * Oct 1 (year) to Sep 30 (year+1) belongs to year+1
 * Also supports parsing from dikaNumber suffix (e.g. 123/69 -> 2569)
 */
export function getThaiFiscalYear(dateInput?: string | Date | null, dikaNumber?: string | null): number {
  if (dikaNumber) {
    const match = dikaNumber.trim().match(/\/(\d{2,4})$/);
    if (match) {
      const yearPart = parseInt(match[1], 10);
      if (yearPart < 100) {
        return 2500 + yearPart;
      }
      return yearPart;
    }
  }
  const d = typeof dateInput === 'string' ? new Date(dateInput) : (dateInput || new Date());
  if (isNaN(d.getTime())) return new Date().getFullYear() + 543;
  const month = d.getMonth(); // 0-indexed, 9 = Oct
  const year = d.getFullYear();
  const fiscalYearAD = month >= 9 ? year + 1 : year;
  return fiscalYearAD + 543;
}

/**
 * Returns date range for Thai Fiscal Year (1 ต.ค. - 30 ก.ย.)
 */
export function getFiscalYearRange(targetFiscalYearBE?: number): { start: string; end: string } {
  const currentFiscalBE = targetFiscalYearBE || getThaiFiscalYear();
  const startAD = currentFiscalBE - 543 - 1;
  const endAD = currentFiscalBE - 543;

  return {
    start: `${startAD}-10-01`,
    end: `${endAD}-09-30`,
  };
}

/**
 * Formats cheque date for physical bank cheque printing
 * Format: DD  MM  YYYY (or 2-digit YYYY)
 * e.g. "02  10  2569"
 */
export function formatChequePrintDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const thaiYear = String(d.getFullYear() + 543);

  return `${day}  ${month}  ${thaiYear}`;
}
