import React, { useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  LogOut,
  MapPin,
  Moon,
  Plus,
  QrCode,
  Search,
  Sparkles,
  Sun,
  Ticket,
  X,
} from 'lucide-react';
import { StampCard } from '../components/StampCard';
import { MENU_PRESETS, formatRupiah } from '../data/mockData';
import {
  Member,
  OutletId,
  ProgramRules,
  StaffAccount,
  Voucher,
} from '../types';

interface CashierViewProps {
  staff: StaffAccount;
  activeOutlet: OutletId;
  members: Member[];
  initialSelectedMemberId?: string | null;
  rules: ProgramRules;
  darkMode: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
  onViewMemberCard?: (memberId: string) => void;
  onRecordTransaction: (payload: {
    memberId: string;
    outlet: OutletId;
    items: string[];
    grossAmount: number;
    voucherId?: string;
    cashierName: string;
  }) => {
    stampEarned: boolean;
    newStamps: number;
    newlyIssuedVoucher?: string;
    netAmount: number;
    discountAmount: number;
  };
}

export const CashierView: React.FC<CashierViewProps> = ({
  staff,
  activeOutlet,
  members,
  initialSelectedMemberId = null,
  rules,
  darkMode,
  onToggleDark,
  onLogout,
  onViewMemberCard,
  onRecordTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    initialSelectedMemberId
  );
  const [showQrScanner, setShowQrScanner] = useState(false);

  // Transaction builder state
  const [selectedItems, setSelectedItems] = useState<string[]>([
    'Kopi Susu Warga',
  ]);
  const [grossAmount, setGrossAmount] = useState<number>(28000);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>('');
  const [cardAnimSlot, setCardAnimSlot] = useState<number | null>(null);
  const [cardAnimNonce, setCardAnimNonce] = useState(0);
  const [lastReceipt, setLastReceipt] = useState<{
    memberName: string;
    netAmount: number;
    stampEarned: boolean;
    newStamps: number;
    newlyIssuedVoucher?: string;
  } | null>(null);

  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedMemberId) || null,
    [members, selectedMemberId]
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        m.serialCode.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  const activeVouchers: Voucher[] = useMemo(() => {
    if (!selectedMember) return [];
    return selectedMember.vouchers.filter((v) => v.status === 'active');
  }, [selectedMember]);

  const chosenVoucher = activeVouchers.find((v) => v.id === selectedVoucherId);

  const discountAmount = useMemo(() => {
    if (!chosenVoucher) return 0;
    if (chosenVoucher.discountPercent) {
      return Math.round((grossAmount * chosenVoucher.discountPercent) / 100);
    }
    if (chosenVoucher.maxDiscountValue) {
      return Math.min(grossAmount, chosenVoucher.maxDiscountValue);
    }
    return 0;
  }, [chosenVoucher, grossAmount]);

  const netAmount = Math.max(0, grossAmount - discountAmount);
  const eligibleForStamp =
    !chosenVoucher && grossAmount >= rules.minSpendForStamp;

  const handleSelectMember = (member: Member) => {
    setSelectedMemberId(member.id);
    setSelectedVoucherId('');
    setLastReceipt(null);
    setShowQrScanner(false);
    setSearchQuery('');
  };

  const handleAddMenuItem = (name: string, price: number) => {
    setSelectedItems((prev) => [...prev, name]);
    setGrossAmount((prev) => prev + price);
  };

  const handleSubmitTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || grossAmount <= 0) return;

    const result = onRecordTransaction({
      memberId: selectedMember.id,
      outlet: activeOutlet,
      items:
        selectedItems.length > 0 ? selectedItems : ['Pembelian Menu RTRW'],
      grossAmount,
      voucherId: selectedVoucherId || undefined,
      cashierName: staff.name,
    });

    setLastReceipt({
      memberName: selectedMember.name,
      netAmount: result.netAmount,
      stampEarned: result.stampEarned,
      newStamps: result.newStamps,
      newlyIssuedVoucher: result.newlyIssuedVoucher,
    });
    if (result.stampEarned) {
      setCardAnimSlot(result.newStamps);
      setCardAnimNonce((n) => n + 1);
    }
    setSelectedVoucherId('');
  };

  return (
    <div className="min-h-full bg-[#FAF8F4] dark:bg-[#0E1319] text-[#16202C] dark:text-[#F4F1EA]">
      {/* Top Bar */}
      <header className="w-full border-b border-[#E6E2DA]/80 dark:border-white/10 bg-white/60 dark:bg-[#121821]/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 @3xl:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="font-serif-display text-xl @3xl:text-2xl font-bold tracking-tight">
                RTRW
              </span>
              <span className="text-[10px] font-medium tracking-[0.22em] text-[#5B6470] dark:text-[#94A3B8] uppercase">
                KASIR
              </span>
            </div>

            <span className="hidden @md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#161E29] border border-[#E2DDD4] dark:border-white/15 text-xs font-medium whitespace-nowrap">
              <MapPin className="w-3 h-3 text-[#646D78]" />
              <span>
                RTRW {activeOutlet === 'pemuda' ? 'Pemuda' : 'AWANNCOSTA'}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2 @3xl:gap-3 shrink-0">
            <span className="hidden @3xl:inline text-xs text-[#55606E] dark:text-[#CBD5E1] whitespace-nowrap">
              {staff.name} ({staff.roleLabel})
            </span>

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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E2DDD4] dark:border-white/15 bg-white dark:bg-[#161E29] text-xs font-medium hover:bg-[#F3EFE6] dark:hover:bg-[#1F2937] transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 @3xl:px-8 py-8 @3xl:py-12">
        <div className="grid grid-cols-1 @3xl:grid-cols-12 gap-7 items-start">
          {/* Step 1: Find Customer */}
          <section className="@3xl:col-span-5 space-y-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#646D78] dark:text-[#94A3B8]">
                LANGKAH 1
              </p>
              <h1 className="font-serif-display text-3xl font-normal mt-1">
                Temukan pelanggan
              </h1>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-5 space-y-4 shadow-xs">
              <button
                type="button"
                onClick={() => setShowQrScanner(true)}
                className="w-full py-3 px-4 rounded-full bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-xs font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Scan QR pelanggan</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-[#EFECE5] dark:border-white/10" />
                <span className="bg-white dark:bg-[#161E29] px-3 text-[11px] text-[#646D78] dark:text-[#94A3B8] whitespace-nowrap">
                  atau cari nomor HP
                </span>
                <div className="w-full border-t border-[#EFECE5] dark:border-white/10" />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="0812… / email / nama"
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm placeholder:text-[#9BA3AE] focus:outline-none focus:border-[#16202C] dark:focus:border-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (searchResults.length === 1) {
                      handleSelectMember(searchResults[0]);
                    }
                  }}
                  aria-label="Cari pelanggan"
                  className="w-10 h-10 rounded-xl bg-[#EFECE5] dark:bg-white/10 flex items-center justify-center text-[#5B6470] dark:text-[#CBD5E1] hover:bg-[#E2DDD4] dark:hover:bg-white/20 shrink-0 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {/* Search Dropdown / Quick Picks */}
              {searchQuery.trim().length > 0 ? (
                <div className="divide-y divide-[#EFECE5] dark:divide-white/10 border border-[#E6E2DA] dark:border-white/10 rounded-xl overflow-hidden">
                  {searchResults.length === 0 ? (
                    <p className="p-3 text-xs text-[#646D78] dark:text-[#94A3B8]">
                      Pelanggan tidak ditemukan.
                    </p>
                  ) : (
                    searchResults.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMember(m)}
                        className="w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 hover:bg-[#FAF8F4] dark:hover:bg-white/5 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.name}</p>
                          <p className="text-[11px] text-[#646D78] dark:text-[#94A3B8] font-mono-code">
                            {m.phone} · {m.serialCode}
                          </p>
                        </div>
                        <span className="font-mono-code text-xs font-semibold shrink-0">
                          {m.stamps}/10
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <div className="pt-1">
                  <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#8A929D] mb-2">
                    PELANGGAN DEMO CEPAT
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {members.slice(0, 3).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMember(m)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                          selectedMemberId === m.id
                            ? 'bg-[#16202C] text-white border-[#16202C] dark:bg-[#F4F1EA] dark:text-[#16202C]'
                            : 'bg-[#FAF8F4] dark:bg-[#0E1319] border-[#E6E2DA] dark:border-white/15 hover:border-[#16202C]/40'
                        }`}
                      >
                        {m.name} ({m.stamps}/10)
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Step 2: Record Transaction */}
          <section className="@3xl:col-span-7 space-y-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#646D78] dark:text-[#94A3B8]">
                LANGKAH 2
              </p>
              <h2 className="font-serif-display text-3xl font-normal mt-1">
                Catat transaksi
              </h2>
            </div>

            {!selectedMember ? (
              <div className="rounded-2xl border border-dashed border-[#DED9CF] dark:border-white/15 bg-white/40 dark:bg-[#161E29]/40 p-10 text-center">
                <p className="text-sm text-[#646D78] dark:text-[#94A3B8]">
                  Scan QR atau cari nomor HP pelanggan untuk mulai.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmitTx}
                className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-5 @3xl:p-6 space-y-5 shadow-xs"
              >
                {/* Customer Banner */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#EFECE5] dark:border-white/10">
                  <div>
                    <p className="font-mono-code text-[11px] text-[#646D78] dark:text-[#94A3B8]">
                      {selectedMember.serialCode} · {selectedMember.phone}
                    </p>
                    <h3 className="font-serif-display text-2xl mt-0.5">
                      {selectedMember.name}
                    </h3>
                    <p className="text-xs text-[#55606E] dark:text-[#CBD5E1] mt-1 tabular-nums">
                      Stempel saat ini: <strong>{selectedMember.stamps}/10</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMemberId(null);
                      setLastReceipt(null);
                    }}
                    className="text-xs text-[#646D78] hover:text-[#16202C] dark:hover:text-white cursor-pointer"
                  >
                    Ganti
                  </button>
                </div>

                {/* Live StampCard Preview for Customer */}
                <StampCard
                  cardNumber={selectedMember.cardNumber}
                  holderName={selectedMember.name}
                  serialCode={selectedMember.serialCode}
                  stamps={selectedMember.stamps}
                  stampDates={selectedMember.stampDates}
                  interactive={false}
                  compact={true}
                  animatingSlot={cardAnimSlot}
                  animationNonce={cardAnimNonce}
                  justStampedLabel={
                    lastReceipt?.stampEarned
                      ? `+1 Stempel · RTRW ${activeOutlet === 'pemuda' ? 'Pemuda' : 'AWANNCOSTA'}`
                      : null
                  }
                />

                {/* Success Receipt Banner */}
                {lastReceipt && (
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                          Transaksi {lastReceipt.memberName} tercatat (
                          {formatRupiah(lastReceipt.netAmount)})
                        </p>
                        <p className="text-emerald-800 dark:text-emerald-300">
                          {lastReceipt.stampEarned
                            ? `Stempel bertambah menjadi ${lastReceipt.newStamps}/10.`
                            : 'Voucher berhasil ditukarkan (transaksi promo tidak menambah stempel).'}
                          {lastReceipt.newlyIssuedVoucher &&
                            ` Hadiah baru terbit: ${lastReceipt.newlyIssuedVoucher}!`}
                        </p>
                      </div>
                    </div>
                    {onViewMemberCard && (
                      <button
                        type="button"
                        onClick={() => onViewMemberCard(selectedMember.id)}
                        className="px-3 py-1.5 rounded-full bg-emerald-700 text-white text-[11px] font-semibold hover:bg-emerald-800 transition-colors shrink-0 whitespace-nowrap cursor-pointer"
                      >
                        Lihat Kartu Member →
                      </button>
                    )}
                  </div>
                )}

                {/* Quick Menu Builder */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium">Tambah Menu Cepat</label>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItems([]);
                        setGrossAmount(0);
                      }}
                      className="text-[11px] text-[#646D78] hover:text-[#16202C] dark:hover:text-white cursor-pointer"
                    >
                      Kosongkan
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {MENU_PRESETS.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => handleAddMenuItem(item.name, item.price)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#E6E2DA] dark:border-white/10 text-xs hover:border-[#16202C] transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{item.name}</span>
                        <span className="font-mono-code text-[11px] text-[#646D78]">
                          {Math.round(item.price / 1000)}k
                        </span>
                      </button>
                    ))}
                  </div>
                  {selectedItems.length > 0 && (
                    <p className="mt-2 text-xs text-[#646D78] dark:text-[#94A3B8]">
                      Item: {selectedItems.join(', ')}
                    </p>
                  )}
                </div>

                {/* Nominal Input */}
                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Total Belanja Kotor (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={grossAmount}
                    onChange={(e) => setGrossAmount(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 font-mono-code text-sm tabular-nums focus:outline-none focus:border-[#16202C] dark:focus:border-white"
                  />
                </div>

                {/* Voucher Selection */}
                <div>
                  <label className="block text-xs font-medium mb-2">
                    Pakai Voucher Pelanggan ({activeVouchers.length} tersedia)
                  </label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setSelectedVoucherId('')}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-left text-xs flex items-center justify-between cursor-pointer ${
                        selectedVoucherId === ''
                          ? 'border-[#16202C] dark:border-[#F4F1EA] bg-[#FAF8F4] dark:bg-[#1E293B] font-semibold'
                          : 'border-[#E6E2DA] dark:border-white/10'
                      }`}
                    >
                      <span>Transaksi Harga Normal (Dapat +1 Stempel)</span>
                      <span className="text-[11px] text-[#646D78]">Standar</span>
                    </button>

                    {activeVouchers.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVoucherId(v.id)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-left text-xs flex items-center justify-between gap-2 cursor-pointer ${
                          selectedVoucherId === v.id
                            ? 'border-[#16202C] dark:border-[#F4F1EA] bg-[#FAF8F4] dark:bg-[#1E293B] font-semibold'
                            : 'border-[#E6E2DA] dark:border-white/10'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Ticket className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {v.title} ({v.subtitle})
                          </span>
                        </span>
                        <span className="font-mono-code text-[11px] text-[#646D78]">
                          {v.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary Box */}
                <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#E6E2DA] dark:border-white/10 p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#646D78]">Total kotor</span>
                    <span className="font-mono-code tabular-nums">
                      {formatRupiah(grossAmount)}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                      <span>Potongan ({chosenVoucher?.title})</span>
                      <span className="font-mono-code tabular-nums">
                        − {formatRupiah(discountAmount)}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-[#E6E2DA] dark:border-white/10 flex justify-between text-sm font-semibold">
                    <span>Total bayar</span>
                    <span className="font-mono-code tabular-nums">
                      {formatRupiah(netAmount)}
                    </span>
                  </div>
                  <div className="pt-1 flex items-center gap-1.5 text-[11px] text-[#55606E] dark:text-[#94A3B8]">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {eligibleForStamp
                        ? 'Memenuhi syarat: pelanggan mendapat +1 stempel.'
                        : chosenVoucher
                          ? 'Transaksi memakai voucher tidak mendapat stempel.'
                          : `Belanja minimal ${formatRupiah(rules.minSpendForStamp)} untuk stempel.`}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={grossAmount <= 0}
                  className="w-full py-3 rounded-full bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
                >
                  Simpan &amp; Proses Transaksi
                </button>
              </form>
            )}
          </section>
        </div>
      </main>

      {/* Simulated QR Scanner Modal */}
      {showQrScanner && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowQrScanner(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#646D78]">
                  KAMERA SCAN QR
                </p>
                <h3 className="font-serif-display text-xl mt-0.5">
                  Pilih QR pelanggan demo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQrScanner(false)}
                className="p-1.5 rounded-lg text-[#646D78] hover:text-[#16202C] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#16202C] text-white p-6 flex flex-col items-center justify-center text-center space-y-2">
              <QrCode className="w-12 h-12 text-white/80" />
              <p className="text-xs text-white/75">
                Simulasi kamera aktif — ketuk salah satu kartu anggota di bawah
                untuk memindai:
              </p>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {members.slice(0, 4).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMember(m)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E2DA] dark:border-white/10 hover:border-[#16202C] text-left flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="font-mono-code text-[11px] text-[#646D78]">
                      {m.serialCode}
                    </p>
                  </div>
                  <span className="font-mono-code text-xs font-semibold">
                    {m.stamps}/10
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
