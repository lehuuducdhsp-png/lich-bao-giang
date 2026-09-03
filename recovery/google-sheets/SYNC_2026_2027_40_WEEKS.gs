/*
 * LỊCH BÁO GIẢNG — ĐỒNG BỘ MỤC LỤC 40 TUẦN 2026–2027
 * Mốc chính thức: Tuần 01 bắt đầu Thứ Hai 07/09/2026.
 *
 * NGUYÊN TẮC AN TOÀN
 * - Không xóa bất kỳ sheet nào.
 * - Không ghi đè nội dung báo giảng đã lưu.
 * - Chỉ đổi tên tab tuần cũ khi tổng số tiết của tuần đó đang bằng 0.
 * - Nếu tuần cũ có dữ liệu hoặc không xác định được trạng thái, giữ nguyên tab và báo cần kiểm tra.
 * - Tạo một bản sao ẩn của sheet MỤC LỤC trước khi thay đổi.
 * - Cột D (TỔNG SỐ TIẾT) của MỤC LỤC được giữ nguyên; Google Sheets tự cập nhật tham chiếu khi tab được đổi tên.
 *
 * CÁCH DÙNG
 * 1. Mở file Google Sheets Lịch Báo giảng 2026–2027.
 * 2. Tiện ích mở rộng > Apps Script.
 * 3. Thêm file .gs mới, dán toàn bộ nội dung này.
 * 4. Chạy hàm LBG_syncSchoolYear2026_2027_40Weeks.
 */

