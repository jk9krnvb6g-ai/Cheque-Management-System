/**
 * Production-ready printing utility for cheques and vouchers.
 * Uses an isolated, dedicated print container / iframe to ensure 100% reliable printing
 * even inside iframes, across all browsers (Chrome, Firefox, Safari, Edge),
 * preventing premature unmounting and blank page issues.
 */

export interface PrintChequeOptions {
  title?: string;
  widthMm?: number;
  heightMm?: number;
  feedDirection?: string;
  isTestSheet?: boolean;
  bankName?: string;
  fontFamily?: string;
  onComplete?: () => void;
}

export function printChequeElement(
  element: HTMLElement,
  options: PrintChequeOptions = {}
): void {
  const widthMm = options.widthMm || 241;
  const heightMm = options.heightMm || 90;
  const bankName = options.bankName || 'ธนาคาร';
  const isTestSheet = Boolean(options.isTestSheet);
  const fontCss = options.fontFamily || "'Sarabun', 'TH Sarabun New', 'Cordia New', sans-serif";

  // Clone element to prevent mutating original React tree
  const clone = element.cloneNode(true) as HTMLElement;

  // Remove screen-only badges and control ribbons
  const screenOnly = clone.querySelectorAll('.no-print, button, input');
  screenOnly.forEach((el) => el.remove());

  // ALWAYS remove background guide (SVG waves, scanned images, huge logos)
  // to ensure crystal-clear print without giant bloated SVGs
  const bgGuides = clone.querySelectorAll('.cheque-background-guide');
  bgGuides.forEach((el) => el.remove());

  // Remove existing print frames if any
  const oldFrame = document.getElementById('cheque-print-frame');
  if (oldFrame && document.body.contains(oldFrame)) {
    document.body.removeChild(oldFrame);
  }

  // Create isolated hidden iframe for printing
  const iframe = document.createElement('iframe');
  iframe.id = 'cheque-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '1200px';
  iframe.style.height = '1200px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.classList.add(isTestSheet ? 'printing-test-sheet' : 'printing-cheque');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-cheque', 'printing-test-sheet');
        options.onComplete?.();
      }, 500);
    }, 150);
    return;
  }

  // Clean clone style for print
  clone.style.boxShadow = 'none';
  clone.style.margin = '0';
  clone.style.padding = '0';
  clone.style.position = 'relative';
  clone.style.width = `${widthMm}mm`;
  clone.style.height = `${heightMm}mm`;
  clone.style.boxSizing = 'border-box';
  clone.style.transform = 'none'; // reset screen zoom/rotation in print

  if (!isTestSheet) {
    // REAL CHEQUE: completely transparent, no borders, only ink
    clone.style.border = 'none';
    clone.style.background = 'transparent';
    const testGuides = clone.querySelectorAll('.test-sheet-guide');
    testGuides.forEach((el) => el.remove());
  } else {
    // A4 TEST SHEET: visible dashed boundary for alignment
    clone.style.border = '1.5px dashed #1e293b';
    clone.style.background = '#ffffff';
  }

  // Generate content HTML
  let bodyContent = '';
  let pageStyle = '';

  if (isTestSheet) {
    // =========================================================================
    // 1. A4 TEST PRINT SHEET (ขนาดกระดาษ A4 แนวตั้ง 210 × 297 มม. พอดี 1 หน้า)
    // =========================================================================
    pageStyle = `
      @page {
        size: A4 portrait;
        margin: 0 !important;
      }
      html, body {
        width: 210mm !important;
        height: 297mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
    `;

    bodyContent = `
      <div style="width: 210mm; min-height: 297mm; max-height: 297mm; margin: 0 auto; box-sizing: border-box; padding: 10mm 12mm; background: #ffffff; position: relative; font-family: ${fontCss}; color: #0f172a; overflow: hidden;">
        <!-- Header Information -->
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <div style="font-size: 15pt; font-weight: 800; color: #991b1b; letter-spacing: -0.5px;">
              📄 แผ่นทดสอบพิมพ์สำหรับทาบตำแหน่งเช็คจริง (A4 Test Sheet)
            </div>
            <div style="font-size: 9pt; font-weight: 600; color: #475569;">
              ขนาดกระดาษ: A4 (210 × 297 มม.)
            </div>
          </div>
          <div style="display: flex; gap: 16px; font-size: 9pt; color: #334155; margin-top: 3px;">
            <span><strong>ธนาคาร:</strong> ${bankName}</span>
            <span><strong>ขนาดเช็คจริง:</strong> ${widthMm} × ${heightMm} มม.</span>
            <span><strong>วันที่พิมพ์ทดสอบ:</strong> ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div style="font-size: 8.5pt; color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 4px; padding: 4px 8px; margin-top: 5px; line-height: 1.35;">
            💡 <strong>วิธีใช้งาน:</strong> นำเช็คกระดาษจริงของธนาคารมาวางทาบลงบนกรอบสี่เหลี่ยมเส้นประด้านล่าง โดยจัดให้ <strong>"มุมบนซ้าย"</strong> ตรงกับเครื่องหมาย ┌ แล้วยกส่องกับแสงสว่าง เพื่อตรวจสอบว่าข้อความแต่ละจุด (วันที่, สั่งจ่าย, ตัวอักษร, ตัวเลข) ตกตรงช่องของเช็คจริงหรือไม่
          </div>
        </div>

        <!-- Cheque Outline Box & Text Container -->
        <div style="position: relative; width: ${widthMm}mm; height: ${heightMm}mm; margin: 6px 0 10px 0; border: 1.5px dashed #0f172a; box-sizing: border-box; background: #ffffff;">
          <!-- Corner Markers -->
          <div style="position: absolute; left: 2px; top: 2px; font-size: 8pt; font-weight: 800; color: #991b1b; background: rgba(255,255,255,0.9); padding: 1px 4px; border: 1px solid #cbd5e1; border-radius: 2px; z-index: 50;">
            ┌ วางมุมบนซ้ายของเช็คจริงที่มุมนี้ (${widthMm} × ${heightMm} มม.)
          </div>
          <div style="position: absolute; right: -5px; top: -7px; font-size: 11pt; font-weight: 900; color: #334155;">┼</div>
          <div style="position: absolute; left: -5px; bottom: -7px; font-size: 11pt; font-weight: 900; color: #334155;">┼</div>
          <div style="position: absolute; right: -5px; bottom: -7px; font-size: 11pt; font-weight: 900; color: #334155;">┼</div>

          <!-- Millimeter Ruler Header on Top -->
          <div style="position: absolute; left: 0; top: 0; right: 0; height: 12px; border-bottom: 1px dotted #94a3b8; display: flex; justify-content: space-between; font-size: 6.5pt; font-family: monospace; color: #64748b; padding: 0 4px; pointer-events: none;">
            <span>| 0mm</span>
            <span>| 50mm</span>
            <span>| 100mm</span>
            <span>| 150mm</span>
            <span>| 200mm</span>
            <span>| ${widthMm}mm</span>
          </div>

          <!-- Inside Cloned Cheque Print Zone -->
          ${clone.innerHTML}
        </div>

        <!-- Verification Checklist Footer -->
        <div style="border-top: 1.5px solid #cbd5e1; padding-top: 8px; margin-top: 4px; font-size: 8.5pt; color: #334155;">
          <div style="font-weight: 800; color: #0f172a; margin-bottom: 4px;">
            ✓ รายการตรวจสอบความตรงช่องก่อนพิมพ์เช็คจริง (Alignment Checklist):
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 8pt;">
            <div>[ &nbsp; ] <strong>1. วันที่ (Date):</strong> ตรงช่องกรอบวันที่ มุมบนขวา</div>
            <div>[ &nbsp; ] <strong>2. สั่งจ่าย (Payee):</strong> ตรงบรรทัด "จ่าย / Pay"</div>
            <div>[ &nbsp; ] <strong>3. ตัวอักษร (Baht Text):</strong> ตรงบรรทัด "จำนวนเงิน / The sum of"</div>
            <div>[ &nbsp; ] <strong>4. ตัวเลข (Numeric):</strong> ตรงช่องสี่เหลี่ยมจำนวนเงินด้านขวา</div>
            <div>[ &nbsp; ] <strong>5. ขีดฆ่า "หรือผู้ถือ":</strong> เส้นขีดฆ่าทับคำว่า "หรือผู้ถือ" พอดี</div>
            <div>[ &nbsp; ] <strong>6. การขีดคร่อม (Crossing):</strong> เส้นคู่ขนานมุมบนซ้ายถูกต้อง</div>
          </div>
          <div style="margin-top: 6px; font-size: 7.5pt; color: #64748b; font-style: italic;">
            * หากตำแหน่งมีระยะคลาดเคลื่อน สามารถปรับแก้ระยะ X, Y (มิลลิเมตร) ในหน้าต่างตั้งค่าพิกัดเช็คของระบบได้ทันที
          </div>
        </div>
      </div>
    `;
  } else {
    // =========================================================================
    // 2. REAL CHEQUE PRINT (พิมพ์ลงบนตัวเช็คจริง ไม่แสดงเส้นประหรือกระดาษ A4)
    // =========================================================================
    pageStyle = `
      @page {
        size: ${widthMm}mm ${heightMm}mm landscape;
        margin: 0 !important;
      }
      html, body {
        width: ${widthMm}mm !important;
        height: ${heightMm}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
      }
    `;

    bodyContent = `
      <div id="cheque-print-zone" style="position: relative; width: ${widthMm}mm; height: ${heightMm}mm; box-sizing: border-box; margin: 0; padding: 0; background: transparent; overflow: hidden; font-family: ${fontCss};">
        ${clone.innerHTML}
      </div>
    `;
  }

  doc.open();
  doc.write(`
    <!doctype html>
    <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>${options.title || 'พิมพ์เช็ค'}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&family=Prompt:wght@400;500;600;700&family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          ${pageStyle}
          * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* สำคัญมาก: กำหนด position: absolute ให้ทุกองค์ประกอบข้อความในเช็ค เพื่อให้อ่านพิกัด left/top (มม.) ได้อย่างแม่นยำ */
          .cheque-field-text,
          .absolute {
            position: absolute !important;
            display: block !important;
            white-space: nowrap !important;
            box-sizing: border-box !important;
            font-family: ${fontCss} !important;
            line-height: 1 !important;
            color: #000000 !important;
          }
          .font-bold {
            font-weight: 700 !important;
          }
          .font-semibold {
            font-weight: 600 !important;
          }
          .tabular-nums {
            font-variant-numeric: tabular-nums !important;
          }
          .whitespace-nowrap {
            white-space: nowrap !important;
          }
          .pointer-events-none {
            pointer-events: none !important;
          }
          .leading-none {
            line-height: 1 !important;
          }
          .tracking-wider {
            letter-spacing: 0.05em !important;
          }
          /* ซ่อนรูปภาพและพื้นหลังที่ไม่จำเป็นในการพิมพ์ */
          .no-print,
          .cheque-background-guide,
          button,
          input {
            display: none !important;
            visibility: hidden !important;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `);
  doc.close();

  // Allow fonts and styles to render before triggering print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn('Iframe print error, falling back to window.print', e);
      document.body.classList.add(isTestSheet ? 'printing-test-sheet' : 'printing-cheque');
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-cheque', 'printing-test-sheet');
      }, 500);
    }

    options.onComplete?.();

    // Clean up iframe after print dialog completes
    setTimeout(() => {
      try {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      } catch {}
    }, 6000);
  }, 450);
}

/**
 * Print A4 documents such as Payment Vouchers or Executive Reports
 */
export function printDocumentElement(
  element: HTMLElement,
  options: { title?: string; onComplete?: () => void } = {}
): void {
  const clone = element.cloneNode(true) as HTMLElement;

  const screenOnly = clone.querySelectorAll('.no-print, button, .print\\:hidden');
  screenOnly.forEach((el) => el.remove());

  const oldFrame = document.getElementById('document-print-frame');
  if (oldFrame && document.body.contains(oldFrame)) {
    document.body.removeChild(oldFrame);
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'document-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '1000px';
  iframe.style.height = '1000px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    options.onComplete?.();
    return;
  }

  doc.open();
  doc.write(`
    <!doctype html>
    <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>${options.title || 'เอกสาร'}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&family=Prompt:wght@400;500;600;700&family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page {
            margin: 10mm 15mm !important;
            size: A4 portrait;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            font-family: 'Prompt', 'Sarabun', system-ui, sans-serif !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
        </style>
      </head>
      <body>
        ${clone.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    }
    options.onComplete?.();
    setTimeout(() => {
      try {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      } catch {}
    }, 6000);
  }, 500);
}
