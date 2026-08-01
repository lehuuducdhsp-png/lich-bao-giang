const CONFIG = Object.freeze({
  SPREADSHEET_ID: '1UY2drdncRS-4E61ZjVPqC6NNnK6cXr62gkJs1rEWGYI',
  ALLOWED_ORIGIN: 'https://lehuuducdhsp-png.github.io',
  ACCESS_KEY: 'LBG-2026-DUC-7c83mP9q'
});

/** Trang kiểm tra kết nối. Việc lưu thật được thực hiện bằng doPost. */
function doGet() {
  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Kết nối Lịch Báo giảng</title>
</head>
<body style="font-family:Arial,sans-serif;padding:20px">
  <p>Kết nối Google Sheets đã sẵn sàng.</p>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Kết nối Lịch Báo giảng')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Nhận dữ liệu từ biểu mẫu POST của website và lưu vào Google Sheets. */
function doPost(e) {
  let requestId = '';

  try {
    const params = e && e.parameter ? e.parameter : {};
    requestId = String(params.requestId || '');

    let payload = {};
    const rawPayload = String(params.payload || params.data || '').trim();

    if (rawPayload) {
      payload = JSON.parse(rawPayload);
    } else if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    if (!payload.accessKey && params.accessKey) {
      payload.accessKey = params.accessKey;
    }

    const result = saveReport(payload);
    return buildPostResponse_(requestId, true, result, '');
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    return buildPostResponse_(requestId, false, null, message);
  }
}

function buildPostResponse_(requestId, success, result, errorMessage) {
  const origin = JSON.stringify(CONFIG.ALLOWED_ORIGIN);
  const packet = JSON.stringify({
    type: success ? 'LBG_SAVE_RESULT' : 'LBG_ERROR',
    requestId: String(requestId || ''),
    success: Boolean(success),
    result: result || null,
    error: errorMessage || ''
  }).replace(/</g, '\\u003c');

  const statusText = success
    ? (result && result.message ? result.message : 'Đã lưu vào Google Sheets.')
    : ('Không thể lưu: ' + (errorMessage || 'Lỗi không xác định.'));

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Kết quả lưu Lịch Báo giảng</title>
</head>
<body style="font-family:Arial,sans-serif;padding:20px">
  <p>${escapeHtml_(statusText)}</p>
  <script>
    const ALLOWED_ORIGIN = ${origin};
    const MESSAGE = ${packet};
    let targetWindow = null;
    try {
      targetWindow = window.opener || (window.top && window.top.opener);
    } catch (error) {}
    if (targetWindow) targetWindow.postMessage(MESSAGE, ALLOWED_ORIGIN);
    setTimeout(function () { try { window.close(); } catch (error) {} }, 1400);
  <\/script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Kết quả lưu Lịch Báo giảng')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Chạy thủ công một lần để cấp quyền cho dự án. */
function capQuyenLanDau() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  Logger.log('Đã kết nối: ' + spreadsheet.getName());
}

/**
 * Dữ liệu website gửi lên có dạng:
 * {
 *   accessKey, mode, schoolYearStart, weekNumber, teacherName,
 *   startDate, endDate, total, entries[], gaValues
 * }
 */
function saveReport(payload) {
  validatePayload_(payload);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const baseSheetName = makeBaseSheetName_(payload.weekNumber, payload.sheetName);
    const mode = String(payload.mode || 'replace').toLowerCase();
    const sheetName = resolveSheetName_(spreadsheet, baseSheetName, mode);

    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) sheet = spreadsheet.insertSheet(sheetName);

    buildReportSheet_(sheet, payload);
    updateIndex_(spreadsheet, sheet, payload);
    spreadsheet.setActiveSheet(sheet);

    return {
      ok: true,
      sheetName: sheetName,
      total: Number(payload.total || 0),
      url: spreadsheet.getUrl() + '#gid=' + sheet.getSheetId(),
      message: 'Đã lưu ' + sheetName + ' vào Google Sheets.'
    };
  } finally {
    lock.releaseLock();
  }
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Dữ liệu gửi lên không hợp lệ.');
  }
  if (String(payload.accessKey || '') !== CONFIG.ACCESS_KEY) {
    throw new Error('Mã kết nối không đúng.');
  }
  if (!payload.teacherName) {
    throw new Error('Thiếu tên giáo viên.');
  }
  if (!Array.isArray(payload.entries)) {
    throw new Error('Thiếu dữ liệu thời khóa biểu.');
  }
  if (!payload.entries.length) {
    throw new Error('Không có tiết nào để lưu.');
  }
}

function makeBaseSheetName_(weekNumber, fallbackName) {
  const cleanFallback = sanitizeSheetName_(fallbackName || '');
  if (cleanFallback) return cleanFallback;

  const week = Number(weekNumber);
  if (Number.isFinite(week) && week > 0) {
    return 'TUẦN ' + String(Math.floor(week)).padStart(2, '0');
  }

  return 'TUẦN MỚI';
}