function LBG_syncSchoolYear2026_2027_40Weeks() {
  const LOCK = LockService.getDocumentLock();
  LOCK.waitLock(30000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('Không tìm thấy Google Sheets đang mở.');

    const INDEX_NAME = 'MỤC LỤC';
    const WEEK_COUNT = 40;
    const START = new Date(2026, 8, 7, 12, 0, 0); // 07/09/2026
    const TZ = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh';
    const index = ss.getSheetByName(INDEX_NAME);
    if (!index) throw new Error('Không tìm thấy sheet “MỤC LỤC”. Hệ thống dừng để tránh sửa nhầm file.');

    ensureBackupOfIndex_(ss, index, TZ);

    const plan = build40WeekPlan_(START, WEEK_COUNT, TZ);
    const changes = [];
    const warnings = [];

    // Đổi tên từng tab tuần theo mốc mới. Chỉ đổi tên nếu tuần đó chưa có tiết đã lưu.
    plan.forEach((week, i) => {
      const row = 5 + i;
      const desired = ss.getSheetByName(week.sheetName);
      if (desired) {
        changes.push([week.weekText, desired.getName(), desired.getName(), 'Đã đúng tên']);
        updateWeekSheetHeader_(desired, week, TZ);
        return;
      }

      const legacy = findBaseWeekSheet_(ss, week.weekNo);
      if (!legacy) {
        warnings.push(`Tuần ${week.weekText}: chưa tìm thấy tab tuần để đổi tên thành ${week.sheetName}.`);
        changes.push([week.weekText, '', week.sheetName, 'Chưa có tab']);
        return;
      }

      const totalState = readIndexTotalState_(index, row);
      if (totalState.safeToRename) {
        const oldName = legacy.getName();
        legacy.setName(week.sheetName);
        updateWeekSheetHeader_(legacy, week, TZ);
        changes.push([week.weekText, oldName, week.sheetName, 'Đã đổi tên']);
      } else {
        warnings.push(
          `Tuần ${week.weekText}: giữ nguyên “${legacy.getName()}” vì cột TỔNG SỐ TIẾT đang có dữ liệu hoặc không xác định (${totalState.label}).`
        );
        changes.push([week.weekText, legacy.getName(), week.sheetName, 'Giữ tab cũ — có dữ liệu/cần kiểm tra']);
      }
    });

    // Cập nhật MỤC LỤC. Không đụng cột D để bảo toàn công thức/tổng hiện có.
    ensureRows_(index, 4 + WEEK_COUNT);

    const titleCell = findCellContaining_(index, 'MỤC LỤC 40 TUẦN', 1, 4, 1, 8);
    if (titleCell) {
      titleCell.setValue('MỤC LỤC 40 TUẦN • TUẦN 01 BẮT ĐẦU 07/09/2026');
    } else {
      // Ảnh hiện tại dùng hàng 2 cho tiêu đề. Chỉ dùng B2 khi không tìm thấy để tránh quét/sửa rộng.
      index.getRange('B2').setValue('MỤC LỤC 40 TUẦN • TUẦN 01 BẮT ĐẦU 07/09/2026');
    }

    const acValues = plan.map(w => [w.weekNo, w.start, w.end]);
    index.getRange(5, 1, WEEK_COUNT, 3).setValues(acValues);
    index.getRange(5, 2, WEEK_COUNT, 2).setNumberFormat('dd/MM/yyyy');

    plan.forEach((week, i) => {
      const row = 5 + i;
      const desired = ss.getSheetByName(week.sheetName);
      const fallback = desired || findBaseWeekSheet_(ss, week.weekNo);
      const cell = index.getRange(row, 5);
      const label = desired ? `MỞ TUẦN ${week.weekText}` : `KIỂM TRA TUẦN ${week.weekText}`;

      if (fallback) {
        const link = `${ss.getUrl()}#gid=${fallback.getSheetId()}`;
        const rich = SpreadsheetApp.newRichTextValue().setText(label).setLinkUrl(link).build();
        cell.setRichTextValue(rich);
        if (!desired) cell.setNote(`Chưa có tab chuẩn ${week.sheetName}. Tab hiện được giữ lại để bảo toàn dữ liệu: ${fallback.getName()}.`);
        else cell.clearNote();
      } else {
        cell.setValue(`CHƯA CÓ TUẦN ${week.weekText}`);
        cell.setNote(`Chưa tìm thấy tab ${week.sheetName}. Không tự tạo tab mới để tránh tạo sai mẫu.`);
      }
    });

    writeSyncLog_(ss, changes, warnings, TZ);
    SpreadsheetApp.flush();

    const renamed = changes.filter(r => r[3] === 'Đã đổi tên').length;
    const already = changes.filter(r => r[3] === 'Đã đúng tên').length;
    const kept = changes.filter(r => String(r[3]).indexOf('Giữ tab cũ') === 0).length;
    const missing = changes.filter(r => r[3] === 'Chưa có tab').length;

    const summary = [
      'Đồng bộ MỤC LỤC 40 TUẦN hoàn tất.',
      '',
      'Tuần 01: 07/09/2026 → 12/09/2026',
      'Tuần 40: 07/06/2027 → 12/06/2027',
      '',
      `Đã đổi tên: ${renamed}`,
      `Đã đúng tên: ${already}`,
      `Giữ tab cũ để bảo toàn dữ liệu: ${kept}`,
      `Chưa tìm thấy tab: ${missing}`,
      warnings.length ? `Cảnh báo: ${warnings.length} — xem sheet nhật ký đồng bộ.` : 'Không có cảnh báo dữ liệu.'
    ].join('\n');

    SpreadsheetApp.getUi().alert('Lịch Báo giảng', summary, SpreadsheetApp.getUi().ButtonSet.OK);
  } finally {
    LOCK.releaseLock();
  }
}

