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
  try {
    const action = e && e.parameter && e.parameter.action;

    // Default: status check
    if (!action || action !== 'getData') {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'Tracer Study API aktif' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // action=getData — return all rows as JSON array
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const rows   = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
      // Only header row or empty
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Map rows to objects (skip header row at index 0)
    const fields = [
      'id','tanggal','nama','whatsapp','email','jenis',
      'tahun_lulus','status_saat_ini','instansi','jabatan','kota',
      'nama_instansi','nama_pengguna','jabatan_pengguna','nama_lulusan',
      'kesediaan','catatan'
    ];

    const data = rows.slice(1).map(row => {
      const obj = {};
      fields.forEach((f, i) => {
        const val = row[i];
        // Convert Date objects from Sheets to ISO string
        obj[f] = val instanceof Date ? val.toISOString() : String(val || '');
      });
      return obj;
    }).filter(obj => obj.id && obj.id.trim() !== ''); // skip empty rows

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
