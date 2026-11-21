import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Cake,
  Check,
  Clock,
  Copy,
  CreditCard,
  History,
  LogOut,
  Moon,
  QrCode,
  Receipt,
  RotateCcw,
  Sparkles,
  Sun,
  Ticket,
  Trophy,
  X,
} from 'lucide-react';
import { QrCodeMatrix } from '../components/QrCodeMatrix';
import { StampCard } from '../components/StampCard';
import { formatRupiah } from '../data/mockData';
import {
  Member,
  MemberTab,
  OutletId,
  ProgramRules,
  Transaction,
  Voucher,
} from '../types';

export interface StampEventPayload {
  memberId: string;
  slot: number;
  outlet: OutletId;
  newlyIssuedVoucher?: string;
  timestamp: number;
}

interface MemberAppViewProps {
  member: Member;
  allMembers: Member[];
  transactions: Transaction[];
  rules: ProgramRules;
  darkMode: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
  onSimulateCashierWithMember: (memberId: string) => void;
  lastStampEvent?: StampEventPayload | null;
}

export const MemberAppView: React.FC<MemberAppViewProps> = ({
  member,
  allMembers,
  transactions,
  rules,
  darkMode,
  onToggleDark,
  onLogout,
  onSimulateCashierWithMember,
  lastStampEvent = null,
}) => {
  const [activeTab, setActiveTab] = useState<MemberTab>('kartu');
  const [voucherFilter, setVoucherFilter] = useState<'active' | 'used'>('active');
  const [outletFilter, setOutletFilter] = useState<'all' | OutletId>('all');
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Live stamping animation state (triggered from Kasir POS or replay)
  const [animatingSlot, setAnimatingSlot] = useState<number | null>(null);
  const [animationNonce, setAnimationNonce] = useState(0);
  const [justStampedLabel, setJustStampedLabel] = useState<string | null>(null);
  const [recentPosStamp, setRecentPosStamp] = useState<{
    slot: number;
    outlet: OutletId;
    voucher?: string;
  } | null>(null);
  const seenEventTsRef = useRef<number>(0);

  // Trigger stamp animation automatically when returning from Kasir POS after a fresh stamp
  useEffect(() => {
    if (
      lastStampEvent &&
      lastStampEvent.memberId === member.id &&
      lastStampEvent.timestamp > seenEventTsRef.current
    ) {
      seenEventTsRef.current = lastStampEvent.timestamp;
      setAnimatingSlot(lastStampEvent.slot);
      setAnimationNonce((n) => n + 1);
      setJustStampedLabel(
        `+1 Stempel · RTRW ${lastStampEvent.outlet === 'pemuda' ? 'Pemuda' : 'AWANNCOSTA'}`
      );
      setRecentPosStamp({
        slot: lastStampEvent.slot,
        outlet: lastStampEvent.outlet,
        voucher: lastStampEvent.newlyIssuedVoucher,
      });
    }
  }, [lastStampEvent, member.id]);

  const handleReplayStampAnimation = () => {
    if (member.stamps <= 0) return;
    setAnimatingSlot(member.stamps);
    setAnimationNonce((n) => n + 1);
    setJustStampedLabel(`Stempel #${member.stamps}`);
  };

  const activeVouchers = member.vouchers.filter((v) => v.status === 'active');
  const usedVouchers = member.vouchers.filter((v) => v.status !== 'active');
  const displayedVouchers =
    voucherFilter === 'active' ? activeVouchers : usedVouchers;

  const memberTransactions = transactions.filter(
    (t) =>
      t.memberId === member.id &&
      (outletFilter === 'all' || t.outlet === outletFilter)
  );

  const sortedLeaderboard = [...allMembers].sort(
    (a, b) => b.totalCupsAllTime - a.totalCupsAllTime
  );

  const remainingToFree = Math.max(0, 10 - member.stamps);
  const progressPercent = Math.min(100, Math.round((member.stamps / 10) * 100));

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const navItems: {
    id: MemberTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'kartu', label: 'Kartu', icon: CreditCard },
    { id: 'voucher', label: 'Voucher', icon: Ticket },
    { id: 'riwayat', label: 'Riwayat', icon: History },
    { id: 'peringkat', label: 'Peringkat', icon: Trophy },
    { id: 'qr', label: 'QR Saya', icon: QrCode },
  ];

  return (
    <div className="min-h-full flex flex-col bg-[#FAF8F4] dark:bg-[#0E1319] text-[#16202C] dark:text-[#F4F1EA]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 w-full bg-[#FAF8F4]/92 dark:bg-[#0E1319]/92 backdrop-blur-md border-b border-[#E6E2DA]/80 dark:border-white/10">
        <div className="max-w-3xl mx-auto px-4 @3xl:px-6 h-14 @3xl:h-16 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2.5 whitespace-nowrap">
            <span className="font-serif-display text-xl @3xl:text-2xl font-bold tracking-tight">
              RTRW
            </span>
            <span className="text-[10px] font-medium tracking-[0.22em] text-[#5B6470] dark:text-[#94A3B8] uppercase">
              KARTU STEMPEL
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleDark}
              aria-label={darkMode ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
              className="w-9 h-9 rounded-full border border-[#E2DDD4] dark:border-white/15 bg-white dark:bg-[#161E29] flex items-center justify-center hover:bg-[#F3EFE6] dark:hover:bg-[#1F2937] transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Keluar"
              title="Keluar dari akun"
              className="w-9 h-9 rounded-full border border-[#E2DDD4] dark:border-white/15 bg-white dark:bg-[#161E29] flex items-center justify-center hover:bg-[#F3EFE6] dark:hover:bg-[#1F2937] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 @3xl:px-2 pt-6 pb-24">
        {activeTab === 'kartu' && (
          <div className="space-y-6">
            {/* Greeting */}
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#646D78] dark:text-[#94A3B8]">
                HALO,
              </p>
              <h1 className="font-serif-display text-4xl font-normal mt-1">
                {member.firstName}.
              </h1>
            </div>

            {/* Brushed Aluminum Stamp Card */}
            <StampCard
              cardNumber={member.cardNumber}
              holderName={member.name}
              serialCode={member.serialCode}
              stamps={member.stamps}
              stampDates={member.stampDates}
              interactive={true}
              animatingSlot={animatingSlot}
              animationNonce={animationNonce}
              justStampedLabel={justStampedLabel}
            />

            {/* Progress Bar */}
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-serif-display text-lg leading-snug">
                  {remainingToFree > 0
                    ? `${remainingToFree} pembelian lagi menuju 1 minuman gratis`
                    : 'Kartu penuh! Tukarkan 1 minuman gratis di kasir'}
                </p>
                <span className="font-mono-code text-xs font-medium text-[#5B6470] dark:text-[#94A3B8] tabular-nums shrink-0">
                  {member.stamps}/10
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-[#E5E0D7] dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#16202C] dark:bg-[#F4F1EA] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Kasir POS Notice & Animation Controls */}
            <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-4 space-y-3">
              {recentPosStamp && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3.5 py-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Stempel #{recentPosStamp.slot} baru diterima dari Kasir RTRW{' '}
                      {recentPosStamp.outlet === 'pemuda'
                        ? 'Pemuda'
                        : 'AWANNCOSTA'}
                    </span>
                  </div>
                  {recentPosStamp.voucher && (
                    <div className="flex items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                      <span>Hadiah baru terbit: {recentPosStamp.voucher}</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('voucher')}
                        className="font-semibold underline cursor-pointer whitespace-nowrap"
                      >
                        Lihat Voucher →
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-start justify-between gap-3">
                <p className="text-xs leading-relaxed text-[#55606E] dark:text-[#A3B1C2]">
                  Stempel hanya ditambahkan setelah transaksi melalui{' '}
                  <strong className="text-[#16202C] dark:text-[#F4F1EA]">
                    scan QR atau input manual di Kasir POS
                  </strong>
                  .
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('qr')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Tunjukkan QR ke Kasir</span>
                </button>
                <button
                  type="button"
                  onClick={handleReplayStampAnimation}
                  disabled={member.stamps <= 0}
                  title="Putar ulang animasi pada stempel terakhir"
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl border border-[#DED9CF] dark:border-white/15 text-xs font-medium hover:bg-[#FAF8F4] dark:hover:bg-white/5 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Putar Ulang Animasi</span>
                </button>
              </div>
            </div>

            {/* Milestones Card */}
            <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 divide-y divide-[#EFECE5] dark:divide-white/10">
              {[
                {
                  step: 3,
                  title: rules.milestone3Label,
                  sub: 'Stempel ke-3',
                },
                {
                  step: 6,
                  title: rules.milestone6Label,
                  sub: 'Stempel ke-6',
                },
                {
                  step: 10,
                  title: rules.milestone10Label,
                  sub: 'Stempel ke-10',
                },
              ].map((m) => {
                const reached = member.stamps >= m.step;
                return (
                  <button
                    key={m.step}
                    type="button"
                    onClick={() => reached && setActiveTab('voucher')}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#FAF8F4]/70 dark:hover:bg-white/[0.02] transition-colors first:rounded-t-2xl last:rounded-b-2xl cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-mono-code text-xs font-semibold tabular-nums shrink-0 ${
                          reached
                            ? 'bg-[#16202C] text-white dark:bg-[#F4F1EA] dark:text-[#16202C]'
                            : 'bg-[#F3EFE6] text-[#646D78] dark:bg-white/10 dark:text-[#94A3B8]'
                        }`}
                      >
                        {m.step}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{m.title}</p>
                        <p className="text-xs text-[#646D78] dark:text-[#94A3B8]">
                          {m.sub}
                        </p>
                      </div>
                    </div>

                    {reached && (
                      <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#5B6470] dark:text-[#CBD5E1]">
                        TERCAPAI
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Voucher Dark Hero Card */}
            <button
              type="button"
              onClick={() => setActiveTab('voucher')}
              className="w-full text-left rounded-2xl bg-[#16202C] dark:bg-[#1E293B] text-white p-5 flex items-center justify-between gap-4 hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/60">
                  VOUCHER AKTIF ({activeVouchers.length})
                </p>
                <p className="font-serif-display text-xl leading-snug mt-1.5">
                  {activeVouchers.length > 0
                    ? activeVouchers.map((v) => v.title).join(' · ')
                    : 'Belum ada voucher aktif saat ini'}
                </p>
              </div>
              <Ticket className="w-5 h-5 text-white/75 shrink-0" />
            </button>

            {/* Birthday Banner */}
            {member.birthday && rules.birthdayRewardEnabled && (
              <div className="rounded-2xl bg-[#F3EFE6] dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-4 flex items-start gap-3">
                <Cake className="w-4 h-4 text-[#5B6470] dark:text-[#CBD5E1] mt-0.5 shrink-0" />
                <p className="text-xs leading-relaxed text-[#394452] dark:text-[#CBD5E1]">
                  Hadiah ulang tahun: gratis 1 minuman di bulan ulang tahunmu (
                  {member.birthday}).
                </p>
              </div>
            )}

            {/* Fine Print */}
            <p className="text-[11px] leading-relaxed text-[#646D78] dark:text-[#94A3B8]">
              Stempel hanya untuk transaksi harga normal dengan belanja minimal
              Rp{rules.minSpendForStamp.toLocaleString('id-ID')}. Transaksi dengan
              voucher atau promo lain tidak mendapat stempel. Voucher berlaku{' '}
              {rules.voucherValidityDays} hari di kedua outlet.
              {rules.freeDrinkOptions.length > 0 && (
                <span className="block mt-1">
                  Pilihan minuman gratis (stempel ke-10):{' '}
                  {rules.freeDrinkOptions.join(', ')}.
                </span>
              )}
            </p>
          </div>
        )}

        {activeTab === 'voucher' && (
          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#646D78] dark:text-[#94A3B8]">
                HADIAH WARGA
              </p>
              <h1 className="font-serif-display text-3xl font-normal mt-1">
                Voucher kamu.
              </h1>
            </div>

            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#EFECE5] dark:bg-[#161E29]">
              <button
                type="button"
                onClick={() => setVoucherFilter('active')}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  voucherFilter === 'active'
                    ? 'bg-white dark:bg-[#1E293B] text-[#16202C] dark:text-white shadow-xs'
                    : 'text-[#646D78] dark:text-[#94A3B8]'
                }`}
              >
                Tersedia ({activeVouchers.length})
              </button>
              <button
                type="button"
                onClick={() => setVoucherFilter('used')}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  voucherFilter === 'used'
                    ? 'bg-white dark:bg-[#1E293B] text-[#16202C] dark:text-white shadow-xs'
                    : 'text-[#646D78] dark:text-[#94A3B8]'
                }`}
              >
                Riwayat Pakai ({usedVouchers.length})
              </button>
            </div>

            {displayedVouchers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DED9CF] dark:border-white/15 p-8 text-center space-y-2">
                <Ticket className="w-6 h-6 mx-auto text-[#8A929D]" />
                <p className="text-sm font-medium">
                  {voucherFilter === 'active'
                    ? 'Belum ada voucher aktif'
                    : 'Belum ada voucher terpakai'}
                </p>
                <p className="text-xs text-[#646D78] dark:text-[#94A3B8]">
                  Kumpulkan stempel ke-3, ke-6, dan ke-10 untuk mendapat voucher
                  otomatis.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedVouchers.map((v) => {
                  const isActive = v.status === 'active';
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVoucher(v)}
                      className={`w-full text-left rounded-2xl border p-4 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white dark:bg-[#161E29] border-[#E6E2DA] dark:border-white/10 hover:border-[#16202C]/40'
                          : 'bg-[#F3EFE6]/60 dark:bg-[#161E29]/50 border-[#E6E2DA]/70 dark:border-white/5 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] text-[#646D78] dark:text-[#94A3B8]">
                            {v.subtitle} ·{' '}
                            <span className="font-mono-code">{v.code}</span>
                          </p>
                          <h3 className="font-serif-display text-xl mt-0.5">
                            {v.title}
                          </h3>
                        </div>
                        <span
                          className={`text-[10px] font-semibold tracking-[0.14em] uppercase ${
                            isActive
                              ? 'text-[#15803D] dark:text-emerald-400'
                              : 'text-[#646D78] dark:text-[#94A3B8]'
                          }`}
                        >
                          {isActive ? 'AKTIF' : 'TERPAKAI'}
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-[#EFECE5] dark:border-white/10 flex items-center justify-between text-xs text-[#646D78] dark:text-[#94A3B8]">
                        <span>
                          {isActive
                            ? `Berlaku s/d ${v.expiresAt}`
                            : `Dipakai ${v.usedAt} · RTRW ${v.usedOutlet === 'pemuda' ? 'Pemuda' : 'AWANNCOSTA'}`}
                        </span>
                        <span className="font-medium text-[#16202C] dark:text-white">
                          {isActive ? 'Tunjukkan QR →' : 'Detail →'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'riwayat' && (
          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#646D78] dark:text-[#94A3B8]">
                CATATAN KUNJUNGAN
              </p>
              <h1 className="font-serif-display text-3xl font-normal mt-1">
                Riwayat transaksi.
              </h1>
            </div>

            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'Semua Outlet' },
                  { id: 'pemuda', label: 'Pemuda' },
                  { id: 'awanncosta', label: 'AWANNCOSTA' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOutletFilter(f.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    outletFilter === f.id
                      ? 'bg-[#16202C] text-white dark:bg-[#F4F1EA] dark:text-[#16202C]'
                      : 'bg-[#EFECE5] text-[#5B6470] dark:bg-[#161E29] dark:text-[#94A3B8] hover:text-[#16202C]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {memberTransactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DED9CF] dark:border-white/15 p-8 text-center space-y-2">
                <Receipt className="w-6 h-6 mx-auto text-[#8A929D]" />
                <p className="text-sm font-medium">Belum ada transaksi</p>
                <p className="text-xs text-[#646D78] dark:text-[#94A3B8]">
                  Riwayat pembelianmu di RTRW Pemuda maupun AWANNCOSTA akan muncul
                  di sini.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 divide-y divide-[#EFECE5] dark:divide-white/10">
                {memberTransactions.map((tx) => (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => setSelectedTx(tx)}
                    className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-3 hover:bg-[#FAF8F4]/70 dark:hover:bg-white/[0.02] transition-colors first:rounded-t-2xl last:rounded-b-2xl cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tx.items.join(', ')}
                      </p>
                      <p className="text-xs text-[#646D78] dark:text-[#94A3B8] mt-0.5">
                        {tx.date} · {tx.time} · RTRW{' '}
                        {tx.outlet === 'pemuda' ? 'Pemuda' : 'AWANNCOSTA'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono-code text-sm font-medium tabular-nums">
                        {formatRupiah(tx.netAmount)}
                      </p>
                      <p
                        className={`text-[11px] font-medium mt-0.5 ${
                          tx.stampEarned
                            ? 'text-[#15803D] dark:text-emerald-400'
                            : 'text-[#646D78] dark:text-[#94A3B8]'
                        }`}
                      >
                        {tx.stampEarned
                          ? '+1 Stempel'
                          : tx.voucherUsedTitle || 'Tanpa stempel'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'peringkat' && (
          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#646D78] dark:text-[#94A3B8]">
                KOMUNITAS SEMARANG
              </p>
              <h1 className="font-serif-display text-3xl font-normal mt-1">
                Warga paling setia.
              </h1>
              <p className="text-xs text-[#55606E] dark:text-[#A3B1C2] mt-1.5">
                Peringkat dihitung dari total cangkir yang dikumpulkan di kedua
                outlet RTRW sepanjang 2026.
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 divide-y divide-[#EFECE5] dark:divide-white/10">
              {sortedLeaderboard.map((m, idx) => {
                const isMe = m.id === member.id;
                return (
                  <div
                    key={m.id}
                    className={`px-4 py-3.5 flex items-center justify-between gap-3 first:rounded-t-2xl last:rounded-b-2xl ${
                      isMe ? 'bg-[#F3EFE6]/70 dark:bg-white/[0.05]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span
                        className={`font-mono-code text-xs w-6 text-center tabular-nums font-semibold ${
                          idx === 0
                            ? 'text-[#16202C] dark:text-white'
                            : 'text-[#8A929D]'
                        }`}
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {m.name}{' '}
                          {isMe && (
                            <span className="text-[11px] font-semibold text-[#5B6470] dark:text-[#CBD5E1]">
                              (Kamu)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[#646D78] dark:text-[#94A3B8]">
                          Outlet favorit: RTRW{' '}
                          {m.favoriteOutlet === 'pemuda'
                            ? 'Pemuda'
                            : 'AWANNCOSTA'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono-code text-sm font-semibold tabular-nums">
                        {m.totalCupsAllTime} cangkir
                      </p>
                      <p className="text-[11px] text-[#646D78] dark:text-[#94A3B8] tabular-nums">
                        {m.completedCards} kartu selesai
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'qr' && (
          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#646D78] dark:text-[#94A3B8]">
                IDENTITAS ANGGOTA
              </p>
              <h1 className="font-serif-display text-3xl font-normal mt-1">
                Tunjukkan ke kasir.
              </h1>
            </div>

            <div className="rounded-3xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-6 flex flex-col items-center text-center shadow-sm">
              <div className="p-4 rounded-2xl bg-[#FAF8F4] dark:bg-white border border-[#E6E2DA] dark:border-transparent">
                <QrCodeMatrix value={member.serialCode} size={180} />
              </div>

              <div className="mt-5 space-y-1">
                <p className="font-serif-display text-2xl">{member.name}</p>
                <p className="font-mono-code text-sm font-semibold tracking-wider text-[#394452] dark:text-[#CBD5E1]">
                  {member.serialCode}
                </p>
                <p className="text-xs text-[#646D78] dark:text-[#94A3B8] tabular-nums">
                  {member.phone} · {member.stamps}/10 stempel
                </p>
              </div>

              <div className="mt-5 w-full flex gap-2.5">
                <button
                  type="button"
                  onClick={() => copyText(member.serialCode)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-[#DED9CF] dark:border-white/15 text-xs font-semibold hover:bg-[#F3EFE6] dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {copiedCode === member.serialCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Kode</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onSimulateCashierWithMember(member.id)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Simulasi Scan Kasir
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Tab Bar (5 tabs) */}
      <nav
        aria-label="Navigasi Member"
        className="sticky bottom-0 z-30 w-full bg-white/95 dark:bg-[#121821]/95 backdrop-blur-md border-t border-[#E6E2DA] dark:border-white/10"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  active
                    ? 'text-[#16202C] dark:text-[#F4F1EA] font-semibold'
                    : 'text-[#8A929D] dark:text-[#64748B] hover:text-[#16202C] dark:hover:text-[#CBD5E1]'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-[10px] tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Voucher Detail Modal */}
      {selectedVoucher && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end @3xl:items-center justify-center p-0 @3xl:p-4"
          onClick={() => setSelectedVoucher(null)}
        >
          <div
            className="w-full @3xl:max-w-sm rounded-t-3xl @3xl:rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#646D78] dark:text-[#94A3B8]">
                  {selectedVoucher.subtitle}
                </p>
                <h3 className="font-serif-display text-2xl mt-0.5">
                  {selectedVoucher.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className="p-1.5 rounded-lg text-[#646D78] hover:text-[#16202C] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedVoucher.status === 'active' && (
              <div className="rounded-2xl bg-[#FAF8F4] dark:bg-white p-4 flex flex-col items-center">
                <QrCodeMatrix value={selectedVoucher.code} size={156} />
                <span className="font-mono-code text-xs font-semibold text-[#16202C] mt-3">
                  {selectedVoucher.code}
                </span>
              </div>
            )}

            <div className="space-y-2 text-xs text-[#4A535E] dark:text-[#CBD5E1] leading-relaxed">
              <p>{selectedVoucher.description}</p>
              <div className="flex items-center gap-2 pt-1 text-[#646D78] dark:text-[#94A3B8]">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {selectedVoucher.status === 'active'
                    ? `Berlaku hingga ${selectedVoucher.expiresAt}`
                    : `Sudah dipakai pada ${selectedVoucher.usedAt}`}
                </span>
              </div>
            </div>

            <div className="flex gap-2.5">
              {selectedVoucher.status === 'active' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVoucher(null);
                    onSimulateCashierWithMember(member.id);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-xs font-semibold cursor-pointer"
                >
                  Pakai di Kasir Demo
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#DED9CF] dark:border-white/15 text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Receipt Modal */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end @3xl:items-center justify-center p-0 @3xl:p-4"
          onClick={() => setSelectedTx(null)}
        >
          <div
            className="w-full @3xl:max-w-sm rounded-t-3xl @3xl:rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono-code text-[11px] text-[#646D78] dark:text-[#94A3B8]">
                  {selectedTx.id}
                </p>
                <h3 className="font-serif-display text-2xl mt-0.5">
                  RTRW {selectedTx.outlet === 'pemuda' ? 'Pemuda' : 'AWANNCOSTA'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-lg text-[#646D78] hover:text-[#16202C] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#646D78]">Waktu</span>
                <span>
                  {selectedTx.date} · {selectedTx.time}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#646D78]">Kasir</span>
                <span>{selectedTx.cashierName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#646D78]">Menu</span>
                <span className="text-right font-medium">
                  {selectedTx.items.join(', ')}
                </span>
              </div>
              <div className="pt-2 border-t border-[#E6E2DA] dark:border-white/10 flex justify-between">
                <span className="text-[#646D78]">Total</span>
                <span className="font-mono-code font-semibold tabular-nums">
                  {formatRupiah(selectedTx.netAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#646D78]">Status Stempel</span>
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Award className="w-3.5 h-3.5" />
                  {selectedTx.stampEarned
                    ? '+1 Stempel Tercatat'
                    : 'Tidak dapat stempel (pakai voucher)'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTx(null)}
              className="w-full py-2.5 rounded-xl bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-xs font-semibold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
