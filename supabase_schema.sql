-- ============================================================================
-- RTRW — Kartu Stempel Digital
-- Skrip Skema Database Supabase (PostgreSQL)
-- Disusun berdasarkan src/types.ts dan alur di src/App.tsx,
-- src/views/MemberAppView.tsx, src/views/CashierView.tsx, & AdminDashboardView.tsx
-- ============================================================================

-- Ekstensi standar Supabase untuk UUID / token acak
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. FUNGSI TRIGGER UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. TABEL OUTLET (OutletInfo)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.outlets (
  id TEXT PRIMARY KEY, -- 'pemuda' | 'awanncosta'
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  area TEXT NOT NULL,
  address TEXT NOT NULL,
  hours TEXT NOT NULL,
  phone TEXT NOT NULL,
  signature_menu TEXT[] NOT NULL DEFAULT '{}',
  image TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_outlets_updated_at ON public.outlets;
CREATE TRIGGER trg_outlets_updated_at
  BEFORE UPDATE ON public.outlets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 3. TABEL MEMBER / WARGA (Member)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.members (
  id TEXT PRIMARY KEY DEFAULT ('mem-' || encode(gen_random_bytes(6), 'hex')),
  name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  pin TEXT NOT NULL,
  card_number TEXT NOT NULL DEFAULT '01',
  serial_code TEXT NOT NULL UNIQUE DEFAULT ('RTRW-' || upper(encode(gen_random_bytes(4), 'hex'))),
  stamps INTEGER NOT NULL DEFAULT 0 CHECK (stamps >= 0 AND stamps <= 10),
  total_cups_all_time INTEGER NOT NULL DEFAULT 0 CHECK (total_cups_all_time >= 0),
  total_spent_all_time BIGINT NOT NULL DEFAULT 0 CHECK (total_spent_all_time >= 0),
  completed_cards INTEGER NOT NULL DEFAULT 0 CHECK (completed_cards >= 0),
  birthday TEXT,
  joined_at TEXT NOT NULL DEFAULT to_char(NOW(), 'DD Mon YYYY'),
  last_used_at TEXT NOT NULL DEFAULT to_char(NOW(), 'DD Mon YYYY'),
  last_used_outlet TEXT NOT NULL DEFAULT 'pemuda' REFERENCES public.outlets(id) ON UPDATE CASCADE,
  membership_expires_at TEXT NOT NULL DEFAULT to_char(NOW() + INTERVAL '1 year', 'DD Mon YYYY'),
  membership_status TEXT NOT NULL DEFAULT 'aktif'
    CHECK (membership_status IN ('aktif', 'segera_berakhir', 'kedaluwarsa')),
  favorite_outlet TEXT NOT NULL DEFAULT 'pemuda' REFERENCES public.outlets(id) ON UPDATE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_serial_code ON public.members (serial_code);
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members (phone);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members (membership_status);
CREATE INDEX IF NOT EXISTS idx_members_leaderboard ON public.members (total_cups_all_time DESC);

DROP TRIGGER IF EXISTS trg_members_updated_at ON public.members;
CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 4. TABEL KARTU STEMPEL (Stamp Cards - mendukung banyak siklus kartu/member)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stamp_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id TEXT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  card_number TEXT NOT NULL DEFAULT '01',
  serial_code TEXT NOT NULL,
  stamps_count INTEGER NOT NULL DEFAULT 0 CHECK (stamps_count >= 0 AND stamps_count <= 10),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, card_number)
);

CREATE INDEX IF NOT EXISTS idx_stamp_cards_member_status ON public.stamp_cards (member_id, status);

