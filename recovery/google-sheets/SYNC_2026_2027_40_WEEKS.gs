/*
 * LỊCH BÁO GIẢNG — ĐỒNG BỘ MỤC LỤC 40 TUẦN 2026–2027
 * Mốc chính thức: Tuần 01 bắt đầu Thứ Hai 07/09/2026.
 *
 * NGUYÊN TẮC AN TOÀN
 * - Không xóa bất kỳ sheet nào.
 * - Không ghi đè nội dung báo giảng đã lưu.
 * - Chỉ đổi tên tab tuần cũ khi TỔNG SỐ TIẾT của tuần đó bằng 0.
 * - Nếu phát hiện tuần có dữ liệu, thiếu tab hoặc có hai tab cơ sở trùng tuần: DỪNG TOÀN BỘ trước khi ghi.
 * - Trước khi thay đổi, bắt buộc tạo một BẢN SAO TOÀN BỘ FILE trong Google Drive.
 * - Đồng thời tạo một bản sao ẩn của sheet MỤC LỤC ngay trong file hiện tại.
 * - Cột D (TỔNG SỐ TIẾT) của MỤC LỤC được giữ nguyên; Google Sheets tự cập nhật tham chiếu khi tab được đổi tên.
 * - Có bước xem trước/đồng ý trước khi chạy thật.
 *
 * CÁCH DÙNG
 * 1. Mở file Google Sheets Lịch Báo giảng 2026–2027.
 * 2. Tiện ích mở rộng > Apps Script.
 * 3. Thêm MỘT FILE .gs MỚI, không thay Code.gs/doPost hiện có.
 * 4. Dán toàn bộ nội dung này và Lưu.
 * 5. Chọn hàm LBG_syncSchoolYear2026_2027_40Weeks rồi bấm Chạy.
 */

