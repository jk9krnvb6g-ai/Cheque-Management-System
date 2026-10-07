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
  fontFamily?: string;
  onComplete?: () => void;
}

export function printChequeElement(
  element: HTMLElement,
  options: PrintChequeOptions = {}
): void {
  // Clone element to prevent mutating original React tree
  const clone = element.cloneNode(true) as HTMLElement;

  // Remove screen-only badges and control ribbons
  const screenOnly = clone.querySelectorAll('.no-print');
  screenOnly.forEach((el) => el.remove());

  // Handle test sheet vs real print
  if (!options.isTestSheet) {
    const bgGuides = clone.querySelectorAll('.cheque-background-guide, .test-sheet-guide');
    bgGuides.forEach((el) => el.remove());
  }

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
  iframe.style.width = '1000px';
  iframe.style.height = '1000px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    // Fallback: standard window.print without destroying modal
    document.body.classList.add(options.isTestSheet ? 'printing-test-sheet' : 'printing-cheque');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-cheque', 'printing-test-sheet');
        options.onComplete?.();
      }, 500);
    }, 150);
    return;
  }

  const fontCss = options.fontFamily || "'Sarabun', 'TH Sarabun New', 'Cordia New', sans-serif";

  // Clean clone style for print
  clone.style.border = options.isTestSheet ? '1.5px dashed #334155' : 'none';
  clone.style.boxShadow = 'none';
  clone.style.background = options.isTestSheet ? '#ffffff' : 'transparent';
  clone.style.margin = '0';
  clone.style.padding = '0';

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
          @page {
            margin: 0 !important;
            size: auto;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            font-family: ${fontCss} !important;
          }
          .cheque-field-text {
            font-family: ${fontCss} !important;
            line-height: 1 !important;
            padding: 0 !important;
            margin: 0 !important;
            color: #000000 !important;
            font-weight: 600 !important;
          }
          .tabular-nums {
            font-variant-numeric: tabular-nums;
          }
          #cheque-print-zone.feed-portrait-top {
            transform: rotate(90deg) translate(0, -100%) !important;
            transform-origin: 0 0 !important;
          }
          #cheque-print-zone.feed-portrait-bottom {
            transform: rotate(270deg) translate(-100%, 0) !important;
            transform-origin: 0 0 !important;
          }
          #cheque-print-zone.feed-landscape-flipped {
            transform: rotate(180deg) translate(-100%, -100%) !important;
            transform-origin: 0 0 !important;
          }
          ${options.isTestSheet ? `
            .test-sheet-guide {
              display: block !important;
              visibility: visible !important;
            }
          ` : `
            .test-sheet-guide, .cheque-background-guide {
              display: none !important;
              visibility: hidden !important;
            }
          `}
        </style>
      </head>
      <body>
        ${clone.outerHTML}
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
      document.body.classList.add(options.isTestSheet ? 'printing-test-sheet' : 'printing-cheque');
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
