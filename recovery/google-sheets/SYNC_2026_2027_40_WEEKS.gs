/*
 * LỊCH BÁO GIẢNG — ĐỒNG BỘ MỤC LỤC 40 TUẦN 2026–2027
 * Dành cho chính project Apps Script “KẾT NỐI LỊCH BÁO GIẢNG” hiện tại.
 * Mốc chính thức: Tuần 01 bắt đầu Thứ Hai 07/09/2026.
 *
 * QUAN TRỌNG
 * - KHÔNG sửa Mã.gs / doGet / doPost hiện có.
 * - File này dùng CONFIG.CURRENT_SPREADSHEET_ID đã có trong Mã.gs để mở đúng Google Sheets.
 * - Không dùng SpreadsheetApp.getUi(), vì project hiện tại là Apps Script độc lập (standalone), không phải container-bound.
 * - Phải chạy XEM TRƯỚC trước, sau đó mới được chạy ĐỒNG BỘ.
 * - Không xóa sheet, không đụng BẢN 2/BẢN 3/COPY.
 * - Nếu phát hiện dữ liệu bất thường: dừng trước khi ghi.
 * - Trước khi ghi thật: bắt buộc tạo một bản sao TOÀN BỘ Google Sheets trên Drive.
 */

const LBG40_SYNC_VERSION = '20260903.3';
const LBG40_PREVIEW_KEY = 'LBG40_PREVIEW_OK_20260903';

/**
 * BƯỚC 1 — CHẠY HÀM NÀY TRƯỚC.
 * Chỉ kiểm tra, KHÔNG thay đổi Google Sheets.
 * Sau khi chạy, xem “Nhật ký thực thi”.
 */
function LBG_previewSchoolYear2026_2027_40Weeks() {
  const ss = LBG40_getSpreadsheet_();
  const context = LBG40_buildContext_(ss);
  const preview = LBG40_inspectPlan_(ss, context.index, context.layout, context.plan);

  console.log('=== XEM TRƯỚC ĐỒNG BỘ 40 TUẦN ===');
  console.log('Phiên bản: ' + LBG40_SYNC_VERSION);
  console.log('File: ' + ss.getName());
  console.log('Spreadsheet ID: ' + ss.getId());
  console.log('Tuần 01: 07/09/2026 → 12/09/2026');
  console.log('Tuần 40: 07/06/2027 → 12/06/2027');
  console.log('Tab cần đổi tên: ' + preview.rename.length);
  console.log('Tab đã đúng tên: ' + preview.already.length);
  console.log('Vấn đề chặn đồng bộ: ' + preview.blockers.length);

  if (preview.rename.length) {
    console.log('--- CÁC TAB SẼ ĐỔI TÊN ---');
    preview.rename.forEach(item => console.log(item.sheet.getName() + '  →  ' + item.week.sheetName));
  }

  if (preview.blockers.length) {
    console.error('--- HỆ THỐNG DỪNG, CHƯA CHO PHÉP ĐỒNG BỘ ---');
    preview.blockers.forEach(item => console.error('• ' + item));
    PropertiesService.getUserProperties().deleteProperty(LBG40_PREVIEW_KEY);
    return;
  }

  const stamp = {
    version: LBG40_SYNC_VERSION,
    spreadsheetId: ss.getId(),
    createdAt: Date.now(),
    renameCount: preview.rename.length,
    alreadyCount: preview.already.length
  };
  PropertiesService.getUserProperties().setProperty(LBG40_PREVIEW_KEY, JSON.stringify(stamp));

  console.log('✅ XEM TRƯỚC HỢP LỆ. CHƯA CÓ DỮ LIỆU NÀO BỊ THAY ĐỔI.');
  console.log('Bây giờ có thể chọn hàm LBG_syncSchoolYear2026_2027_40Weeks và bấm Chạy trong vòng 15 phút.');
}

/**
 * BƯỚC 2 — CHỈ CHẠY SAU KHI XEM TRƯỚC HỢP LỆ.
 * Có backup toàn file trước khi ghi.
 */
