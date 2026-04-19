-- ═══════════════════════════════════════════════════════════════
--   SUPABASE SETUP — Tracer Study PSP MSP FPIK UNSRAT
--   Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

-- 1. Buat tabel
CREATE TABLE IF NOT EXISTS tracer_study (
  id               TEXT PRIMARY KEY,
  tanggal          TEXT,
  nama             TEXT,
  nim              TEXT,
  whatsapp         TEXT,
  email            TEXT,
  jenis            TEXT,
  tahun_lulus      TEXT,
  status_saat_ini  TEXT,
  instansi         TEXT,
  jabatan          TEXT,
  kota             TEXT,
  nama_instansi    TEXT,
  nama_pengguna    TEXT,
  jabatan_pengguna TEXT,
  wa_pengguna      TEXT,
  email_pengguna   TEXT,
  nama_lulusan     TEXT,
  kesediaan        TEXT,
  catatan          TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE tracer_study ENABLE ROW LEVEL SECURITY;

-- 3. Izinkan siapa saja INSERT (untuk form publik)
CREATE POLICY "Allow public insert"
  ON tracer_study FOR INSERT
  TO anon
  WITH CHECK (true);

-- 4. Izinkan siapa saja SELECT (untuk dashboard admin)
CREATE POLICY "Allow public select"
  ON tracer_study FOR SELECT
  TO anon
  USING (true);

-- 5. Izinkan siapa saja DELETE (untuk hapus data dari dashboard)
CREATE POLICY "Allow public delete"
  ON tracer_study FOR DELETE
  TO anon
  USING (true);
