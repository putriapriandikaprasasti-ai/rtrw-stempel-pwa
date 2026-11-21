export type OutletId = 'pemuda' | 'awanncosta';

export type AppRoute =
  | 'landing'
  | 'auth-member'
  | 'member-app'
  | 'auth-staff'
  | 'cashier'
  | 'admin';

export type MemberTab = 'kartu' | 'voucher' | 'riwayat' | 'peringkat' | 'qr';

export type AdminTab =
  | 'ringkasan'
  | 'klaim'
  | 'analisis'
  | 'transaksi'
  | 'menu-keseluruhan'
  | 'menu-cepat'
  | 'warga'
  | 'database-anggota'
  | 'pesan-wa'
  | 'aturan'
  | 'konten-beranda'
  | 'staf-member-ui'
  | 'akun-kasir';

export type ViewportMode = 'desktop' | 'mobile';

export interface StaffMemberUiConfig {
  // Login Staf
  staffHeaderBadge: string;
  staffLoginTitle: string;
  staffLoginSubtitle: string;
  staffOutletLabel: string;
  staffLoginButtonText: string;
  // Layar Kasir POS
  cashierHeaderBadge: string;
  cashierStep1Title: string;
  cashierStep2Title: string;
  cashierEmptyPrompt: string;
  cashierSubmitButtonText: string;
  // Tab Kartu Member & Fisik Kartu Stempel
  memberHeaderBadge: string;
  memberGreetingPrefix: string;
  cardBrandTitle: string;
  cardSubtitle: string;
  cardNumberLabel: string;
  memberPosNotice: string;
  memberQrCtaText: string;
  memberProgressSuffix: string;
  memberCardFullText: string;
}

export interface LandingContent {
  heroKicker: string;
  heroLine1: string;
  heroItalicWord: string;
  heroLine3: string;
  heroSubtitle: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  heroCardHolder: string;
  heroCardCode: string;
  heroCardCaption: string;
  footerCopyright: string;
  footerInstallHint: string;
}

export interface OutletInfo {
  id: OutletId;
  code: string;
  name: string;
  shortName: string;
  area: string;
  address: string;
  hours: string;
  phone: string;
  signatureMenu: string[];
  image: string;
}

export interface Voucher {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  type: 'discount_10' | 'discount_15' | 'free_drink' | 'birthday';
  discountPercent?: number;
  maxDiscountValue?: number;
  status: 'active' | 'used' | 'expired';
  issuedAt: string;
  expiresAt: string;
  usedAt?: string;
  usedOutlet?: OutletId;
  description: string;
}

export interface StampHistoryEntry {
  slot: number;
  date: string;
  outlet: OutletId;
  item: string;
}

export interface Member {
  id: string;
  name: string;
  firstName: string;
  phone: string;
  email?: string;
  pin: string;
  cardNumber: string;
  serialCode: string;
  stamps: number; // 0..10
  totalCupsAllTime: number;
  totalSpentAllTime: number;
  completedCards: number;
  birthday?: string; // e.g. "15 November"
  joinedAt: string;
  lastUsedAt: string;
  lastUsedOutlet: OutletId;
  membershipExpiresAt: string;
  membershipStatus: 'aktif' | 'segera_berakhir' | 'kedaluwarsa';
  favoriteOutlet: OutletId;
  vouchers: Voucher[];
  stampDates: StampHistoryEntry[];
}

export interface Transaction {
  id: string;
  memberId: string;
  memberName: string;
  memberSerial: string;
  outlet: OutletId;
  date: string;
  time: string;
  isoDate: string;
  items: string[];
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  stampEarned: boolean;
  voucherUsedTitle?: string;
  cashierName: string;
}

export interface StaffAccount {
  id: string;
  name: string;
  role: 'kasir' | 'admin_outlet' | 'admin_pusat';
  roleLabel: string;
  outlet: OutletId | 'all';
  username: string;
  password: string;
  phone?: string;
  email?: string;
  active: boolean;
  transactionsToday: number;
  lastActive: string;
}

export interface ProgramRules {
  minSpendForStamp: number;
  voucherValidityDays: number;
  milestone3Label: string;
  milestone6Label: string;
  milestone10Label: string;
  birthdayRewardEnabled: boolean;
  allowCrossOutlet: boolean;
  freeDrinkOptions: string[];
  landingSectionTitle: string;
  landingProgramIntro: string;
  landingMilestone3Desc: string;
  landingMilestone6Desc: string;
  landingMilestone10Desc: string;
}

export interface DailyRevenuePoint {
  dateLabel: string;
  isoDate: string;
  pemudaRevenue: number;
  awanncostaRevenue: number;
  pemudaTx: number;
  awanncostaTx: number;
}

export interface WAMessageTemplate {
  id: string;
  title: string;
  trigger: string;
  audienceCount: number;
  messagePreview: string;
  lastSent: string;
  enabled: boolean;
}

export type MenuCategory =
  | 'Kopi'
  | 'Signature'
  | 'Non-Kopi'
  | 'Pastry & Camilan';

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  outlets: OutletId[];
  isQuickMenu: boolean;
  active: boolean;
  description?: string;
}