function LBG_syncSchoolYear2026_2027_40Weeks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Không tìm thấy Google Sheets đang mở.');

  const INDEX_NAME = 'MỤC LỤC';
  const WEEK_COUNT = 40;
  const START = new Date(2026, 8, 7, 12, 0, 0); // 07/09/2026
  const TZ = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh';
  const index = ss.getSheetByName(INDEX_NAME);
  if (!index) throw new Error('Không tìm thấy sheet “MỤC LỤC”. Hệ thống dừng để tránh sửa nhầm file.');

  const layout = detectIndexLayout_(index);
  const plan = build40WeekPlan_(START, WEEK_COUNT, TZ);
  const preview = inspectPlan_(ss, index, layout, plan);

  if (preview.blockers.length) {
    const detail = preview.blockers.slice(0, 12).map(x => '• ' + x).join('\n');
    const more = preview.blockers.length > 12 ? `\n… và ${preview.blockers.length - 12} vấn đề khác.` : '';
    SpreadsheetApp.getUi().alert(
      'Chưa đồng bộ — hệ thống đang bảo vệ dữ liệu',
      [
        `File: ${ss.getName()}`,
        '',
        'Không có thay đổi nào được thực hiện.',
        'Cần xử lý các mục sau trước khi chạy lại:',
        detail + more
      ].join('\n'),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const answer = SpreadsheetApp.getUi().alert(
    'Xác nhận đồng bộ 40 tuần',
    [
      `File: ${ss.getName()}`,
      'Tuần 01: 07/09/2026 → 12/09/2026',
      'Tuần 40: 07/06/2027 → 12/06/2027',
      '',
      `Tab sẽ đổi tên: ${preview.rename.length}`,
      `Tab đã đúng tên: ${preview.already.length}`,
      '',
      'Trước khi sửa, hệ thống sẽ tạo một bản sao TOÀN BỘ file trong Google Drive.',
      'Không xóa sheet. Không đụng các tab BẢN 2. Cột TỔNG SỐ TIẾT được giữ nguyên.',
      '',
      'Bạn có muốn tiếp tục?'
    ].join('\n'),
    SpreadsheetApp.getUi().ButtonSet.YES_NO
  );
  if (answer !== SpreadsheetApp.getUi().Button.YES) return;

  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);

  try {
    // Kiểm tra lại một lần nữa sau khi có lock để tránh dữ liệu thay đổi giữa lúc xem trước và bấm Có.
    const latest = inspectPlan_(ss, index, layout, plan);
    if (latest.blockers.length) {
      throw new Error('Dữ liệu đã thay đổi trong lúc xác nhận. Hệ thống dừng trước khi ghi; hãy chạy lại để kiểm tra.');
    }

    const backup = createFullSpreadsheetBackup_(ss, TZ);
    const indexBackupName = createIndexBackup_(ss, index, TZ);

    const changes = [];

    latest.rename.forEach(item => {
      const oldName = item.sheet.getName();
      item.sheet.setName(item.week.sheetName);
      const headerSnapshot = updateWeekSheetHeader_(item.sheet, item.week);
      changes.push([
        item.week.weekText,
        oldName,
        item.week.sheetName,
        'Đã đổi tên',
        headerSnapshot.oldWeekText,
        headerSnapshot.oldDateText
      ]);
    });

    latest.already.forEach(item => {
      const headerSnapshot = updateWeekSheetHeader_(item.sheet, item.week);
      changes.push([
        item.week.weekText,
        item.sheet.getName(),
        item.sheet.getName(),
        'Đã đúng tên',
        headerSnapshot.oldWeekText,
        headerSnapshot.oldDateText
      ]);
    });

    updateIndex_(ss, index, layout, plan);
    writeSyncLog_(ss, changes, backup, indexBackupName, TZ);
    SpreadsheetApp.flush();

    SpreadsheetApp.getUi().alert(
      'Đồng bộ thành công',
      [
        'MỤC LỤC 40 TUẦN đã được đồng bộ theo mốc 07/09/2026.',
        '',
        `Đã đổi tên: ${latest.rename.length}`,
        `Đã đúng tên: ${latest.already.length}`,
        '',
        `Backup toàn file: ${backup.name}`,
        `Backup MỤC LỤC: ${indexBackupName}`,
        '',
        'Hãy kiểm tra Tuần 01, Tuần 02, Tuần 39 và Tuần 40 trước khi đóng file.'
      ].join('\n'),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } finally {
    lock.releaseLock();
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

function detectIndexLayout_(indexSheet) {
  const maxRows = Math.min(12, indexSheet.getMaxRows());
  const maxCols = Math.min(10, indexSheet.getMaxColumns());
  const values = indexSheet.getRange(1, 1, maxRows, maxCols).getDisplayValues();
  const expected = ['TUAN', 'TU NGAY', 'DEN NGAY', 'TONG SO TIET', 'MO NHANH'];

  for (let r = 0; r < values.length; r++) {
    const normalized = values[r].map(normalizeText_);
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
    'Không nhận diện được hàng tiêu đề “TUẦN | TỪ NGÀY | ĐẾN NGÀY | TỔNG SỐ TIẾT | MỞ NHANH” trong MỤC LỤC. Hệ thống dừng để tránh sửa sai vị trí.'
  );
}

function inspectPlan_(ss, indexSheet, layout, plan) {
  const rename = [];
  const already = [];
  const blockers = [];

  plan.forEach((week, i) => {
    const row = layout.dataStartRow + i;
    const baseSheets = findBaseWeekSheets_(ss, week.weekNo);
    const desired = baseSheets.find(s => s.getName() === week.sheetName) || null;

    if (baseSheets.length > 1) {
      blockers.push(
        `Tuần ${week.weekText}: có nhiều tab cơ sở (${baseSheets.map(s => s.getName()).join(', ')}). Không tự chọn để tránh nhầm dữ liệu.`
      );
      return;
    }

    if (desired) {
      already.push({ week, row, sheet: desired });
      return;
    }

    if (!baseSheets.length) {
      blockers.push(`Tuần ${week.weekText}: chưa tìm thấy tab cơ sở để đổi thành ${week.sheetName}.`);
      return;
    }

    const totalState = readIndexTotalState_(indexSheet, row, layout.totalCol);
    if (!totalState.safeToRename) {
      blockers.push(
        `Tuần ${week.weekText}: giữ nguyên “${baseSheets[0].getName()}” vì TỔNG SỐ TIẾT = ${totalState.label}.`
      );
      return;
    }

    rename.push({ week, row, sheet: baseSheets[0] });
  });

  return { rename, already, blockers };
}

function findBaseWeekSheets_(ss, weekNo) {
  const wanted = Number(weekNo);
  return ss.getSheets().filter(sheet => {
    const name = String(sheet.getName() || '').trim();
    const m = name.match(/^TUẦN\s+0*(\d{1,2})(?:_|$)/i);
    if (!m || Number(m[1]) !== wanted) return false;
    // BẢN 2/BẢN 3/COPY là lịch sử đối chiếu; không đụng vào trong lần đồng bộ này.
    return !/\bBẢN\s*\d+\b/i.test(name) && !/\bCOPY\b/i.test(name);
  });
}

function readIndexTotalState_(indexSheet, row, totalCol) {
  const cell = indexSheet.getRange(row, totalCol);
  const raw = String(cell.getDisplayValue() || '').trim();
  const cleaned = raw.replace(/[^0-9,.-]/g, '').replace(',', '.');
  if (!cleaned) return { safeToRename: false, label: 'không đọc được' };
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return { safeToRename: false, label: raw || 'không xác định' };
  return { safeToRename: n === 0, label: String(n) };
}

function updateIndex_(ss, index, layout, plan) {
  ensureRows_(index, layout.dataStartRow + plan.length - 1);

  const titleCell = findCellContaining_(index, 'MỤC LỤC 40 TUẦN', 1, Math.max(1, layout.headerRow - 1), 1, Math.min(10, index.getMaxColumns()));
  if (!titleCell) {
    throw new Error('Không tìm thấy dòng “MỤC LỤC 40 TUẦN”. Backup đã được tạo nhưng hệ thống dừng trước khi sửa bảng mục lục.');
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
    if (!target) throw new Error(`Sau khi đổi tên vẫn không tìm thấy ${week.sheetName}. Hệ thống dừng; dùng backup toàn file nếu cần hoàn tác.`);

    const cell = index.getRange(row, layout.linkCol);
    const link = `${ss.getUrl()}#gid=${target.getSheetId()}`;
    const rich = SpreadsheetApp.newRichTextValue()
      .setText(`MỞ TUẦN ${week.weekText}`)
      .setLinkUrl(link)
      .build();
    cell.setRichTextValue(rich).clearNote();
  });
}

function updateWeekSheetHeader_(sheet, week) {
  // Chỉ quét vùng đầu trang; không chạm bảng báo giảng bên dưới.
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

function createFullSpreadsheetBackup_(ss, timeZone) {
  const stamp = Utilities.formatDate(new Date(), timeZone, 'yyyyMMdd-HHmmss');
  const backupName = `${ss.getName()} — BACKUP TRƯỚC SYNC 40 TUẦN ${stamp}`;
  let copy;

  try {
    const source = DriveApp.getFileById(ss.getId());
    const parents = source.getParents();
    copy = parents.hasNext()
      ? source.makeCopy(backupName, parents.next())
      : source.makeCopy(backupName);
  } catch (error) {
    throw new Error('Không tạo được bản sao toàn bộ Google Sheets trong Drive nên hệ thống DỪNG trước khi sửa. Chi tiết: ' + (error && error.message ? error.message : error));
  }

  if (!copy || !copy.getId()) throw new Error('Không xác nhận được file backup; hệ thống dừng trước khi sửa.');
  return { id: copy.getId(), name: copy.getName(), url: `https://docs.google.com/spreadsheets/d/${copy.getId()}/edit` };
}

function createIndexBackup_(ss, indexSheet, timeZone) {
  const stamp = Utilities.formatDate(new Date(), timeZone, 'HHmmss');
  const suffix = Utilities.getUuid().slice(0, 6);
  const name = `__LBG_BACKUP_MUC_LUC_${stamp}_${suffix}`;
  indexSheet.copyTo(ss).setName(name).hideSheet();
  return name;
}

function findCellContaining_(sheet, needle, startRow, numRows, startCol, numCols) {
  const values = sheet.getRange(startRow, startCol, numRows, numCols).getDisplayValues();
  const key = normalizeText_(needle);
  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values[r].length; c++) {
      if (normalizeText_(values[r][c]).indexOf(key) >= 0) {
        return sheet.getRange(startRow + r, startCol + c);
      }
    }
  }
  return null;
}

function normalizeText_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D')
    .replace(/đ/g, 'd')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function ensureRows_(sheet, neededRows) {
  if (sheet.getMaxRows() < neededRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), neededRows - sheet.getMaxRows());
  }
}

function writeSyncLog_(ss, changes, backup, indexBackupName, timeZone) {
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
