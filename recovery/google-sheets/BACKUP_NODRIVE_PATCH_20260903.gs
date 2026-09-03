/*
 * PATCH AN TOÀN — BACKUP GOOGLE SHEETS KHÔNG DÙNG DriveApp
 * Dùng khi project Apps Script hiện tại không có quyền DriveApp.
 *
 * CÁCH DÙNG:
 * 1) GIỮ NGUYÊN hàm LBG40_createFullSpreadsheetBackup_ cũ.
 * 2) Trong LBG_syncSchoolYear2026_2027_40Weeks, đổi đúng 1 dòng:
 *      const backup = LBG40_createFullSpreadsheetBackup_(ss, context.timeZone);
 *    thành:
 *      const backup = LBG40_createFullSpreadsheetBackupNoDrive_(ss, context.timeZone);
 * 3) Dán hàm bên dưới vào CUỐI file SYNC.
 */
function LBG40_createFullSpreadsheetBackupNoDrive_(ss, timeZone) {
  const stamp = Utilities.formatDate(new Date(), timeZone, 'yyyyMMdd-HHmmss');
  const backupName = `${ss.getName()} — BACKUP TRƯỚC SYNC 40 TUẦN ${stamp}`;

  try {
    const backup = SpreadsheetApp.create(backupName);
    const tempSheet = backup.getSheets()[0];
    tempSheet.setName('__TEMP_LBG_BACKUP__');

    const sourceSheets = ss.getSheets();
    if (!sourceSheets.length) {
      throw new Error('File nguồn không có sheet nào để sao lưu.');
    }

    sourceSheets.forEach((sourceSheet, index) => {
      const copied = sourceSheet.copyTo(backup);
      copied.setName(sourceSheet.getName());
      backup.setActiveSheet(copied);
      backup.moveActiveSheet(index + 1);
    });

    backup.deleteSheet(tempSheet);
    SpreadsheetApp.flush();

    return {
      id: backup.getId(),
      name: backup.getName(),
      url: backup.getUrl()
    };
  } catch (error) {
    throw new Error(
      'Không tạo được BACKUP TOÀN FILE nên hệ thống DỪNG trước khi sửa. Chi tiết: ' +
      (error && error.message ? error.message : error)
    );
  }
}
