// ═══════════════════════════════════════════════════════════════
//   GOOGLE APPS SCRIPT — Tracer Study PSP MSP FPIK UNSRAT
//   Paste this code at: script.google.com
//   Deploy → Web App → Execute as: Me, Anyone can access
// ═══════════════════════════════════════════════════════════════

const SHEET_NAME = 'Tracer Study';

function doPost(e) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let sheet   = ss.getSheetByName(SHEET_NAME);

    // Create sheet with headers if not exists
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      const headers = [
        'ID','Tanggal','Nama','WhatsApp','Email','Jenis Responden',
        'Tahun Lulus','Status Saat Ini','Instansi','Jabatan','Kota',
        'Nama Instansi (Pengguna)','Nama Pengguna Lulusan',
        'Jabatan Pengguna','Nama Lulusan Digunakan',
        'Kesediaan','Catatan'
      ];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground('#1d4ed8')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
    }

    const data = JSON.parse(e.postData.contents);
    sheet.appendRow([
      data.id              || '',
      data.tanggal         || new Date().toISOString(),
      data.nama            || '',
      data.whatsapp        || '',
      data.email           || '',
      data.jenis           || '',
      data.tahun_lulus     || '',
      data.status_saat_ini || '',
      data.instansi        || '',
      data.jabatan         || '',
      data.kota            || '',
      data.nama_instansi   || '',
      data.nama_pengguna   || '',
      data.jabatan_pengguna|| '',
      data.nama_lulusan    || '',
      data.kesediaan       || '',
      data.catatan         || '',
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'Tracer Study API aktif' }))
    .setMimeType(ContentService.MimeType.JSON);
}