DROP TRIGGER IF EXISTS trg_stamp_cards_updated_at ON public.stamp_cards;
CREATE TRIGGER trg_stamp_cards_updated_at
  BEFORE UPDATE ON public.stamp_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 5. TABEL VOUCHER (Voucher)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vouchers (
  id TEXT PRIMARY KEY DEFAULT ('vcr-' || encode(gen_random_bytes(6), 'hex')),
  member_id TEXT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('discount_10', 'discount_15', 'free_drink', 'birthday')),
  discount_percent INTEGER CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100)),
  max_discount_value BIGINT CHECK (max_discount_value IS NULL OR max_discount_value >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  used_outlet TEXT REFERENCES public.outlets(id) ON UPDATE CASCADE,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_member_status ON public.vouchers (member_id, status);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON public.vouchers (code);

DROP TRIGGER IF EXISTS trg_vouchers_updated_at ON public.vouchers;
CREATE TRIGGER trg_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 6. TABEL AKUN STAF & KASIR (StaffAccount)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.staff_accounts (
  id TEXT PRIMARY KEY DEFAULT ('stf-' || encode(gen_random_bytes(6), 'hex')),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('kasir', 'admin_outlet', 'admin_pusat')),
  role_label TEXT NOT NULL,
  outlet TEXT NOT NULL DEFAULT 'pemuda' CHECK (outlet IN ('pemuda', 'awanncosta', 'all')),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL DEFAULT '••••••',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  transactions_today INTEGER NOT NULL DEFAULT 0 CHECK (transactions_today >= 0),
  last_active TEXT NOT NULL DEFAULT 'Baru dibuat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_username ON public.staff_accounts (username);

DROP TRIGGER IF EXISTS trg_staff_accounts_updated_at ON public.staff_accounts;
CREATE TRIGGER trg_staff_accounts_updated_at
  BEFORE UPDATE ON public.staff_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 7. TABEL RIWAYAT TRANSAKSI POS (Transaction)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY, -- cth: 'TX-20261121-01'
  member_id TEXT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_serial TEXT NOT NULL,
  outlet TEXT NOT NULL REFERENCES public.outlets(id) ON UPDATE CASCADE,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  iso_date DATE NOT NULL,
  items TEXT[] NOT NULL DEFAULT '{}',
  gross_amount BIGINT NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
  discount_amount BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  net_amount BIGINT NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
  stamp_earned BOOLEAN NOT NULL DEFAULT FALSE,
  voucher_id TEXT REFERENCES public.vouchers(id) ON DELETE SET NULL,
  voucher_used_title TEXT,
  cashier_id TEXT REFERENCES public.staff_accounts(id) ON DELETE SET NULL,
  cashier_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_member_id ON public.transactions (member_id, iso_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_outlet_date ON public.transactions (outlet, iso_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions (created_at DESC);

-- ============================================================================
-- 8. TABEL RIWAYAT SLOT STEMPEL (StampHistoryEntry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stamp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id TEXT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  stamp_card_id UUID REFERENCES public.stamp_cards(id) ON DELETE CASCADE,
  transaction_id TEXT REFERENCES public.transactions(id) ON DELETE SET NULL,
  slot INTEGER NOT NULL CHECK (slot >= 1 AND slot <= 10),
  date TEXT NOT NULL,
  outlet TEXT NOT NULL REFERENCES public.outlets(id) ON UPDATE CASCADE,
  item TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stamp_history_member_slot ON public.stamp_history (member_id, slot);
CREATE INDEX IF NOT EXISTS idx_stamp_history_card ON public.stamp_history (stamp_card_id, slot);

-- ============================================================================
-- 9. TABEL MENU KESELURUHAN & MENU CEPAT KASIR (MenuItem)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.menu_items (
  id TEXT PRIMARY KEY DEFAULT ('menu-' || encode(gen_random_bytes(6), 'hex')),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Kopi', 'Signature', 'Non-Kopi', 'Pastry & Camilan')),
  price BIGINT NOT NULL CHECK (price >= 0),
  outlets TEXT[] NOT NULL DEFAULT ARRAY['pemuda', 'awanncosta'],
  is_quick_menu BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_quick ON public.menu_items (active, is_quick_menu, sort_order);

DROP TRIGGER IF EXISTS trg_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER trg_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 10. TABEL ATURAN PROGRAM (ProgramRules)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.program_rules (
  id TEXT PRIMARY KEY DEFAULT 'default',
  min_spend_for_stamp BIGINT NOT NULL DEFAULT 20000 CHECK (min_spend_for_stamp >= 0),
  voucher_validity_days INTEGER NOT NULL DEFAULT 30 CHECK (voucher_validity_days > 0),
  milestone_3_label TEXT NOT NULL DEFAULT 'Diskon 10%',
  milestone_6_label TEXT NOT NULL DEFAULT 'Diskon 15%',
  milestone_10_label TEXT NOT NULL DEFAULT 'Gratis 1 Minuman',
  birthday_reward_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  allow_cross_outlet BOOLEAN NOT NULL DEFAULT TRUE,
  free_drink_options TEXT[] NOT NULL DEFAULT '{}',
  landing_section_title TEXT NOT NULL,
  landing_program_intro TEXT NOT NULL,
  landing_milestone_3_desc TEXT NOT NULL,
  landing_milestone_6_desc TEXT NOT NULL,
  landing_milestone_10_desc TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_program_rules_updated_at ON public.program_rules;
CREATE TRIGGER trg_program_rules_updated_at
  BEFORE UPDATE ON public.program_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 11. TABEL KONTEN BERANDA (LandingContent)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.landing_content (
  id TEXT PRIMARY KEY DEFAULT 'default',
  hero_kicker TEXT NOT NULL,
  hero_line_1 TEXT NOT NULL,
  hero_italic_word TEXT NOT NULL,
  hero_line_3 TEXT NOT NULL,
  hero_subtitle TEXT NOT NULL,
  hero_primary_cta TEXT NOT NULL,
  hero_secondary_cta TEXT NOT NULL,
  hero_card_holder TEXT NOT NULL,
  hero_card_code TEXT NOT NULL,
  hero_card_caption TEXT NOT NULL,
  footer_copyright TEXT NOT NULL,
  footer_install_hint TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_landing_content_updated_at ON public.landing_content;
CREATE TRIGGER trg_landing_content_updated_at
  BEFORE UPDATE ON public.landing_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 12. TABEL PENGATURAN TEKS LOGIN STAF, KASIR & KARTU MEMBER (StaffMemberUiConfig)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ui_configs (
  id TEXT PRIMARY KEY DEFAULT 'default',
  staff_header_badge TEXT NOT NULL,
  staff_login_title TEXT NOT NULL,
  staff_login_subtitle TEXT NOT NULL,
  staff_outlet_label TEXT NOT NULL,
  staff_login_button_text TEXT NOT NULL,
  cashier_header_badge TEXT NOT NULL,
  cashier_step_1_title TEXT NOT NULL,
  cashier_step_2_title TEXT NOT NULL,
  cashier_empty_prompt TEXT NOT NULL,
  cashier_submit_button_text TEXT NOT NULL,
  member_header_badge TEXT NOT NULL,
  member_greeting_prefix TEXT NOT NULL,
  card_brand_title TEXT NOT NULL,
  card_subtitle TEXT NOT NULL,
  card_number_label TEXT NOT NULL,
  member_pos_notice TEXT NOT NULL,
  member_qr_cta_text TEXT NOT NULL,
  member_progress_suffix TEXT NOT NULL,
  member_card_full_text TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_ui_configs_updated_at ON public.ui_configs;
CREATE TRIGGER trg_ui_configs_updated_at
  BEFORE UPDATE ON public.ui_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 13. TABEL TEMPLATE PESAN WHATSAPP (WAMessageTemplate)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wa_message_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  trigger TEXT NOT NULL,
  audience_count INTEGER NOT NULL DEFAULT 0,
  message_preview TEXT NOT NULL,
  last_sent TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_wa_templates_updated_at ON public.wa_message_templates;
CREATE TRIGGER trg_wa_templates_updated_at
  BEFORE UPDATE ON public.wa_message_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 14. TABEL SERI OMZET HARIAN UNTUK GRAFIK DASBOR ADMIN (DailyRevenuePoint)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_revenue_series (
  iso_date DATE PRIMARY KEY,
  date_label TEXT NOT NULL,
  pemuda_revenue BIGINT NOT NULL DEFAULT 0,
  awanncosta_revenue BIGINT NOT NULL DEFAULT 0,
  pemuda_tx INTEGER NOT NULL DEFAULT 0,
  awanncosta_tx INTEGER NOT NULL DEFAULT 0
);

-- ============================================================================
-- 15. ROW LEVEL SECURITY (RLS) & HAK AKSES DASAR UNTUK WEB APP SUPABASE
-- Catatan: Mengizinkan anon & authenticated membaca/menulis agar aplikasi web
-- (Member, Kasir POS, & Dasbor Admin) berjalan lancar tanpa error 401/403.
-- Jika kelak memakai Supabase Auth JWT, perketat policy berdasarkan role/uid.
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'outlets',
    'members',
    'stamp_cards',
    'vouchers',
    'staff_accounts',
    'transactions',
    'stamp_history',
    'menu_items',
    'program_rules',
    'landing_content',
    'ui_configs',
    'wa_message_templates',
    'daily_revenue_series'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "allow_web_read_write_%s" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "allow_web_read_write_%s" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);',
      tbl,
      tbl
    );
  END LOOP;
END $$;

-- ============================================================================
-- 16. DATA AWAL (SEED DATA SESUAI src/data/mockData.ts)
-- ============================================================================

-- Outlet
INSERT INTO public.outlets (id, code, name, short_name, area, address, hours, phone, signature_menu, image)
VALUES
  (
    'pemuda',
    '01',
    'RTRW Pemuda',
    'Pemuda',
    'Tengah Kota Semarang',
    'Jl. Pemuda No. 118, Sekayu, Semarang Tengah',
    '07:00 – 22:00 WIB',
    '024-8410-291',
    ARRAY['Kopi Susu Warga', 'Americano Pemuda', 'Butter Croissant'],
    '/src/assets/images/outlet_rtrw_pemuda_1795238279026.jpg'
  ),
  (
    'awanncosta',
    '02',
    'RTRW AWANNCOSTA',
    'AWANNCOSTA',
    'POJ City, Semarang',
    'Kawasan POJ City Kav. 08, Semarang Barat',
    '08:00 – 23:00 WIB',
    '024-7609-448',
    ARRAY['Cold Brew POJ', 'Sea Salt Caramel Latte', 'Matcha Oat'],
    '/src/assets/images/outlet_rtrw_awanncosta_1795238279255.jpg'
  )
ON CONFLICT (id) DO NOTHING;

-- Aturan Program
INSERT INTO public.program_rules (
  id, min_spend_for_stamp, voucher_validity_days,
  milestone_3_label, milestone_6_label, milestone_10_label,
  birthday_reward_enabled, allow_cross_outlet, free_drink_options,
  landing_section_title, landing_program_intro,
  landing_milestone_3_desc, landing_milestone_6_desc, landing_milestone_10_desc
)
VALUES (
  'default',
  20000,
  30,
  'Diskon 10%',
  'Diskon 15%',
  'Gratis 1 Minuman',
  TRUE,
  TRUE,
  ARRAY['Kopi Susu Warga', 'Americano Pemuda', 'Cold Brew POJ', 'Matcha Oat Latte', 'Sea Salt Caramel Latte', 'Manual Brew V60'],
  'Tiga titik di satu kartu.',
  'Semua menu dihitung. Stempel diberikan untuk transaksi harga normal dengan belanja minimal Rp20.000 — transaksi dengan voucher atau promo lain tidak mendapat stempel. Voucher sekali pakai dan berlaku di outlet mana saja.',
  'Terbit otomatis saat stempel ini tercapai. Pakai di transaksi berikutnya — bahkan di hari yang sama.',
  'Potongan lebih besar di tahap berikutnya, berlaku di kedua outlet RTRW Semarang.',
  'Kartu penuh? Pilih satu minuman favorit di kunjungan berikutnya, lalu mulai kartu baru.'
)
ON CONFLICT (id) DO NOTHING;

-- Konten Beranda
INSERT INTO public.landing_content (
  id, hero_kicker, hero_line_1, hero_italic_word, hero_line_3, hero_subtitle,
  hero_primary_cta, hero_secondary_cta, hero_card_holder, hero_card_code,
  hero_card_caption, footer_copyright, footer_install_hint
)
VALUES (
  'default',
  'SEMARANG · DUA OUTLET, SATU KARTU',
  'Setiap cangkir',
  'meninggalkan',
  'jejak.',
  'Kartu stempel digital warga RTRW. Kumpulkan 10 stempel di RTRW Pemuda maupun RTRW AWANNCOSTA —diskon 10%, diskon 15%, lalu satu minuman gratis pilihanmu.',
  'Daftar gratis',
  'Saya sudah anggota',
  'WARGA RTRW',
  'RTRW-2026',
  'Kumpulkan 10 stempel · Diskon 10% · Diskon 15% · Gratis 1 Minuman',
  '© RTRW Coffee · Semarang',
  'Pasang aplikasi: menu browser → “Tambahkan ke Layar Utama”'
)
ON CONFLICT (id) DO NOTHING;

-- Pengaturan Teks Login Staf, Kasir & Kartu Member
INSERT INTO public.ui_configs (
  id, staff_header_badge, staff_login_title, staff_login_subtitle, staff_outlet_label, staff_login_button_text,
  cashier_header_badge, cashier_step_1_title, cashier_step_2_title, cashier_empty_prompt, cashier_submit_button_text,
  member_header_badge, member_greeting_prefix, card_brand_title, card_subtitle, card_number_label,
  member_pos_notice, member_qr_cta_text, member_progress_suffix, member_card_full_text
)
VALUES (
  'default',
  'RUANG STAF',
  'Masuk staf',
  'Kasir wajib memilih outlet tempat bertugas hari ini.',
  'Outlet',
  'Masuk',
  'KASIR',
  'Temukan pelanggan',
  'Catat transaksi',
  'Scan QR, masukkan kode seri, atau cari pelanggan untuk mulai mencatat transaksi.',
  'Simpan & Proses Transaksi',
  'KARTU STEMPEL',
  'HALO,',
  'RTRW',
  'KARTU STEMPEL WARGA',
  'KARTU NO.',
  'Stempel hanya ditambahkan setelah transaksi melalui scan QR atau input manual di Kasir POS.',
  'Tunjukkan QR ke Kasir',
  'pembelian lagi menuju 1 minuman gratis',
  'Kartu penuh! Tukarkan 1 minuman gratis di kasir'
)
ON CONFLICT (id) DO NOTHING;

-- Akun Staf & Admin
INSERT INTO public.staff_accounts (id, name, role, role_label, outlet, username, password, active, transactions_today, last_active)
VALUES
  ('stf-dimas', 'Dimas', 'kasir', 'Kasir Pemuda', 'pemuda', 'dimas.pemuda', '••••••', TRUE, 14, 'Hari ini, 16:42'),
  ('stf-sinta', 'Sinta', 'kasir', 'Kasir AWANNCOSTA', 'awanncosta', 'sinta.pojo', '••••••', TRUE, 11, 'Hari ini, 19:08'),
  ('stf-raka', 'Raka', 'kasir', 'Kasir Pemuda (Shift Pagi)', 'pemuda', 'raka.pemuda', '••••••', TRUE, 9, 'Kemarin, 14:20'),
  ('stf-admin-pemuda', 'Admin RTRW Pemuda', 'admin_outlet', 'Admin Outlet · RTRW Pemuda', 'pemuda', 'admin.pemuda', '••••••', TRUE, 0, 'Hari ini, 12:14'),
  ('stf-admin-pusat', 'Admin Pusat RTRW', 'admin_pusat', 'Admin Pusat · Semua Outlet', 'all', 'admin.pusat', '••••••', TRUE, 0, 'Hari ini, 11:05')
ON CONFLICT (id) DO NOTHING;

-- Daftar Menu Keseluruhan & Menu Cepat
INSERT INTO public.menu_items (id, name, category, price, outlets, is_quick_menu, sort_order, active, description)
VALUES
  ('menu-kopi-susu-warga', 'Kopi Susu Warga', 'Signature', 28000, ARRAY['pemuda', 'awanncosta'], TRUE, 1, TRUE, 'Espresso blend house RTRW dengan susu segar & gula aren.'),
  ('menu-americano-pemuda', 'Americano Pemuda', 'Kopi', 24000, ARRAY['pemuda', 'awanncosta'], TRUE, 2, TRUE, 'Double shot espresso dingin/panas karakter bersih & cerah.'),
  ('menu-cold-brew-poj', 'Cold Brew POJ', 'Signature', 36000, ARRAY['pemuda', 'awanncosta'], TRUE, 3, TRUE, 'Seduhan dingin 14 jam biji single origin pilihan.'),
  ('menu-matcha-oat', 'Matcha Oat Latte', 'Non-Kopi', 42000, ARRAY['pemuda', 'awanncosta'], TRUE, 4, TRUE, 'Uji matcha ceremonial grade dipadu oat milk creamy.'),
  ('menu-sea-salt-caramel', 'Sea Salt Caramel Latte', 'Signature', 38000, ARRAY['pemuda', 'awanncosta'], TRUE, 5, TRUE, 'Latte manis gurih dengan foam sea salt & saus karamel.'),
  ('menu-butter-croissant', 'Butter Croissant', 'Pastry & Camilan', 32000, ARRAY['pemuda', 'awanncosta'], TRUE, 6, TRUE, 'Croissant mentega renyah panggang hangat setiap pagi.'),
  ('menu-cappuccino', 'Cappuccino Klasik', 'Kopi', 30000, ARRAY['pemuda', 'awanncosta'], FALSE, 7, TRUE, 'Espresso dengan microfoam susu lembut seimbang.'),
  ('menu-v60-manual', 'V60 Filter Brew', 'Kopi', 35000, ARRAY['pemuda', 'awanncosta'], FALSE, 8, TRUE, 'Seduh manual pour-over dengan pilihan biji Nusantara.'),
  ('menu-chocolate-velvet', 'Chocolate Velvet', 'Non-Kopi', 34000, ARRAY['pemuda', 'awanncosta'], FALSE, 9, TRUE, 'Cokelat Belgia pekat disajikan panas atau dingin.'),
  ('menu-lychee-tea', 'Iced Lychee Tea', 'Non-Kopi', 28000, ARRAY['awanncosta'], FALSE, 10, TRUE, 'Teh seduh segar dengan buah leci utuh, favorit tepi pantai.'),
  ('menu-almond-croissant', 'Almond Croissant', 'Pastry & Camilan', 36000, ARRAY['pemuda', 'awanncosta'], FALSE, 11, TRUE, 'Croissant isi krim almon panggang tabur kacang iris.'),
  ('menu-banana-bread', 'Roasted Banana Bread', 'Pastry & Camilan', 29000, ARRAY['pemuda'], FALSE, 12, TRUE, 'Roti pisang panggang hangat cocok teman kopi pagi.')
ON CONFLICT (id) DO NOTHING;

-- Template Pesan WhatsApp
INSERT INTO public.wa_message_templates (id, title, trigger, audience_count, message_preview, last_sent, enabled)
VALUES
  ('wa-bday', 'Ucapan & Hadiah Ulang Tahun', 'Otomatis tiap tanggal 1 di bulan ulang tahun anggota', 6, 'Halo {nama}, selamat ulang tahun dari keluarga RTRW! Voucher Gratis 1 Minuman sudah aktif di kartu stempelmu sampai akhir bulan ini. Yuk mampir ke RTRW Pemuda atau AWANNCOSTA.', '01 Nov 2026 · 6 terkirim', TRUE),
  ('wa-almost-full', 'Pengingat Stempel ke-9 (Kurang 1)', 'Otomatis 2 hari setelah anggota mencapai 9 stempel', 4, 'Halo {nama}, tinggal 1 cangkir lagi menuju 1 Minuman Gratis di kartu RTRW kamu ({kode_kartu}). Tunjukkan QR kamu ke kasir saat berkunjung ya!', '19 Nov 2026 · 4 terkirim', TRUE),
  ('wa-voucher-expiry', 'Pengingat Voucher H-5 Kadaluarsa', 'Otomatis 5 hari sebelum masa berlaku voucher habis', 9, 'Halo {nama}, voucher {nama_voucher} kamu akan berakhir pada {tanggal_akhir}. Jangan lupa dipakai di RTRW Pemuda atau AWANNCOSTA sebelum hangus.', '18 Nov 2026 · 9 terkirim', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Data Awal Member / Warga
INSERT INTO public.members (
  id, name, first_name, phone, email, pin, card_number, serial_code,
  stamps, total_cups_all_time, total_spent_all_time, completed_cards,
  birthday, joined_at, last_used_at, last_used_outlet,
  membership_expires_at, membership_status, favorite_outlet
)
VALUES
  ('mem-sekar', 'Sekar Ayu', 'Sekar', '081234567890', 'sekar.ayu@gmail.com', '123456', '01', 'RTRW-BAF6F4F7', 7, 27, 1095000, 2, '15 November', '14 Mei 2026', '20 Nov 2026', 'pemuda', '14 Mei 2027', 'aktif', 'pemuda'),
  ('mem-bagas', 'Bagas Pratama', 'Bagas', '081398765432', 'bagas.p@outlook.com', '654321', '01', 'RTRW-C82D11A9', 4, 34, 1380000, 3, '04 Mei', '02 Mar 2026', '19 Nov 2026', 'awanncosta', '02 Mar 2027', 'aktif', 'awanncosta'),
  ('mem-nadya', 'Nadya Kusuma', 'Nadya', '085611223344', 'nadya.kusuma@gmail.com', '112233', '01', 'RTRW-91E40B22', 9, 39, 1640000, 3, '22 Agustus', '19 Feb 2026', '20 Nov 2026', 'pemuda', '19 Des 2026', 'segera_berakhir', 'pemuda'),
  ('mem-rizal', 'Rizal Mahendra', 'Rizal', '082144556677', 'rizal.m@yahoo.com', '445566', '01', 'RTRW-4F7A88C1', 2, 22, 890000, 2, '10 Januari', '10 Jun 2026', '19 Nov 2026', 'pemuda', '10 Jun 2027', 'aktif', 'awanncosta'),
  ('mem-clara', 'Clara Wijaya', 'Clara', '081900223311', 'clara.wijaya@gmail.com', '223344', '01', 'RTRW-7D12E503', 6, 31, 1250000, 2, '29 November', '25 Apr 2026', '17 Nov 2026', 'pemuda', '05 Des 2026', 'segera_berakhir', 'pemuda'),
  ('mem-farhan', 'Farhan Nugroho', 'Farhan', '081577889900', 'farhan.n@icloud.com', '778899', '01', 'RTRW-A309B112', 5, 25, 965000, 2, '03 Desember', '04 Jul 2026', '16 Nov 2026', 'pemuda', '04 Jul 2027', 'aktif', 'pemuda')
ON CONFLICT (id) DO NOTHING;

-- Kartu Stempel Aktif Awal untuk setiap Member
INSERT INTO public.stamp_cards (member_id, card_number, serial_code, stamps_count, status)
SELECT id, card_number, serial_code, stamps, 'active'
FROM public.members
ON CONFLICT (member_id, card_number) DO NOTHING;

-- Voucher Awal
INSERT INTO public.vouchers (
  id, member_id, code, title, subtitle, type, discount_percent, max_discount_value,
  status, issued_at, expires_at, used_at, used_outlet, description
)
VALUES
  ('vcr-sekar-bday', 'mem-sekar', 'RTRW-BDAY-1115', 'Hadiah Ulang Tahun', 'Gratis 1 Minuman Pilihanmu', 'birthday', NULL, 38000, 'active', '01 Nov 2026', '30 Nov 2026', NULL, NULL, 'Gratis 1 minuman reguler atau iced di bulan ulang tahunmu (15 November). Berlaku di RTRW Pemuda maupun AWANNCOSTA.'),
  ('vcr-sekar-10', 'mem-sekar', 'RTRW-D10-8392', 'Diskon 10%', 'Hadiah Stempel ke-3', 'discount_10', 10, NULL, 'active', '09 Nov 2026', '09 Des 2026', NULL, NULL, 'Potongan 10% untuk satu kali transaksi di semua menu. Transaksi menggunakan voucher tidak menambah stempel.'),
  ('vcr-sekar-15', 'mem-sekar', 'RTRW-D15-9941', 'Diskon 15%', 'Hadiah Stempel ke-6', 'discount_15', 15, NULL, 'active', '18 Nov 2026', '18 Des 2026', NULL, NULL, 'Potongan 15% untuk satu kali transaksi di outlet mana saja. Tunjukkan ke kasir saat pembayaran.'),
  ('vcr-sekar-old', 'mem-sekar', 'RTRW-GRT-4120', 'Gratis 1 Minuman', 'Hadiah Kartu Penuh #02', 'free_drink', NULL, 36000, 'used', '18 Okt 2026', '17 Nov 2026', '24 Okt 2026', 'awanncosta', 'Minuman gratis dari kartu stempel sebelumnya.'),
  ('vcr-bagas-10', 'mem-bagas', 'RTRW-D10-5501', 'Diskon 10%', 'Hadiah Stempel ke-3', 'discount_10', 10, NULL, 'active', '16 Nov 2026', '16 Des 2026', NULL, NULL, 'Potongan 10% untuk satu kali transaksi di outlet mana saja.'),
  ('vcr-nadya-15', 'mem-nadya', 'RTRW-D15-7721', 'Diskon 15%', 'Hadiah Stempel ke-6', 'discount_15', 15, NULL, 'active', '14 Nov 2026', '14 Des 2026', NULL, NULL, 'Potongan 15% untuk satu transaksi.'),
  ('vcr-clara-15', 'mem-clara', 'RTRW-D15-1029', 'Diskon 15%', 'Hadiah Stempel ke-6', 'discount_15', 15, NULL, 'active', '19 Nov 2026', '19 Des 2026', NULL, NULL, 'Potongan 15% di kedua outlet RTRW.')
ON CONFLICT (id) DO NOTHING;

-- Riwayat Transaksi Awal
INSERT INTO public.transactions (
  id, member_id, member_name, member_serial, outlet, date, time, iso_date,
  items, gross_amount, discount_amount, net_amount, stamp_earned, voucher_id, voucher_used_title, cashier_id, cashier_name
)
VALUES
  ('TX-20261121-01', 'mem-sekar', 'Sekar Ayu', 'RTRW-BAF6F4F7', 'pemuda', '20 Nov 2026', '16:42', '2026-11-20', ARRAY['Flat White', 'Butter Croissant'], 68000, 0, 68000, TRUE, NULL, NULL, 'stf-dimas', 'Dimas'),
  ('TX-20261121-02', 'mem-nadya', 'Nadya Kusuma', 'RTRW-91E40B22', 'pemuda', '20 Nov 2026', '14:15', '2026-11-20', ARRAY['Kopi Susu Warga', 'Matcha Oat Latte'], 72000, 0, 72000, TRUE, NULL, NULL, 'stf-dimas', 'Dimas'),
  ('TX-20261119-03', 'mem-bagas', 'Bagas Pratama', 'RTRW-C82D11A9', 'awanncosta', '19 Nov 2026', '19:08', '2026-11-19', ARRAY['Caffe Latte', 'Almond Croissant'], 76000, 0, 76000, TRUE, NULL, NULL, 'stf-sinta', 'Sinta'),
  ('TX-20261118-04', 'mem-sekar', 'Sekar Ayu', 'RTRW-BAF6F4F7', 'awanncosta', '18 Nov 2026', '17:30', '2026-11-18', ARRAY['Cold Brew POJ'], 36000, 0, 36000, TRUE, NULL, NULL, 'stf-sinta', 'Sinta'),
  ('TX-20261117-05', 'mem-clara', 'Clara Wijaya', 'RTRW-7D12E503', 'pemuda', '17 Nov 2026', '10:20', '2026-11-17', ARRAY['Iced Americano', 'Kopi Susu Warga'], 62000, 9300, 52700, FALSE, NULL, 'Diskon 15%', 'stf-dimas', 'Dimas'),
  ('TX-20261116-06', 'mem-farhan', 'Farhan Nugroho', 'RTRW-A309B112', 'pemuda', '16 Nov 2026', '15:50', '2026-11-16', ARRAY['Kopi Susu Warga', 'Banana Bread'], 64000, 0, 64000, TRUE, NULL, NULL, 'stf-raka', 'Raka'),
  ('TX-20261114-07', 'mem-sekar', 'Sekar Ayu', 'RTRW-BAF6F4F7', 'pemuda', '14 Nov 2026', '11:05', '2026-11-14', ARRAY['Kopi Susu Warga'], 32000, 0, 32000, TRUE, NULL, NULL, 'stf-dimas', 'Dimas'),
  ('TX-20261111-08', 'mem-sekar', 'Sekar Ayu', 'RTRW-BAF6F4F7', 'pemuda', '11 Nov 2026', '13:45', '2026-11-11', ARRAY['Matcha Oat Latte'], 42000, 0, 42000, TRUE, NULL, NULL, 'stf-raka', 'Raka'),
  ('TX-20261109-09', 'mem-sekar', 'Sekar Ayu', 'RTRW-BAF6F4F7', 'awanncosta', '09 Nov 2026', '18:22', '2026-11-09', ARRAY['Sea Salt Caramel Latte'], 38000, 0, 38000, TRUE, NULL, NULL, 'stf-sinta', 'Sinta'),
  ('TX-20261102-10', 'mem-sekar', 'Sekar Ayu', 'RTRW-BAF6F4F7', 'pemuda', '02 Nov 2026', '09:15', '2026-11-02', ARRAY['Iced Americano'], 28000, 0, 28000, TRUE, NULL, NULL, 'stf-dimas', 'Dimas')
ON CONFLICT (id) DO NOTHING;

-- Riwayat Slot Stempel Awal (hanya isi jika belum ada data di stamp_history)
INSERT INTO public.stamp_history (member_id, stamp_card_id, slot, date, outlet, item)
SELECT v.member_id, sc.id, v.slot, v.date, v.outlet, v.item
FROM (
  VALUES
    ('mem-sekar', 1, '28 Okt 2026', 'pemuda', 'Kopi Susu Warga'),
    ('mem-sekar', 2, '02 Nov 2026', 'pemuda', 'Iced Americano'),
    ('mem-sekar', 3, '09 Nov 2026', 'awanncosta', 'Sea Salt Caramel'),
    ('mem-sekar', 4, '11 Nov 2026', 'pemuda', 'Matcha Oat Latte'),
    ('mem-sekar', 5, '14 Nov 2026', 'pemuda', 'Kopi Susu Warga'),
    ('mem-sekar', 6, '18 Nov 2026', 'awanncosta', 'Cold Brew POJ'),
    ('mem-sekar', 7, '20 Nov 2026', 'pemuda', 'Flat White + Croissant'),
    ('mem-bagas', 1, '08 Nov 2026', 'awanncosta', 'Cold Brew POJ'),
    ('mem-bagas', 2, '12 Nov 2026', 'awanncosta', 'Long Black'),
    ('mem-bagas', 3, '16 Nov 2026', 'pemuda', 'Kopi Susu Warga'),
    ('mem-bagas', 4, '19 Nov 2026', 'awanncosta', 'Caffe Latte'),
    ('mem-rizal', 1, '15 Nov 2026', 'awanncosta', 'Americano'),
    ('mem-rizal', 2, '19 Nov 2026', 'pemuda', 'Es Kopi Susu')
) AS v(member_id, slot, date, outlet, item)
JOIN public.stamp_cards sc
  ON sc.member_id = v.member_id AND sc.status = 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.stamp_history sh WHERE sh.member_id = v.member_id
);