function build40WeekPlan_(start, count, timeZone) {
  const weeks = [];
  for (let i = 0; i < count; i++) {
    const s = new Date(start.getTime());
    s.setDate(start.getDate() + i * 7);
    const e = new Date(s.getTime());
    e.setDate(s.getDate() + 5); // Thứ Hai → Thứ Bảy
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

function findBaseWeekSheet_(ss, weekNo) {
  const wanted = Number(weekNo);
  const candidates = ss.getSheets().filter(sheet => {
    const name = String(sheet.getName() || '').trim();
    const m = name.match(/^TUẦN\s+0*(\d{1,2})(?:_|$)/i);
    if (!m || Number(m[1]) !== wanted) return false;
    // Không tự động dùng tab BẢN 2/BẢN SAO làm tab chính.
    return !/\bBẢN\s*\d+\b/i.test(name) && !/\bCOPY\b/i.test(name);
  });
  return candidates.length ? candidates[0] : null;
}

function readIndexTotalState_(indexSheet, row) {
  const cell = indexSheet.getRange(row, 4);
  const raw = String(cell.getDisplayValue() || '').trim();
  const cleaned = raw.replace(/[^0-9,.-]/g, '').replace(',', '.');
  if (!cleaned) return { safeToRename: false, label: 'không đọc được tổng số tiết' };
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return { safeToRename: false, label: raw || 'không xác định' };
  return { safeToRename: n === 0, label: String(n) };
}

function updateWeekSheetHeader_(sheet, week, timeZone) {
  // Chỉ quét vùng đầu trang để không chạm nội dung báo giảng bên dưới.
  const maxRows = Math.min(15, sheet.getMaxRows());
  const maxCols = Math.min(15, sheet.getMaxColumns());
  const range = sheet.getRange(1, 1, maxRows, maxCols);
  const values = range.getDisplayValues();

  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values[r].length; c++) {
      const text = String(values[r][c] || '').trim();
      if (!text) continue;
      const cell = sheet.getRange(r + 1, c + 1);

      if (/^TUẦN\s+0*\d{1,2}$/i.test(text)) {
        cell.setValue(`Tuần ${week.weekText}`);
        continue;
      }

      if (/^\(?\s*Từ ngày\s+\d{1,2}\/\d{1,2}\/\d{4}\s+đến ngày\s+\d{1,2}\/\d{1,2}\/\d{4}\s*\)?$/i.test(text)) {
        cell.setValue(`(Từ ngày ${week.startText} đến ngày ${week.endText})`);
      }
    }
  }
}

function findCellContaining_(sheet, needle, startRow, numRows, startCol, numCols) {
  const values = sheet.getRange(startRow, startCol, numRows, numCols).getDisplayValues();
  const key = String(needle).toUpperCase();
  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values[r].length; c++) {
      if (String(values[r][c] || '').toUpperCase().indexOf(key) >= 0) {
        return sheet.getRange(startRow + r, startCol + c);
      }
    }
  }
  return null;
}

function ensureRows_(sheet, neededRows) {
  if (sheet.getMaxRows() < neededRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), neededRows - sheet.getMaxRows());
  }
}

function ensureBackupOfIndex_(ss, indexSheet, timeZone) {
  const prefix = '__LBG_BACKUP_MUC_LUC_20260903';
  if (ss.getSheets().some(s => s.getName().indexOf(prefix) === 0)) return;

  const stamp = Utilities.formatDate(new Date(), timeZone, 'HHmmss');
  const backup = indexSheet.copyTo(ss).setName(`${prefix}_${stamp}`);
  backup.hideSheet();
}

function writeSyncLog_(ss, changes, warnings, timeZone) {
  const name = '__LBG_NHAT_KY_SYNC_20260903';
  let log = ss.getSheetByName(name);
  if (!log) {
    log = ss.insertSheet(name);
    log.hideSheet();
  }

  log.clearContents();
  const header = [
    ['ĐỒNG BỘ MỤC LỤC 40 TUẦN 2026–2027'],
    [`Thời điểm: ${Utilities.formatDate(new Date(), timeZone, 'dd/MM/yyyy HH:mm:ss')}`],
    ['Tuần 01: 07/09/2026 • Tuần 40: 07/06/2027–12/06/2027'],
    [''],
    ['TUẦN', 'TÊN CŨ', 'TÊN CHUẨN', 'KẾT QUẢ']
  ];
  log.getRange(1, 1, header.length, 1).setValues(header.map(r => [r[0]]));
  log.getRange(5, 1, 1, 4).setValues([['TUẦN', 'TÊN CŨ', 'TÊN CHUẨN', 'KẾT QUẢ']]);
  if (changes.length) log.getRange(6, 1, changes.length, 4).setValues(changes);

  const warningStart = 7 + changes.length;
  log.getRange(warningStart, 1).setValue('CẢNH BÁO');
  if (warnings.length) log.getRange(warningStart + 1, 1, warnings.length, 1).setValues(warnings.map(x => [x]));
  else log.getRange(warningStart + 1, 1).setValue('Không có cảnh báo.');

  log.autoResizeColumns(1, 4);
}