function LBG_syncSchoolYear2026_2027_40Weeks() {
  const ss = LBG40_getSpreadsheet_();
  LBG40_requireFreshPreview_(ss);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const context = LBG40_buildContext_(ss);
    const latest = LBG40_inspectPlan_(ss, context.index, context.layout, context.plan);

    if (latest.blockers.length) {
      PropertiesService.getUserProperties().deleteProperty(LBG40_PREVIEW_KEY);
      throw new Error(
        'Dữ liệu đã thay đổi hoặc có vấn đề sau bước xem trước. Hệ thống DỪNG trước khi ghi.\n' +
        latest.blockers.map(x => '• ' + x).join('\n')
      );
    }

    console.log('Đang tạo backup toàn bộ Google Sheets trước khi thay đổi...');
    const backup = LBG40_createFullSpreadsheetBackup_(ss, context.timeZone);
    console.log('✅ Backup toàn file: ' + backup.name);
    console.log('Backup URL: ' + backup.url);

    const indexBackupName = LBG40_createIndexBackup_(ss, context.index, context.timeZone);
    console.log('✅ Backup MỤC LỤC trong file: ' + indexBackupName);

    const changes = [];

    latest.rename.forEach(item => {
      const oldName = item.sheet.getName();
      item.sheet.setName(item.week.sheetName);
      const snapshot = LBG40_updateWeekSheetHeader_(item.sheet, item.week);
      changes.push([
        item.week.weekText,
        oldName,
        item.week.sheetName,
        'Đã đổi tên',
        snapshot.oldWeekText,
        snapshot.oldDateText
      ]);
    });

    latest.already.forEach(item => {
      const snapshot = LBG40_updateWeekSheetHeader_(item.sheet, item.week);
      changes.push([
        item.week.weekText,
        item.sheet.getName(),
        item.sheet.getName(),
        'Đã đúng tên',
        snapshot.oldWeekText,
        snapshot.oldDateText
      ]);
    });

    LBG40_updateIndex_(ss, context.index, context.layout, context.plan);
    LBG40_writeSyncLog_(ss, changes, backup, indexBackupName, context.timeZone);
    SpreadsheetApp.flush();

    PropertiesService.getUserProperties().deleteProperty(LBG40_PREVIEW_KEY);

    console.log('=== ✅ ĐỒNG BỘ THÀNH CÔNG ===');
    console.log('Đã đổi tên: ' + latest.rename.length);
    console.log('Đã đúng tên: ' + latest.already.length);
    console.log('Tuần 01: 07/09/2026 → 12/09/2026');
    console.log('Tuần 40: 07/06/2027 → 12/06/2027');
    console.log('Backup toàn file: ' + backup.url);
    console.log('Trong Google Sheets có sheet nhật ký: __LBG_NHAT_KY_SYNC_20260903');
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function LBG40_getSpreadsheet_() {
  let spreadsheetId = '';

  try {
    if (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.CURRENT_SPREADSHEET_ID) {
      spreadsheetId = String(CONFIG.CURRENT_SPREADSHEET_ID).trim();
    }
  } catch (error) {}

  if (!spreadsheetId) {
    spreadsheetId = String(
      PropertiesService.getScriptProperties().getProperty('CURRENT_SPREADSHEET_ID') || ''
    ).trim();
  }

  if (spreadsheetId) {
    try {
      return SpreadsheetApp.openById(spreadsheetId);
    } catch (error) {
      throw new Error(
        'Có CURRENT_SPREADSHEET_ID nhưng không mở được Google Sheets. ID: ' + spreadsheetId +
        '. Chi tiết: ' + (error && error.message ? error.message : error)
      );
    }
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;

  throw new Error(
    'Không xác định được Google Sheets đích. Project này cần CONFIG.CURRENT_SPREADSHEET_ID trong Mã.gs.'
  );
}

function LBG40_buildContext_(ss) {
  const index = ss.getSheetByName('MỤC LỤC');
  if (!index) throw new Error('Không tìm thấy sheet “MỤC LỤC”. Dừng để tránh sửa nhầm file.');

  const layout = LBG40_detectIndexLayout_(index);
  const timeZone = ss.getSpreadsheetTimeZone() ||
    (typeof CONFIG !== 'undefined' && CONFIG.TIME_ZONE ? CONFIG.TIME_ZONE : '') ||
    Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh';

  const start = new Date(2026, 8, 7, 12, 0, 0);
  const plan = LBG40_build40WeekPlan_(start, 40, timeZone);

  return { index, layout, timeZone, plan };
}

function LBG40_requireFreshPreview_(ss) {
  const raw = PropertiesService.getUserProperties().getProperty(LBG40_PREVIEW_KEY);
  if (!raw) {
    throw new Error(
      'Chưa có bước XEM TRƯỚC hợp lệ. Hãy chạy LBG_previewSchoolYear2026_2027_40Weeks trước.'
    );
  }

  let stamp;
  try { stamp = JSON.parse(raw); }
  catch (error) { stamp = null; }

  const age = stamp ? Date.now() - Number(stamp.createdAt || 0) : Infinity;
  const valid = stamp &&
    stamp.version === LBG40_SYNC_VERSION &&
    stamp.spreadsheetId === ss.getId() &&
    age >= 0 && age <= 15 * 60 * 1000;

  if (!valid) {
    PropertiesService.getUserProperties().deleteProperty(LBG40_PREVIEW_KEY);
    throw new Error(
      'Bước XEM TRƯỚC đã hết hạn hoặc không khớp file hiện tại. Hãy chạy lại LBG_previewSchoolYear2026_2027_40Weeks.'
    );
  }
}

function LBG40_build40WeekPlan_(start, count, timeZone) {
  const weeks = [];
  for (let i = 0; i < count; i++) {
    const s = new Date(start.getTime());
    s.setDate(start.getDate() + i * 7);
    const e = new Date(s.getTime());
    e.setDate(s.getDate() + 5);
    const weekNo = i + 1;
    const weekText = String(weekNo).padStart(2, '0');
    weeks.push({
      weekNo,
      weekText,
      start: s,
      end: e,
      sheetName: `TUẦN ${weekText}_${s.getDate()}T${s.getMonth() + 1}`,
      startText: Utilities.formatDate(s, timeZone, 'dd/MM/yyyy'),
      endText: Utilities.formatDate(e, timeZone, 'dd/MM/yyyy')
    });
  }
  return weeks;
}

function LBG40_detectIndexLayout_(indexSheet) {
  const maxRows = Math.min(12, indexSheet.getMaxRows());
  const maxCols = Math.min(10, indexSheet.getMaxColumns());
  const values = indexSheet.getRange(1, 1, maxRows, maxCols).getDisplayValues();
  const expected = ['TUAN', 'TU NGAY', 'DEN NGAY', 'TONG SO TIET', 'MO NHANH'];

  for (let r = 0; r < values.length; r++) {
    const normalized = values[r].map(LBG40_normalizeText_);
    for (let c = 0; c <= normalized.length - expected.length; c++) {
      const slice = normalized.slice(c, c + expected.length);
      if (expected.every((value, i) => slice[i] === value)) {
        return {
          headerRow: r + 1,
          dataStartRow: r + 2,
          weekCol: c + 1,
          startCol: c + 2,
          endCol: c + 3,
          totalCol: c + 4,
          linkCol: c + 5
        };
      }
    }
  }

  throw new Error(
    'Không nhận diện được hàng “TUẦN | TỪ NGÀY | ĐẾN NGÀY | TỔNG SỐ TIẾT | MỞ NHANH” trong MỤC LỤC.'
  );
}

function LBG40_inspectPlan_(ss, indexSheet, layout, plan) {
  const rename = [];
  const already = [];
  const blockers = [];

  plan.forEach((week, i) => {
    const row = layout.dataStartRow + i;
    const baseSheets = LBG40_findBaseWeekSheets_(ss, week.weekNo);
    const desired = baseSheets.find(s => s.getName() === week.sheetName) || null;

    if (baseSheets.length > 1) {
      blockers.push(
        `Tuần ${week.weekText}: có nhiều tab cơ sở (${baseSheets.map(s => s.getName()).join(', ')}).`
      );
      return;
    }

    if (desired) {
      already.push({ week, row, sheet: desired });
      return;
    }

    if (!baseSheets.length) {
      blockers.push(`Tuần ${week.weekText}: không tìm thấy tab cơ sở để đổi thành ${week.sheetName}.`);
      return;
    }

    const totalState = LBG40_readIndexTotalState_(indexSheet, row, layout.totalCol);
    if (!totalState.safeToRename) {
      blockers.push(
        `Tuần ${week.weekText}: tab “${baseSheets[0].getName()}” có TỔNG SỐ TIẾT = ${totalState.label}; không tự đổi tên.`
      );
      return;
    }

    rename.push({ week, row, sheet: baseSheets[0] });
  });

  return { rename, already, blockers };
}

function LBG40_findBaseWeekSheets_(ss, weekNo) {
  const wanted = Number(weekNo);
  return ss.getSheets().filter(sheet => {
    const name = String(sheet.getName() || '').trim();
    const m = name.match(/^TUẦN\s+0*(\d{1,2})(?:_|$)/i);
    if (!m || Number(m[1]) !== wanted) return false;
    return !/\bBẢN\s*\d+\b/i.test(name) && !/\bCOPY\b/i.test(name);
  });
}

function LBG40_readIndexTotalState_(indexSheet, row, totalCol) {
  const raw = String(indexSheet.getRange(row, totalCol).getDisplayValue() || '').trim();
  const cleaned = raw.replace(/[^0-9,.-]/g, '').replace(',', '.');
  if (!cleaned) return { safeToRename: false, label: 'không đọc được' };
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return { safeToRename: false, label: raw || 'không xác định' };
  return { safeToRename: n === 0, label: String(n) };
}

function LBG40_updateIndex_(ss, index, layout, plan) {
  LBG40_ensureRows_(index, layout.dataStartRow + plan.length - 1);

  const titleCell = LBG40_findCellContaining_(
    index,
    'MỤC LỤC 40 TUẦN',
    1,
    Math.max(1, layout.headerRow - 1),
    1,
    Math.min(10, index.getMaxColumns())
  );
  if (!titleCell) {
    throw new Error('Không tìm thấy dòng “MỤC LỤC 40 TUẦN”. Backup đã tạo; dừng trước khi sửa MỤC LỤC.');
  }
  titleCell.setValue('MỤC LỤC 40 TUẦN • TUẦN 01 BẮT ĐẦU 07/09/2026');

  const startRow = layout.dataStartRow;
  index.getRange(startRow, layout.weekCol, plan.length, 1).setValues(plan.map(w => [w.weekNo]));
  index.getRange(startRow, layout.startCol, plan.length, 1).setValues(plan.map(w => [w.start]));
  index.getRange(startRow, layout.endCol, plan.length, 1).setValues(plan.map(w => [w.end]));
  index.getRange(startRow, layout.startCol, plan.length, 2).setNumberFormat('dd/MM/yyyy');

  plan.forEach((week, i) => {
    const row = startRow + i;
    const target = ss.getSheetByName(week.sheetName);
    if (!target) throw new Error(`Không tìm thấy ${week.sheetName} sau khi đổi tên.`);

    const cell = index.getRange(row, layout.linkCol);
    const link = `${ss.getUrl()}#gid=${target.getSheetId()}`;
    cell.setRichTextValue(
      SpreadsheetApp.newRichTextValue()
        .setText(`MỞ TUẦN ${week.weekText}`)
        .setLinkUrl(link)
        .build()
    ).clearNote();
  });
}

function LBG40_updateWeekSheetHeader_(sheet, week) {
  const maxRows = Math.min(15, sheet.getMaxRows());
  const maxCols = Math.min(15, sheet.getMaxColumns());
  const values = sheet.getRange(1, 1, maxRows, maxCols).getDisplayValues();
  let oldWeekText = '';
  let oldDateText = '';

  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values[r].length; c++) {
      const text = String(values[r][c] || '').trim();
      if (!text) continue;
      const cell = sheet.getRange(r + 1, c + 1);

      if (/^TUẦN\s+0*\d{1,2}$/i.test(text)) {
        if (!oldWeekText) oldWeekText = text;
        cell.setValue(`Tuần ${week.weekText}`);
        continue;
      }

      if (/^\(?\s*Từ ngày\s+\d{1,2}\/\d{1,2}\/\d{4}\s+đến ngày\s+\d{1,2}\/\d{1,2}\/\d{4}\s*\)?$/i.test(text)) {
        if (!oldDateText) oldDateText = text;
        cell.setValue(`(Từ ngày ${week.startText} đến ngày ${week.endText})`);
      }
    }
  }

  return { oldWeekText, oldDateText };
}