function resolveSheetName_(spreadsheet, baseName, mode) {
  if (!spreadsheet.getSheetByName(baseName)) return baseName;
  if (mode !== 'new' && mode !== 'copy') return baseName;

  let version = 2;
  let candidate = baseName + ' - BẢN ' + version;
  while (spreadsheet.getSheetByName(candidate)) {
    version += 1;
    candidate = baseName + ' - BẢN ' + version;
  }
  return candidate;
}

function sanitizeSheetName_(name) {
  return String(name || '')
    .replace(/[\\/?*\[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
}

function buildReportSheet_(sheet, payload) {
  ensureGridSize_(sheet, 30, 12);
  sheet.clear();
  sheet.setHiddenGridlines(true);
  sheet.setFrozenRows(4);

  const yearStart = Number(payload.schoolYearStart || payload.yearStart || new Date().getFullYear());
  const yearEnd = yearStart + 1;
  const weekNumber = Number(payload.weekNumber || 0);
  const startText = formatDate_(payload.startDate);
  const endText = formatDate_(payload.endDate);

  const title = 'LỊCH BÁO GIẢNG NĂM HỌC ' + yearStart + ' - ' + yearEnd;
  const weekTitle = weekNumber > 0 ? 'Tuần ' + weekNumber : 'Tuần';
  const dateTitle = startText && endText
    ? '(Từ ngày ' + startText + ' đến ngày ' + endText + ')'
    : '(Chưa xác định thời gian)';

  sheet.getRange('A1:H17').breakApart();
  sheet.getRange('A1:H17').clear({ contentsOnly: false });

  sheet.getRange('A1:H1').merge().setValue(title);
  sheet.getRange('A2:H2').merge().setValue(weekTitle);
  sheet.getRange('A3:H3').merge().setValue(dateTitle);

  sheet.getRange('A4:H4').setValues([[
    'Buổi', 'Tiết', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'
  ]]);

  sheet.getRange('A5:A10').merge().setValue('Sáng');
  sheet.getRange('A11:A16').merge().setValue('Chiều');

  const days = [2, 3, 4, 5, 6, 7];
  const sessions = [
    { name: 'Sáng', schoolRow: 5, firstPeriodRow: 6 },
    { name: 'Chiều', schoolRow: 11, firstPeriodRow: 12 }
  ];

  sessions.forEach(function (session) {
    sheet.getRange(session.schoolRow, 2).setValue('Tiết');

    for (let period = 1; period <= 5; period += 1) {
      sheet.getRange(session.firstPeriodRow + period - 1, 2).setValue('Tiết ' + period);
    }

    days.forEach(function (dayNumber, dayIndex) {
      const column = dayIndex + 3;
      const dayEntries = payload.entries.filter(function (entry) {
        return Number(entry.day) === dayNumber && String(entry.session) === session.name;
      });

      const schools = unique_(dayEntries.map(function (entry) {
        return String(entry.school || '').trim();
      }).filter(Boolean));

      const schoolText = schools.length
        ? schools.join(' / ') + '\n' + schools.map(function (schoolName) {
            const gaValue = getGaValue_(payload, dayNumber, session.name, schoolName);
            return '(GA ' + gaValue + ')';
          }).join(' / ')
        : '';

      sheet.getRange(session.schoolRow, column).setValue(schoolText);

      for (let period = 1; period <= 5; period += 1) {
        const slotEntries = dayEntries.filter(function (entry) {
          return Number(entry.period) === period;
        });
        const range = sheet.getRange(session.firstPeriodRow + period - 1, column);
        setClassRichText_(range, slotEntries, schools[0] || '');
      }
    });
  });

  sheet.getRange('A17:D17').merge().setValue('TỔNG: ' + Number(payload.total || payload.entries.length) + ' tiết');
  sheet.getRange('E17:H17').merge().setValue('Giáo viên: ' + String(payload.teacherName));

  formatReport_(sheet);
}


/**
 * Lấy số giáo án đã nhập trên website theo khóa:
 *   thứ|buổi|trường, ví dụ: 2|Chiều|QUANG TRUNG
 * Nếu chưa nhập thì trả về chuỗi rỗng để hiển thị (GA  ).
 */
function getGaValue_(payload, dayNumber, sessionName, schoolName) {
  const source = payload && (payload.gaValues || payload.lessonPlanCounts);
  if (!source || typeof source !== 'object') return '';

  const key = String(Number(dayNumber)) + '|' + String(sessionName || '') + '|' + String(schoolName || '');
  if (!Object.prototype.hasOwnProperty.call(source, key)) return '';

  const raw = String(source[key] == null ? '' : source[key]).trim();
  if (!/^\d+$/.test(raw)) return '';

  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return '';
  return String(Math.floor(value));
}

function setClassRichText_(range, entries, primarySchool) {
  if (!entries.length) {
    range.clearContent();
    return;
  }

  const pieces = [];
  entries.forEach(function (entry, index) {
    if (index > 0) pieces.push({ text: ' & ', red: false });
    pieces.push({
      text: String(entry.className || '').trim(),
      red: Boolean(primarySchool && String(entry.school || '').trim() !== primarySchool)
    });
  });

  const fullText = pieces.map(function (piece) { return piece.text; }).join('');
  const builder = SpreadsheetApp.newRichTextValue().setText(fullText);
  let cursor = 0;

  pieces.forEach(function (piece) {
    const end = cursor + piece.text.length;
    const style = SpreadsheetApp.newTextStyle()
      .setFontFamily('Times New Roman')
      .setFontSize(12)
      .setForegroundColor(piece.red ? '#ff0000' : '#000000')
      .build();
    if (end > cursor) builder.setTextStyle(cursor, end, style);
    cursor = end;
  });

  range.setRichTextValue(builder.build());
}

function formatReport_(sheet) {
  const greenTitle = '#b9e6a5';
  const greenBody = '#dff5e4';
  const peach = '#f6c9ae';
  const black = '#000000';

  sheet.getRange('A1:H17')
    .setFontFamily('Times New Roman')
    .setFontSize(12)
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('center')
    .setWrap(true);

  sheet.getRange('A1:H3').setBackground(greenTitle);
  sheet.getRange('A4:H4').setBackground(peach).setFontWeight('bold');
  sheet.getRange('A5:H16').setBackground(greenBody);
  sheet.getRange('A5:B16').setBackground(peach).setFontWeight('bold');
  sheet.getRange('A17:H17').setBackground(greenTitle).setFontWeight('bold');

  sheet.getRange('A1:H1').setFontSize(20).setFontWeight('normal');
  sheet.getRange('A2:H2').setFontSize(16).setFontWeight('normal');
  sheet.getRange('A3:H3').setFontSize(14).setFontWeight('normal');
  sheet.getRange('C5:H5').setFontWeight('bold');
  sheet.getRange('C11:H11').setFontWeight('bold');
  sheet.getRange('E17:H17').setFontStyle('italic');

  const borderRange = sheet.getRange('A1:H17');
  borderRange.setBorder(true, true, true, true, true, true, black, SpreadsheetApp.BorderStyle.SOLID);

  sheet.setColumnWidth(1, 80);
  sheet.setColumnWidth(2, 90);
  for (let column = 3; column <= 8; column += 1) {
    sheet.setColumnWidth(column, 150);
  }

  sheet.setRowHeight(1, 35);
  sheet.setRowHeight(2, 28);
  sheet.setRowHeight(3, 28);
  sheet.setRowHeight(4, 50);
  sheet.setRowHeight(5, 52);
  sheet.setRowHeight(11, 52);
  for (let row = 6; row <= 10; row += 1) sheet.setRowHeight(row, 30);
  for (let row = 12; row <= 16; row += 1) sheet.setRowHeight(row, 30);
  sheet.setRowHeight(17, 34);
}

function updateIndex_(spreadsheet, reportSheet, payload) {
  let indexSheet = spreadsheet.getSheetByName('MỤC LỤC');
  if (!indexSheet) indexSheet = spreadsheet.insertSheet('MỤC LỤC', 0);

  ensureGridSize_(indexSheet, 100, 8);
  indexSheet.setHiddenGridlines(true);

  const weekNumber = Number(payload.weekNumber || payload.week || 0);
  const targetRow = weekNumber > 0
    ? Math.floor(weekNumber) + 4
    : Math.max(indexSheet.getLastRow() + 1, 5);

  if (!indexSheet.getRange('A4').getDisplayValue()) {
    indexSheet.getRange('A4:E4').setValues([[
      'TUẦN', 'TỪ NGÀY', 'ĐẾN NGÀY', 'TỔNG SỐ TIẾT', 'MỞ NHANH'
    ]]);
  }

  const total = Number(payload.total || payload.entries.length || 0);
  const weekValue = weekNumber > 0 ? Math.floor(weekNumber) : reportSheet.getName();
  const startText = formatDate_(payload.startDate);
  const endText = formatDate_(payload.endDate);

  indexSheet.getRange(targetRow, 1, 1, 4).setValues([[
    weekValue,
    startText,
    endText,
    total
  ]]);

  const weekLabel = weekNumber > 0
    ? 'MỞ TUẦN ' + String(Math.floor(weekNumber)).padStart(2, '0')
    : 'MỞ';
  indexSheet.getRange(targetRow, 5)
    .setFormula('=HYPERLINK("#gid=' + reportSheet.getSheetId() + '","' + weekLabel + '")');

  indexSheet.getRange(targetRow, 1, 1, 5)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBorder(true, true, true, true, true, true);

  indexSheet.setFrozenRows(4);
  indexSheet.setColumnWidth(1, 90);
  indexSheet.setColumnWidth(2, 130);
  indexSheet.setColumnWidth(3, 130);
  indexSheet.setColumnWidth(4, 120);
  indexSheet.setColumnWidth(5, 130);
}

function ensureGridSize_(sheet, minimumRows, minimumColumns) {
  if (sheet.getMaxRows() < minimumRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), minimumRows - sheet.getMaxRows());
  }
  if (sheet.getMaxColumns() < minimumColumns) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), minimumColumns - sheet.getMaxColumns());
  }
}

function unique_(values) {
  return values.filter(function (value, index, array) {
    return array.indexOf(value) === index;
  });
}

function formatDate_(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return String(value || '');
  return Utilities.formatDate(date, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy');
}
