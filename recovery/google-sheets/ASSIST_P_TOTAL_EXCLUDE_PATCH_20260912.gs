/*
 * PATCH AN TOÀN — TRỢ GIẢNG (P) KHÔNG CỘNG VÀO TỔNG GOOGLE SHEETS
 * Ngày: 12/09/2026
 *
 * Dùng để thay DUY NHẤT hàm buildDynamicTotalFormula_() trong Mã.gs hiện tại.
 *
 * Mục tiêu:
 * - Vẫn hiển thị lớp trợ giảng dạng "1/1 (P)", "1/3 (P)" trong các ô lịch.
 * - Dấu " & " và cách đếm các lớp chính / tiết cộng vẫn giữ nguyên.
 * - Mỗi hậu tố "(P)" bị trừ đúng 1 khỏi tổng.
 * - Ví dụ 15 chính + 1 cộng + 2 trợ => A20 vẫn là "TỔNG: 16 tiết", KHÔNG phải 18.
 * - MỤC LỤC tiếp tục đọc số đầu tiên từ A20 nên vẫn nhận 16.
 *
 * KHÔNG thay doPost(), saveReport(), updateIndex_(), setClassRichText_(), GA,
 * phân quyền, ACCESS_KEY, sheet id hay logic BẢN 2.
 */
function buildDynamicTotalFormula_() {
  return '="TỔNG: "&('
    + 'COUNTA(C9:H13)+COUNTA(C15:H19)'
    + '+SUMPRODUCT(LEN(C9:H13)-LEN(SUBSTITUTE(C9:H13;"&";"")))'
    + '+SUMPRODUCT(LEN(C15:H19)-LEN(SUBSTITUTE(C15:H19;"&";"")))'
    + '-SUMPRODUCT((LEN(C9:H13)-LEN(SUBSTITUTE(C9:H13;"(P)";"")))/3)'
    + '-SUMPRODUCT((LEN(C15:H19)-LEN(SUBSTITUTE(C15:H19;"(P)";"")))/3)'
    + ')&" tiết"';
}