function LBG40_createFullSpreadsheetBackup_(ss, timeZone) {
  const stamp = Utilities.formatDate(new Date(), timeZone, 'yyyyMMdd-HHmmss');
  const backupName = `${ss.getName()} — BACKUP TRƯỚC SYNC 40 TUẦN ${stamp}`;

  try {
    const source = DriveApp.getFileById(ss.getId());
    const parents = source.getParents();
    const copy = parents.hasNext()
      ? source.makeCopy(backupName, parents.next())
      : source.makeCopy(backupName);

    if (!copy || !copy.getId()) throw new Error('Không nhận được ID file backup.');
    return {
      id: copy.getId(),
      name: copy.getName(),
      url: `https://docs.google.com/spreadsheets/d/${copy.getId()}/edit`
    };
  } catch (error) {
    throw new Error(
      'Không tạo được BACKUP TOÀN FILE nên hệ thống DỪNG trước khi sửa. Chi tiết: ' +
      (error && error.message ? error.message : error)
    );
  }
}

function LBG40_createIndexBackup_(ss, indexSheet, timeZone) {
  const stamp = Utilities.formatDate(new Date(), timeZone, 'HHmmss');
  const suffix = Utilities.getUuid().slice(0, 6);
  const name = `__LBG_BACKUP_MUC_LUC_${stamp}_${suffix}`;
  indexSheet.copyTo(ss).setName(name).hideSheet();
  return name;
}

function LBG40_writeSyncLog_(ss, changes, backup, indexBackupName, timeZone) {
  const name = '__LBG_NHAT_KY_SYNC_20260903';
  let log = ss.getSheetByName(name);
  if (!log) log = ss.insertSheet(name);
  log.showSheet();
  log.clear();

  const stamp = Utilities.formatDate(new Date(), timeZone, 'dd/MM/yyyy HH:mm:ss');
  const top = [
    ['ĐỒNG BỘ MỤC LỤC 40 TUẦN 2026–2027'],
    [`Thời điểm: ${stamp}`],
    ['Mốc: Tuần 01 07/09/2026–12/09/2026 • Tuần 40 07/06/2027–12/06/2027'],
    [`Backup toàn file: ${backup.name}`],
    [`URL backup: ${backup.url}`],
    [`Backup MỤC LỤC trong file: ${indexBackupName}`],
    ['']
  ];
  log.getRange(1, 1, top.length, 1).setValues(top);

  const headerRow = top.length + 1;
  log.getRange(headerRow, 1, 1, 6).setValues([[
    'TUẦN', 'TÊN CŨ', 'TÊN CHUẨN', 'KẾT QUẢ', 'TIÊU ĐỀ TUẦN CŨ', 'KHOẢNG NGÀY CŨ'
  ]]);
  if (changes.length) log.getRange(headerRow + 1, 1, changes.length, 6).setValues(changes);

  log.setFrozenRows(headerRow);
  log.autoResizeColumns(1, 6);
  log.setTabColor('#F4A261');
}

function LBG40_findCellContaining_(sheet, needle, startRow, numRows, startCol, numCols) {
  const values = sheet.getRange(startRow, startCol, numRows, numCols).getDisplayValues();
  const key = LBG40_normalizeText_(needle);
  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values[r].length; c++) {
      if (LBG40_normalizeText_(values[r][c]).indexOf(key) >= 0) {
        return sheet.getRange(startRow + r, startCol + c);
      }
    }
  }
  return null;
}

function LBG40_normalizeText_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D')
    .replace(/đ/g, 'd')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function LBG40_ensureRows_(sheet, neededRows) {
  if (sheet.getMaxRows() < neededRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), neededRows - sheet.getMaxRows());
  }
}
