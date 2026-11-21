import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Coffee,
  Download,
  LogOut,
  MessageSquare,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Send,
  Sun,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { StampCard } from '../components/StampCard';
import {
  DAILY_REVENUE_SERIES,
  INITIAL_LANDING_CONTENT,
  OUTLETS as DEFAULT_OUTLETS,
  formatRupiah,
} from '../data/mockData';
import {
  AdminTab,
  LandingContent,
  Member,
  OutletId,
  OutletInfo,
  ProgramRules,
  StaffAccount,
  Transaction,
  WAMessageTemplate,
} from '../types';

interface AdminDashboardViewProps {
  staff: StaffAccount;
  members: Member[];
  transactions: Transaction[];
  staffAccounts: StaffAccount[];
  rules: ProgramRules;
  landingContent: LandingContent;
  outlets: OutletInfo[];
  waTemplates: WAMessageTemplate[];
  darkMode: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
  onUpdateRules: (next: ProgramRules) => void;
  onUpdateLandingContent: (next: LandingContent) => void;
  onUpdateOutlets: (next: OutletInfo[]) => void;
  onToggleWaTemplate: (id: string) => void;
  onSendTestWa: (template: WAMessageTemplate) => void;
  onToggleStaffActive: (id: string) => void;
  onAddStaff: (payload: {
    name: string;
    username: string;
    outlet: OutletId;
  }) => void;
  onExtendMembership: (memberId: string) => void;
}

const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'klaim', label: 'Klaim per outlet' },
  { id: 'analisis', label: 'Analisis' },
  { id: 'transaksi', label: 'Transaksi & voucher' },
  { id: 'warga', label: 'Warga Setia' },
  { id: 'database-anggota', label: 'Database anggota' },
  { id: 'pesan-wa', label: 'Pesan WA' },
  { id: 'aturan', label: 'Aturan program' },
  { id: 'konten-beranda', label: 'Konten & Foto Beranda' },
  { id: 'akun-kasir', label: 'Akun kasir' },
];

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  staff,
  members,
  transactions,
  staffAccounts,
  rules,
  landingContent,
  outlets,
  waTemplates,
  darkMode,
  onToggleDark,
  onLogout,
  onUpdateRules,
  onUpdateLandingContent,
  onUpdateOutlets,
  onToggleWaTemplate,
  onSendTestWa,
  onToggleStaffActive,
  onAddStaff,
  onExtendMembership,
}) => {
  const defaultOutlet: 'all' | OutletId =
    staff.outlet === 'all' ? 'all' : staff.outlet;

  const [activeTab, setActiveTab] = useState<AdminTab>('ringkasan');
  const [outletFilter, setOutletFilter] = useState<'all' | OutletId>(
    defaultOutlet
  );
  const [rangePreset, setRangePreset] = useState<'7' | '30' | '90'>('30');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hoveredClaimSeg, setHoveredClaimSeg] = useState<{
    outletName: string;
    label: string;
    count: number;
    amount: number;
  } | null>(null);

  // Filters & interactive modals for secondary tabs
  const [txSearch, setTxSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [inspectedMemberId, setInspectedMemberId] = useState<string | null>(null);

  // Database keanggotaan filters
  const [dbSearch, setDbSearch] = useState('');
  const [dbStatusFilter, setDbStatusFilter] = useState<
    'all' | 'aktif' | 'segera_berakhir'
  >('all');
  const [dbOutletFilter, setDbOutletFilter] = useState<'all' | OutletId>('all');

  // Rules form draft & free drink input
  const [rulesDraft, setRulesDraft] = useState<ProgramRules>(rules);
  const [newFreeDrink, setNewFreeDrink] = useState('');
  const [rulesSaved, setRulesSaved] = useState(false);

  // Landing content & outlet photos draft
  const [landingDraft, setLandingDraft] =
    useState<LandingContent>(landingContent);
  const [outletsDraft, setOutletsDraft] = useState<OutletInfo[]>(outlets);
  const [menuTextByOutlet, setMenuTextByOutlet] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(outlets.map((o) => [o.id, o.signatureMenu.join(', ')]))
  );
  const [draftImgErrors, setDraftImgErrors] = useState<Record<string, boolean>>(
    {}
  );
  const [landingSaved, setLandingSaved] = useState(false);

  useEffect(() => {
    setRulesDraft(rules);
  }, [rules]);

  useEffect(() => {
    setLandingDraft(landingContent);
  }, [landingContent]);

  useEffect(() => {
    setOutletsDraft(outlets);
    setMenuTextByOutlet(
      Object.fromEntries(outlets.map((o) => [o.id, o.signatureMenu.join(', ')]))
    );
    setDraftImgErrors({});
  }, [outlets]);

  // New cashier form
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffOutlet, setNewStaffOutlet] = useState<OutletId>('pemuda');

  const inspectedMember = useMemo(
    () => members.find((m) => m.id === inspectedMemberId) || null,
    [members, inspectedMemberId]
  );

  // Compute live KPIs anchored to the exact screenshot baseline for Pemuda 30 hari
  const extraTx = Math.max(0, transactions.length - 10);
  const extraPemudaRev = transactions
    .slice(0, extraTx)
    .filter((t) => t.outlet === 'pemuda')
    .reduce((acc, t) => acc + t.grossAmount, 0);
  const extraAwannRev = transactions
    .slice(0, extraTx)
    .filter((t) => t.outlet === 'awanncosta')
    .reduce((acc, t) => acc + t.grossAmount, 0);
  const extraPemudaDisc = transactions
    .slice(0, extraTx)
    .filter((t) => t.outlet === 'pemuda')
    .reduce((acc, t) => acc + t.discountAmount, 0);
  const extraAwannDisc = transactions
    .slice(0, extraTx)
    .filter((t) => t.outlet === 'awanncosta')
    .reduce((acc, t) => acc + t.discountAmount, 0);

  const metrics = useMemo(() => {
    const scale = rangePreset === '7' ? 0.32 : rangePreset === '90' ? 2.75 : 1;

    const pemudaBase = {
      activeMembers: 37,
      txCount: 116,
      stampTx: 83,
      vouchersIssued: 24,
      vouchersUsed: 17,
      gross: 4535000 + extraPemudaRev,
      discount: 135650 + extraPemudaDisc,
    };

    const awannBase = {
      activeMembers: 29,
      txCount: 98,
      stampTx: 72,
      vouchersIssued: 19,
      vouchersUsed: 13,
      gross: 3920000 + extraAwannRev,
      discount: 112400 + extraAwannDisc,
    };

    const pick =
      outletFilter === 'pemuda'
        ? pemudaBase
        : outletFilter === 'awanncosta'
          ? awannBase
          : {
              activeMembers: 58,
              txCount: pemudaBase.txCount + awannBase.txCount,
              stampTx: pemudaBase.stampTx + awannBase.stampTx,
              vouchersIssued:
                pemudaBase.vouchersIssued + awannBase.vouchersIssued,
              vouchersUsed: pemudaBase.vouchersUsed + awannBase.vouchersUsed,
              gross: pemudaBase.gross + awannBase.gross,
              discount: pemudaBase.discount + awannBase.discount,
            };

    const activeMembers = Math.max(
      1,
      Math.round(pick.activeMembers * (rangePreset === '7' ? 0.65 : rangePreset === '90' ? 1.35 : 1))
    );
    const txCount = Math.round(pick.txCount * scale) + extraTx;
    const stampTx = Math.round(pick.stampTx * scale) + extraTx;
    const vouchersIssued = Math.round(pick.vouchersIssued * scale);
    const vouchersUsed = Math.round(pick.vouchersUsed * scale);
    const usageRate =
      vouchersIssued > 0
        ? ((vouchersUsed / vouchersIssued) * 100).toFixed(1).replace('.', ',')
        : '0,0';
    const gross = Math.round(pick.gross * scale);
    const discount = Math.round(pick.discount * scale);
    const net = Math.max(0, gross - discount);
    const discountPct =
      gross > 0 ? ((discount / gross) * 100).toFixed(2).replace('.', ',') : '0,00';

    return {
      activeMembers,
      txCount,
      stampTx,
      vouchersIssued,
      vouchersUsed,
      usageRate,
      gross,
      discount,
      net,
      discountPct,
    };
  }, [
    outletFilter,
    rangePreset,
    extraTx,
    extraPemudaRev,
    extraAwannRev,
    extraPemudaDisc,
    extraAwannDisc,
  ]);

  // Chart data points
  const chartPoints = useMemo(() => {
    const slice =
      rangePreset === '7'
        ? DAILY_REVENUE_SERIES.slice(-7)
        : DAILY_REVENUE_SERIES;
    return slice.map((pt) => {
      const val =
        outletFilter === 'pemuda'
          ? pt.pemudaRevenue
          : outletFilter === 'awanncosta'
            ? pt.awanncostaRevenue
            : pt.pemudaRevenue + pt.awanncostaRevenue;
      return {
        label: pt.dateLabel,
        iso: pt.isoDate,
        value: val,
      };
    });
  }, [outletFilter, rangePreset]);

  const maxChartY = outletFilter === 'all' ? 800000 : 600000;
  const yTicks =
    outletFilter === 'all'
      ? [0, 200000, 400000, 600000, 800000]
      : [0, 150000, 300000, 450000, 600000];

  // Build smooth SVG path
  const svgW = 640;
  const svgH = 210;
  const padL = 44;
  const padR = 14;
  const padT = 16;
  const padB = 28;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const coords = chartPoints.map((pt, idx) => {
    const x =
      padL +
      (chartPoints.length > 1
        ? (idx / (chartPoints.length - 1)) * plotW
        : plotW / 2);
    const y = padT + plotH - Math.min(1, pt.value / maxChartY) * plotH;
    return { x, y, ...pt };
  });

  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx.toFixed(1)} ${p0.y.toFixed(1)}, ${cx.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    return d;
  };

  const linePath = buildSmoothPath(coords);
  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
      : '';

  const dateRangeDisplay =
    rangePreset === '7'
      ? {
          start: '15/11/2026',
          end: '21/11/2026',
          startIso: '2026-11-15',
          endIso: '2026-11-21',
          iso: '2026-11-15 → 2026-11-21',
        }
      : rangePreset === '90'
        ? {
            start: '24/08/2026',
            end: '21/11/2026',
            startIso: '2026-08-24',
            endIso: '2026-11-21',
            iso: '2026-08-24 → 2026-11-21',
          }
        : {
            start: '23/10/2026',
            end: '21/11/2026',
            startIso: '2026-10-23',
            endIso: '2026-11-21',
            iso: '2026-10-23 → 2026-11-21',
          };

  const outletSubtitle =
    outletFilter === 'all'
      ? 'SEMUA OUTLET'
      : outletFilter === 'pemuda'
        ? 'RTRW PEMUDA'
        : 'RTRW AWANNCOSTA';

  // Per-outlet voucher claims strictly filtered by outletFilter
  const claimRows = useMemo(() => {
    const scale = rangePreset === '7' ? 0.35 : rangePreset === '90' ? 2.6 : 1;
    const extraLiveTx = transactions.slice(0, extraTx);

    const buildRow = (outletId: OutletId) => {
      const isPemuda = outletId === 'pemuda';
      const base = isPemuda
        ? {
            t1Count: 14,
            t1Amt: 51200,
            t2Count: 7,
            t2Amt: 33450,
            freeCount: 2,
            freeAmt: 51000,
            bdayCount: 0,
            bdayAmt: 0,
          }
        : {
            t1Count: 11,
            t1Amt: 41200,
            t2Count: 5,
            t2Amt: 26200,
            freeCount: 1,
            freeAmt: 25000,
            bdayCount: 1,
            bdayAmt: 20000,
          };

      let t1Count = Math.round(base.t1Count * scale);
      let t1Amt = Math.round(base.t1Amt * scale);
      let t2Count = Math.round(base.t2Count * scale);
      let t2Amt = Math.round(base.t2Amt * scale);
      let freeCount = Math.round(base.freeCount * scale);
      let freeAmt = Math.round(base.freeAmt * scale);
      let bdayCount = Math.round(base.bdayCount * scale);
      let bdayAmt = Math.round(base.bdayAmt * scale);

      for (const tx of extraLiveTx) {
        if (tx.outlet !== outletId || !tx.voucherUsedTitle) continue;
        const title = tx.voucherUsedTitle.toLowerCase();
        if (title.includes('10%')) {
          t1Count += 1;
          t1Amt += tx.discountAmount;
        } else if (title.includes('15%')) {
          t2Count += 1;
          t2Amt += tx.discountAmount;
        } else if (title.includes('ulang tahun')) {
          bdayCount += 1;
          bdayAmt += tx.discountAmount;
        } else {
          freeCount += 1;
          freeAmt += tx.discountAmount;
        }
      }

      const totalCount = t1Count + t2Count + freeCount + bdayCount;
      const totalAmt = t1Amt + t2Amt + freeAmt + bdayAmt;

      return {
        outletId,
        shortName: isPemuda ? 'Pemuda' : 'AWANNCOSTA',
        outletName: isPemuda ? 'RTRW Pemuda' : 'RTRW AWANNCOSTA',
        t1Count,
        t1Amt,
        t2Count,
        t2Amt,
        freeCount,
        freeAmt,
        bdayCount,
        bdayAmt,
        totalCount,
        totalAmt,
      };
    };

    const visibleOutlets: OutletId[] =
      outletFilter === 'all' ? ['pemuda', 'awanncosta'] : [outletFilter];

    return visibleOutlets.map(buildRow);
  }, [outletFilter, rangePreset, transactions, extraTx]);

  const handleExportClaimsCsv = () => {
    const header = [
      'Outlet',
      'Diskon tahap 1 (Jumlah)',
      'Diskon tahap 1 (Nilai)',
      'Diskon tahap 2 (Jumlah)',
      'Diskon tahap 2 (Nilai)',
      'Minuman gratis (Jumlah)',
      'Minuman gratis (Nilai)',
      'Ulang tahun (Jumlah)',
      'Ulang tahun (Nilai)',
      'Total Klaim',
      'Total Nilai (Rp)',
    ];
    const lines = claimRows.map((r) =>
      [
        r.outletName,
        r.t1Count,
        r.t1Amt,
        r.t2Count,
        r.t2Amt,
        r.freeCount,
        r.freeAmt,
        r.bdayCount,
        r.bdayAmt,
        r.totalCount,
        r.totalAmt,
      ].join(',')
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-klaim-voucher-${outletFilter}-${dateRangeDisplay.startIso}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTransactions = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    return transactions.filter((t) => {
      const matchOutlet = outletFilter === 'all' || t.outlet === outletFilter;
      const matchQuery =
        !q ||
        t.memberName.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.items.join(' ').toLowerCase().includes(q);
      return matchOutlet && matchQuery;
    });
  }, [transactions, outletFilter, txSearch]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return members.filter(
      (m) =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.serialCode.toLowerCase().includes(q)
    );
  }, [members, memberSearch]);

  const handleSaveRules = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateRules(rulesDraft);
    setRulesSaved(true);
    setTimeout(() => setRulesSaved(false), 2000);
  };

  const handleUploadOutletPhoto = (outletId: OutletId, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      setOutletsDraft((prev) =>
        prev.map((o) => (o.id === outletId ? { ...o, image: result } : o))
      );
      setDraftImgErrors((prev) => ({ ...prev, [outletId]: false }));
    };
    reader.readAsDataURL(file);
  };

  const handleResetOutletPhoto = (outletId: OutletId) => {
    const initial = DEFAULT_OUTLETS.find((o) => o.id === outletId);
    if (!initial) return;
    setOutletsDraft((prev) =>
      prev.map((o) => (o.id === outletId ? { ...o, image: initial.image } : o))
    );
    setDraftImgErrors((prev) => ({ ...prev, [outletId]: false }));
  };

  const handleSaveLandingContent = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedOutlets = outletsDraft.map((o) => {
      const rawMenu = menuTextByOutlet[o.id] ?? o.signatureMenu.join(', ');
      const parsedMenu = rawMenu
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      return {
        ...o,
        signatureMenu: parsedMenu.length > 0 ? parsedMenu : o.signatureMenu,
      };
    });
    onUpdateLandingContent(landingDraft);
    onUpdateOutlets(normalizedOutlets);
    setLandingSaved(true);
    setTimeout(() => setLandingSaved(false), 2200);
  };

  const handleResetLandingDefaults = () => {
    setLandingDraft(INITIAL_LANDING_CONTENT);
    setOutletsDraft(DEFAULT_OUTLETS);
    setMenuTextByOutlet(
      Object.fromEntries(
        DEFAULT_OUTLETS.map((o) => [o.id, o.signatureMenu.join(', ')])
      )
    );
    setDraftImgErrors({});
    onUpdateLandingContent(INITIAL_LANDING_CONTENT);
    onUpdateOutlets(DEFAULT_OUTLETS);
    setLandingSaved(true);
    setTimeout(() => setLandingSaved(false), 2200);
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffUsername.trim()) return;
    onAddStaff({
      name: newStaffName.trim(),
      username: newStaffUsername.trim(),
      outlet: newStaffOutlet,
    });
    setNewStaffName('');
    setNewStaffUsername('');
    setShowAddStaff(false);
  };

  return (
    <div className="min-h-full bg-[#FAF8F4] dark:bg-[#0E1319] text-[#16202C] dark:text-[#F4F1EA]">
      {/* Header */}
      <header className="w-full border-b border-[#E6E2DA]/80 dark:border-white/10 bg-white/60 dark:bg-[#121821]/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 @3xl:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-2.5 whitespace-nowrap">
            <span className="font-serif-display text-xl @3xl:text-2xl font-bold tracking-tight">
              RTRW
            </span>
            <span className="text-[10px] font-medium tracking-[0.22em] text-[#5B6470] dark:text-[#94A3B8] uppercase">
              DASBOR
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden @3xl:block text-right leading-tight">
              <p className="text-xs font-medium">{staff.name}</p>
              <p className="text-[11px] text-[#646D78] dark:text-[#94A3B8]">
                {staff.roleLabel}
              </p>
            </div>

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

      <main className="max-w-6xl mx-auto px-4 @3xl:px-8 py-7 @3xl:py-10 space-y-6">
        {/* Title & Filter Strip */}
        <div className="flex flex-col @5xl:flex-row @5xl:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#646D78] dark:text-[#94A3B8]">
              {outletSubtitle}
            </p>
            <h1 className="font-serif-display text-3xl @3xl:text-4xl font-normal mt-1">
              Program stempel
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Outlet Segmented Switcher */}
            <div className="inline-flex items-center p-1 rounded-full bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10">
              {(
                [
                  { id: 'all', label: 'Semua' },
                  { id: 'pemuda', label: 'Pemuda' },
                  { id: 'awanncosta', label: 'AWANNCOSTA' },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOutletFilter(o.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    outletFilter === o.id
                      ? 'bg-[#16202C] text-white dark:bg-[#F4F1EA] dark:text-[#16202C]'
                      : 'text-[#646D78] dark:text-[#94A3B8] hover:text-[#16202C] dark:hover:text-white'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Date Range Display */}
            <div className="hidden @3xl:inline-flex items-center gap-2 text-xs text-[#394452] dark:text-[#CBD5E1]">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 font-mono-code text-[11px] tabular-nums">
                {dateRangeDisplay.start}
                <Calendar className="w-3.5 h-3.5 text-[#646D78]" />
              </span>
              <span className="text-[#8A929D]">–</span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 font-mono-code text-[11px] tabular-nums">
                {dateRangeDisplay.end}
                <Calendar className="w-3.5 h-3.5 text-[#646D78]" />
              </span>
            </div>

            {/* Quick Presets */}
            <div className="inline-flex items-center gap-1">
              {(
                [
                  { id: '7', label: '7 hari' },
                  { id: '30', label: '30 hari' },
                  { id: '90', label: '90 hari' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setRangePreset(p.id)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors whitespace-nowrap cursor-pointer ${
                    rangePreset === p.id
                      ? 'font-semibold text-[#16202C] dark:text-white bg-[#EFECE5] dark:bg-white/10'
                      : 'text-[#646D78] dark:text-[#94A3B8] hover:text-[#16202C] dark:hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="border-b border-[#E6E2DA] dark:border-white/10 -mx-4 px-4 @3xl:mx-0 @3xl:px-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-6 min-w-max">
            {ADMIN_TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'border-[#16202C] dark:border-[#F4F1EA] text-[#16202C] dark:text-white font-semibold'
                      : 'border-transparent text-[#646D78] dark:text-[#94A3B8] hover:text-[#16202C] dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: RINGKASAN */}
        {activeTab === 'ringkasan' && (
          <div className="space-y-6">
            {/* 4 KPI Cards */}
            <div className="grid grid-cols-1 @md:grid-cols-2 @5xl:grid-cols-4 gap-4">
              {/* Primary Dark Card */}
              <div className="rounded-2xl bg-[#16202C] dark:bg-[#1E293B] text-white p-5 space-y-2.5">
                <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-white/65">
                  ANGGOTA AKTIF DI OUTLET
                </p>
                <p className="font-sans text-3xl font-bold tabular-nums">
                  {metrics.activeMembers}
                </p>
                <p className="text-xs text-white/75">
                  {metrics.activeMembers} anggota bertransaksi
                </p>
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-5 space-y-2.5">
                <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-[#646D78] dark:text-[#94A3B8]">
                  TRANSAKSI ANGGOTA
                </p>
                <p className="font-sans text-3xl font-bold tabular-nums">
                  {metrics.txCount}
                </p>
                <p className="text-xs text-[#646D78] dark:text-[#94A3B8]">
                  {metrics.stampTx} di antaranya mendapat stempel
                </p>
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-5 space-y-2.5">
                <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-[#646D78] dark:text-[#94A3B8]">
                  VOUCHER TERBIT
                </p>
                <p className="font-sans text-3xl font-bold tabular-nums">
                  {metrics.vouchersIssued}
                </p>
                <p className="text-xs text-[#646D78] dark:text-[#94A3B8]">
                  {metrics.vouchersUsed} sudah terpakai
                </p>
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-5 space-y-2.5">
                <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-[#646D78] dark:text-[#94A3B8]">
                  VOUCHER TERPAKAI
                </p>
                <p className="font-sans text-3xl font-bold tabular-nums">
                  {metrics.usageRate}%
                </p>
                <p className="text-xs text-[#646D78] dark:text-[#94A3B8]">
                  dari voucher yang terbit di periode ini
                </p>
              </div>
            </div>

            {/* Bottom Row: Chart + Diskon vs Omzet */}
            <div className="grid grid-cols-1 @5xl:grid-cols-12 gap-5 items-stretch">
              {/* Daily Revenue Area Chart */}
              <div className="@5xl:col-span-8 rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-5 @3xl:p-6 flex flex-col justify-between">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                  <h2 className="font-serif-display text-xl @3xl:text-2xl font-normal">
                    Omzet anggota harian
                  </h2>
                  <span className="font-mono-code text-[11px] text-[#646D78] dark:text-[#94A3B8]">
                    {hoveredIdx !== null && coords[hoveredIdx]
                      ? `${coords[hoveredIdx].label}: ${formatRupiah(coords[hoveredIdx].value)}`
                      : dateRangeDisplay.iso}
                  </span>
                </div>

                <div className="w-full overflow-hidden">
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="w-full h-52 @3xl:h-60 overflow-visible"
                  >
                    <defs>
                      <linearGradient id="omzetArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#16202C" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#16202C" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="omzetAreaDark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F4F1EA" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#F4F1EA" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid Lines & Y-Axis Labels */}
                    {yTicks.map((tick) => {
                      const y = padT + plotH - (tick / maxChartY) * plotH;
                      return (
                        <g key={tick}>
                          <line
                            x1={padL}
                            y1={y}
                            x2={svgW - padR}
                            y2={y}
                            stroke="currentColor"
                            strokeOpacity={0.08}
                            strokeDasharray={tick === 0 ? undefined : '2 3'}
                          />
                          <text
                            x={padL - 8}
                            y={y + 4}
                            textAnchor="end"
                            className="fill-[#8A929D] text-[10px] font-mono-code"
                          >
                            {Math.round(tick / 1000)}k
                          </text>
                        </g>
                      );
                    })}

                    {/* Area & Smooth Stroke */}
                    <path
                      d={areaPath}
                      fill={darkMode ? 'url(#omzetAreaDark)' : 'url(#omzetArea)'}
                    />
                    <path
                      d={linePath}
                      fill="none"
                      stroke={darkMode ? '#F4F1EA' : '#16202C'}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />

                    {/* X-Axis Labels (spaced evenly) */}
                    {coords.map((pt, idx) => {
                      const showLabel =
                        coords.length <= 10 ||
                        idx % 3 === 0 ||
                        idx === coords.length - 1;
                      return (
                        <g key={pt.iso}>
                          {showLabel && (
                            <text
                              x={pt.x}
                              y={svgH - 6}
                              textAnchor="middle"
                              className="fill-[#8A929D] text-[9.5px] font-mono-code"
                            >
                              {pt.label}
                            </text>
                          )}
                          {/* Hover hit zone */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={10}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredIdx(idx)}
                            onMouseLeave={() => setHoveredIdx(null)}
                          />
                          {hoveredIdx === idx && (
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={4}
                              fill={darkMode ? '#F4F1EA' : '#16202C'}
                              stroke={darkMode ? '#161E29' : '#FFFFFF'}
                              strokeWidth={2}
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Diskon vs Omzet Card */}
              <div className="@5xl:col-span-4 rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-5 @3xl:p-6 flex flex-col justify-between">
                <div>
                  <h2 className="font-serif-display text-xl @3xl:text-2xl font-normal">
                    Diskon vs omzet
                  </h2>
                  <p className="text-xs text-[#646D78] dark:text-[#94A3B8] mt-1">
                    Total nilai voucher dibanding omzet dari anggota
                  </p>

                  <div className="mt-6 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#55606E] dark:text-[#CBD5E1]">
                        Omzet kotor
                      </span>
                      <span className="font-mono-code font-medium tabular-nums">
                        {formatRupiah(metrics.gross)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#55606E] dark:text-[#CBD5E1]">
                        Nilai diskon
                      </span>
                      <span className="font-mono-code font-medium tabular-nums">
                        − {formatRupiah(metrics.discount)}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-[#EFECE5] dark:border-white/10 flex items-center justify-between font-semibold">
                      <span>Omzet bersih</span>
                      <span className="font-mono-code tabular-nums">
                        {formatRupiah(metrics.net)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 space-y-2">
                  <div className="h-1.5 w-full rounded-full bg-[#EFECE5] dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#16202C] dark:bg-[#F4F1EA]"
                      style={{
                        width: `${Math.min(100, Math.max(4, Number(metrics.discountPct.replace(',', '.')) * 4))}%`,
                      }}
                    />
                  </div>
                  <p className="font-mono-code text-[11px] text-[#646D78] dark:text-[#94A3B8]">
                    Diskon = {metrics.discountPct}% dari omzet
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KLAIM PER OUTLET */}
        {activeTab === 'klaim' && (
          <div className="space-y-5">
            {/* Header + Ekspor CSV */}
            <div className="flex flex-col @3xl:flex-row @3xl:items-end justify-between gap-4">
              <div>
                <h2 className="font-serif-display text-2xl @3xl:text-[28px] font-normal">
                  Laporan klaim voucher
                </h2>
                <p className="text-xs text-[#646D78] dark:text-[#94A3B8] mt-1 max-w-xl leading-relaxed">
                  Voucher yang diklaim (dipakai) di tiap outlet pada{' '}
                  {dateRangeDisplay.startIso} s/d {dateRangeDisplay.endIso}.
                  Gunakan untuk rekap biaya antar pemilik outlet.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportClaimsCsv}
                className="inline-flex items-center gap-2 self-start @3xl:self-auto px-4 py-2 rounded-full bg-white dark:bg-[#161E29] border border-[#E2DDD4] dark:border-white/15 text-xs font-medium hover:bg-[#F3EFE6] dark:hover:bg-[#1F2937] transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor CSV</span>
              </button>
            </div>

            {/* Table Card */}
            <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#EFECE5] dark:border-white/10 text-[#646D78] dark:text-[#94A3B8]">
                    <tr>
                      <th className="py-3.5 px-5 font-medium whitespace-nowrap">
                        Outlet
                      </th>
                      <th className="py-3.5 px-4 font-medium text-right whitespace-nowrap">
                        Diskon tahap 1
                      </th>
                      <th className="py-3.5 px-4 font-medium text-right whitespace-nowrap">
                        Diskon tahap 2
                      </th>
                      <th className="py-3.5 px-4 font-medium text-right whitespace-nowrap">
                        Minuman gratis
                      </th>
                      <th className="py-3.5 px-4 font-medium text-right whitespace-nowrap">
                        Ulang tahun
                      </th>
                      <th className="py-3.5 px-5 font-medium text-right whitespace-nowrap">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE5] dark:divide-white/10">
                    {claimRows.map((row) => (
                      <tr key={row.outletId}>
                        <td className="py-4 px-5 font-medium text-[13px] whitespace-nowrap">
                          {row.outletName}
                        </td>
                        <td className="py-4 px-4 text-right font-mono-code tabular-nums whitespace-nowrap text-[#394452] dark:text-[#CBD5E1]">
                          {row.t1Count}× · {formatRupiah(row.t1Amt)}
                        </td>
                        <td className="py-4 px-4 text-right font-mono-code tabular-nums whitespace-nowrap text-[#394452] dark:text-[#CBD5E1]">
                          {row.t2Count}× · {formatRupiah(row.t2Amt)}
                        </td>
                        <td className="py-4 px-4 text-right font-mono-code tabular-nums whitespace-nowrap text-[#394452] dark:text-[#CBD5E1]">
                          {row.freeCount}× · {formatRupiah(row.freeAmt)}
                        </td>
                        <td className="py-4 px-4 text-right font-mono-code tabular-nums whitespace-nowrap text-[#394452] dark:text-[#CBD5E1]">
                          {row.bdayCount}× · {formatRupiah(row.bdayAmt)}
                        </td>
                        <td className="py-4 px-5 text-right font-mono-code font-semibold tabular-nums whitespace-nowrap">
                          {row.totalCount}× · {formatRupiah(row.totalAmt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stacked Bar Chart Card */}
            {(() => {
              const rawMax = Math.max(
                140000,
                ...claimRows.map((r) => r.totalAmt)
              );
              const step =
                rawMax <= 140000
                  ? 35000
                  : Math.ceil(rawMax / 4 / 10000) * 10000;
              const yMax = step * 4;
              const ticks = [0, step, step * 2, step * 3, yMax];

              const cW = 760;
              const cH = 260;
              const cPadL = 44;
              const cPadR = 20;
              const cPadT = 16;
              const cPadB = 34;
              const cPlotW = cW - cPadL - cPadR;
              const cPlotH = cH - cPadT - cPadB;

              const legendItems = [
                { key: 't1', label: 'Diskon tahap 1', color: '#8EA0B5' },
                { key: 't2', label: 'Diskon tahap 2', color: '#A39D95' },
                { key: 'free', label: 'Minuman gratis', color: '#243142' },
                { key: 'bday', label: 'Ulang tahun', color: '#5C5852' },
              ] as const;

              return (
                <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-5 @3xl:p-6 space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-serif-display text-xl @3xl:text-2xl font-normal">
                      Nilai klaim per outlet
                    </h3>
                    {hoveredClaimSeg && (
                      <span className="font-mono-code text-[11px] text-[#5B6470] dark:text-[#CBD5E1]">
                        {hoveredClaimSeg.outletName} · {hoveredClaimSeg.label}:{' '}
                        {hoveredClaimSeg.count}× ({formatRupiah(hoveredClaimSeg.amount)})
                      </span>
                    )}
                  </div>

                  <div className="w-full overflow-hidden">
                    <svg
                      viewBox={`0 0 ${cW} ${cH}`}
                      className="w-full h-56 @3xl:h-64 overflow-visible"
                    >
                      {ticks.map((tick) => {
                        const y = cPadT + cPlotH - (tick / yMax) * cPlotH;
                        return (
                          <g key={tick}>
                            <line
                              x1={cPadL}
                              y1={y}
                              x2={cW - cPadR}
                              y2={y}
                              stroke="currentColor"
                              strokeOpacity={0.08}
                            />
                            <text
                              x={cPadL - 8}
                              y={y + 4}
                              textAnchor="end"
                              className="fill-[#8A929D] text-[10px] font-mono-code"
                            >
                              {Math.round(tick / 1000)}k
                            </text>
                          </g>
                        );
                      })}

                      {claimRows.map((row, idx) => {
                        const slotW = cPlotW / claimRows.length;
                        const barW =
                          claimRows.length === 1
                            ? Math.min(540, cPlotW * 0.78)
                            : Math.min(260, slotW * 0.62);
                        const barX = cPadL + idx * slotW + (slotW - barW) / 2;

                        const segments = [
                          {
                            key: 't1',
                            label: 'Diskon tahap 1',
                            count: row.t1Count,
                            amount: row.t1Amt,
                            color: '#8EA0B5',
                          },
                          {
                            key: 't2',
                            label: 'Diskon tahap 2',
                            count: row.t2Count,
                            amount: row.t2Amt,
                            color: '#A39D95',
                          },
                          {
                            key: 'free',
                            label: 'Minuman gratis',
                            count: row.freeCount,
                            amount: row.freeAmt,
                            color: '#243142',
                          },
                          {
                            key: 'bday',
                            label: 'Ulang tahun',
                            count: row.bdayCount,
                            amount: row.bdayAmt,
                            color: '#5C5852',
                          },
                        ];

                        let currentY = cPadT + cPlotH;

                        return (
                          <g key={row.outletId}>
                            {segments.map((seg) => {
                              if (seg.amount <= 0) return null;
                              const segH = (seg.amount / yMax) * cPlotH;
                              const segY = currentY - segH;
                              currentY = segY;
                              return (
                                <rect
                                  key={seg.key}
                                  x={barX}
                                  y={segY}
                                  width={barW}
                                  height={Math.max(1, segH)}
                                  fill={seg.color}
                                  className="transition-opacity hover:opacity-85 cursor-pointer"
                                  onMouseEnter={() =>
                                    setHoveredClaimSeg({
                                      outletName: row.outletName,
                                      label: seg.label,
                                      count: seg.count,
                                      amount: seg.amount,
                                    })
                                  }
                                  onMouseLeave={() => setHoveredClaimSeg(null)}
                                />
                              );
                            })}
                            <text
                              x={barX + barW / 2}
                              y={cH - 10}
                              textAnchor="middle"
                              className="fill-[#646D78] dark:fill-[#94A3B8] text-[11px]"
                            >
                              {row.shortName}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-1 text-xs">
                    {legendItems.map((item) => (
                      <div key={item.key} className="inline-flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 inline-block shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span
                          className="font-medium"
                          style={{
                            color: darkMode ? '#CBD5E1' : item.color,
                          }}
                        >
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 3: ANALISIS */}
        {activeTab === 'analisis' && (() => {
          const isPemuda = outletFilter === 'pemuda';
          const isAwann = outletFilter === 'awanncosta';
          const repeatRate = isPemuda ? '71,4%' : isAwann ? '65,5%' : '68,9%';
          const repeatDetail = isPemuda
            ? '26 dari 37 anggota bertransaksi ≥2×'
            : isAwann
              ? '19 dari 29 anggota bertransaksi ≥2×'
              : '40 dari 58 anggota bertransaksi ≥2×';
          const avgCadence = isPemuda ? '4,8 hari' : isAwann ? '5,6 hari' : '5,2 hari';

          const topMenus = isPemuda
            ? [
                { name: 'Kopi Susu Warga', cups: 48, pct: 34 },
                { name: 'Americano Pemuda', cups: 31, pct: 22 },
                { name: 'Matcha Oat Latte', cups: 24, pct: 17 },
                { name: 'Flat White', cups: 19, pct: 14 },
                { name: 'Butter Croissant', cups: 18, pct: 13 },
              ]
            : isAwann
              ? [
                  { name: 'Cold Brew POJ', cups: 41, pct: 35 },
                  { name: 'Sea Salt Caramel Latte', cups: 29, pct: 25 },
                  { name: 'Caffe Latte', cups: 21, pct: 18 },
                  { name: 'Kopi Susu Warga', cups: 15, pct: 13 },
                  { name: 'Almond Croissant', cups: 11, pct: 9 },
                ]
              : [
                  { name: 'Kopi Susu Warga', cups: 63, pct: 28 },
                  { name: 'Cold Brew POJ', cups: 49, pct: 22 },
                  { name: 'Americano Pemuda', cups: 38, pct: 17 },
                  { name: 'Sea Salt Caramel Latte', cups: 36, pct: 16 },
                  { name: 'Matcha Oat Latte', cups: 35, pct: 17 },
                ];

          const cadenceBuckets = isPemuda
            ? [
                { label: '1–3 hari (Sangat rutin)', members: 14, pct: 38 },
                { label: '4–7 hari (Mingguan)', members: 13, pct: 35 },
                { label: '8–14 hari (Dua mingguan)', members: 7, pct: 19 },
                { label: '> 14 hari (Jarang)', members: 3, pct: 8 },
              ]
            : isAwann
              ? [
                  { label: '1–3 hari (Sangat rutin)', members: 9, pct: 31 },
                  { label: '4–7 hari (Mingguan)', members: 11, pct: 38 },
                  { label: '8–14 hari (Dua mingguan)', members: 6, pct: 21 },
                  { label: '> 14 hari (Jarang)', members: 3, pct: 10 },
                ]
              : [
                  { label: '1–3 hari (Sangat rutin)', members: 21, pct: 36 },
                  { label: '4–7 hari (Mingguan)', members: 21, pct: 36 },
                  { label: '8–14 hari (Dua mingguan)', members: 11, pct: 19 },
                  { label: '> 14 hari (Jarang)', members: 5, pct: 9 },
                ];

          return (
            <div className="space-y-5">
              {/* Top 3 Behavioral KPIs */}
              <div className="grid grid-cols-1 @3xl:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-[#16202C] dark:bg-[#1E293B] text-white p-5 space-y-2">
                  <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-white/65">
                    TINGKAT KUNJUNGAN ULANG
                  </p>
                  <p className="font-sans text-3xl font-bold tabular-nums">
                    {repeatRate}
                  </p>
                  <p className="text-xs text-white/75">{repeatDetail}</p>
                </div>

                <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-5 space-y-2">
                  <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-[#646D78] dark:text-[#94A3B8]">
                    RATA-RATA JEDA KUNJUNGAN
                  </p>
                  <p className="font-sans text-3xl font-bold tabular-nums">
                    {avgCadence}
                  </p>
                  <p className="text-xs text-[#646D78] dark:text-[#94A3B8]">
                    jarak antar pembelian anggota aktif
                  </p>
                </div>

                <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-5 space-y-2">
                  <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-[#646D78] dark:text-[#94A3B8]">
                    MENU TERLARIS ANGGOTA
                  </p>
                  <p className="font-serif-display text-2xl font-normal truncate">
                    {topMenus[0].name}
                  </p>
                  <p className="text-xs text-[#646D78] dark:text-[#94A3B8] tabular-nums">
                    {topMenus[0].cups} cangkir · {topMenus[0].pct}% dari pesanan
                  </p>
                </div>
              </div>

              {/* 2x2 Detailed Analytics Grid */}
              <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-5">
                {/* Jeda Kunjungan Antar Pembelian */}
                <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-6 space-y-4">
                  <div>
                    <h3 className="font-serif-display text-2xl">
                      Jeda kunjungan antar pembelian
                    </h3>
                    <p className="text-xs text-[#646D78] dark:text-[#94A3B8] mt-1">
                      Seberapa cepat anggota kembali membeli setelah kunjungan sebelumnya.
                    </p>
                  </div>
                  <div className="space-y-3 pt-1">
                    {cadenceBuckets.map((b) => (
                      <div key={b.label} className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span>{b.label}</span>
                          <span className="font-mono-code tabular-nums">
                            {b.members} anggota ({b.pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[#EFECE5] dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#16202C] dark:bg-[#F4F1EA]"
                            style={{ width: `${Math.min(100, b.pct * 2.1)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Menu Terlaris */}
                <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-6 space-y-4">
                  <div>
                    <h3 className="font-serif-display text-2xl">
                      Menu terlaris anggota
                    </h3>
                    <p className="text-xs text-[#646D78] dark:text-[#94A3B8] mt-1">
                      Peringkat minuman &amp; pendamping yang paling sering dipesan warga.
                    </p>
                  </div>
                  <div className="divide-y divide-[#EFECE5] dark:divide-white/10 text-xs">
                    {topMenus.map((item, idx) => (
                      <div
                        key={item.name}
                        className="py-2.5 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono-code text-[11px] font-semibold text-[#8A929D] w-5 tabular-nums">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="font-medium text-sm truncate">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-right shrink-0 font-mono-code tabular-nums">
                          <span className="font-semibold">{item.cups}×</span>
                          <span className="text-[#646D78] dark:text-[#94A3B8] ml-2">
                            ({item.pct}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Jam Ramai */}
                <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-6 space-y-4">
                  <div>
                    <h3 className="font-serif-display text-2xl">
                      Jam ramai kunjungan anggota
                    </h3>
                    <p className="text-xs text-[#646D78] dark:text-[#94A3B8] mt-1">
                      Distribusi transaksi stempel berdasarkan rentang jam operasional.
                    </p>
                  </div>
                  <div className="space-y-3 pt-1">
                    {[
                      { label: '07:00 – 10:00 (Kopi Pagi)', count: 29, pct: 25 },
                      { label: '11:00 – 14:00 (Makan Siang)', count: 24, pct: 21 },
                      { label: '15:00 – 18:00 (Sore & WFC)', count: 44, pct: 38 },
                      { label: '19:00 – 22:30 (Malam)', count: 19, pct: 16 },
                    ].map((slot) => (
                      <div key={slot.label} className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span>{slot.label}</span>
                          <span className="font-mono-code tabular-nums">
                            {slot.count} tx ({slot.pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[#EFECE5] dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#16202C] dark:bg-[#F4F1EA]"
                            style={{ width: `${slot.pct * 2}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Retensi & Penukaran Hadiah */}
                <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-6 space-y-4">
                  <div>
                    <h3 className="font-serif-display text-2xl">
                      Retensi &amp; penukaran hadiah
                    </h3>
                    <p className="text-xs text-[#646D78] dark:text-[#94A3B8] mt-1">
                      Efektivitas tiga titik hadiah dalam menjaga kunjungan berulang.
                    </p>
                  </div>
                  <div className="divide-y divide-[#EFECE5] dark:divide-white/10 text-xs">
                    {[
                      {
                        tier: `Stempel 03 · ${rules.milestone3Label}`,
                        rate: '78% terpakai dalam 7 hari',
                        count: '14 klaim',
                      },
                      {
                        tier: `Stempel 06 · ${rules.milestone6Label}`,
                        rate: '69% terpakai dalam 10 hari',
                        count: '9 klaim',
                      },
                      {
                        tier: `Stempel 10 · ${rules.milestone10Label}`,
                        rate: '92% mulai kartu baru setelah klaim',
                        count: '7 kartu penuh',
                      },
                      {
                        tier: 'Hadiah Ulang Tahun',
                        rate: 'Rata-rata membawa +1 teman berkunjung',
                        count: '4 klaim bulan ini',
                      },
                    ].map((row) => (
                      <div
                        key={row.tier}
                        className="py-3 flex items-center justify-between gap-4"
                      >
                        <div>
                          <p className="font-medium text-sm">{row.tier}</p>
                          <p className="text-[#646D78] dark:text-[#94A3B8] mt-0.5">
                            {row.rate}
                          </p>
                        </div>
                        <span className="font-mono-code font-semibold shrink-0 tabular-nums">
                          {row.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 4: TRANSAKSI & VOUCHER */}
        {activeTab === 'transaksi' && (
          <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 overflow-hidden">
            <div className="p-4 @3xl:p-5 border-b border-[#EFECE5] dark:border-white/10 flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif-display text-xl">
                  Buku transaksi anggota
                </h3>
                <p className="text-xs text-[#646D78] dark:text-[#94A3B8]">
                  Klik baris transaksi untuk melihat rincian struk.
                </p>
              </div>
              <div className="relative w-full @3xl:w-64">
                <Search className="w-3.5 h-3.5 text-[#8A929D] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Cari nama, menu, atau ID..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#E6E2DA] dark:border-white/10 text-xs focus:outline-none focus:border-[#16202C]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#EFECE5] dark:border-white/10 text-[10px] uppercase tracking-[0.14em] text-[#646D78] dark:text-[#94A3B8]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Waktu</th>
                    <th className="py-3 px-4 font-semibold">Anggota</th>
                    <th className="py-3 px-4 font-semibold">Outlet</th>
                    <th className="py-3 px-4 font-semibold">Menu</th>
                    <th className="py-3 px-4 font-semibold text-right">Netto</th>
                    <th className="py-3 px-4 font-semibold text-right">Stempel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE5] dark:divide-white/10">
                  {filteredTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="hover:bg-[#FAF8F4] dark:hover:bg-white/[0.03] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap font-mono-code text-[11px] text-[#646D78]">
                        {tx.date} · {tx.time}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium">
                        {tx.memberName}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {tx.outlet === 'pemuda' ? 'Pemuda' : 'AWANNCOSTA'}
                      </td>
                      <td className="py-3 px-4 max-w-[200px] truncate text-[#55606E] dark:text-[#CBD5E1]">
                        {tx.items.join(', ')}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right font-mono-code font-medium tabular-nums">
                        {formatRupiah(tx.netAmount)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        {tx.stampEarned ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                            +1 Stempel
                          </span>
                        ) : (
                          <span className="text-[#646D78] dark:text-[#94A3B8]">
                            {tx.voucherUsedTitle || '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: WARGA SETIA */}
        {activeTab === 'warga' && (
          <div className="space-y-4">
            <div className="flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif-display text-2xl">
                  Warga Setia ({members.length} anggota aktif)
                </h3>
                <p className="text-xs text-[#646D78] dark:text-[#94A3B8]">
                  Klik kartu anggota untuk melihat pratinjau kartu stempel dan masa
                  berlaku keanggotaan.
                </p>
              </div>
              <div className="relative w-full @3xl:w-64">
                <Search className="w-3.5 h-3.5 text-[#8A929D] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Cari nama / HP / kode kartu..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 text-xs focus:outline-none focus:border-[#16202C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 @3xl:grid-cols-2 @5xl:grid-cols-3 gap-4">
              {filteredMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setInspectedMemberId(m.id)}
                  className="text-left rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-5 hover:border-[#16202C]/40 transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-serif-display text-xl">{m.name}</p>
                      <p className="font-mono-code text-[11px] text-[#646D78] dark:text-[#94A3B8]">
                        {m.phone} · {m.serialCode}
                      </p>
                    </div>
                    <span className="font-mono-code text-sm font-bold tabular-nums">
                      {m.stamps}/10
                    </span>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-[#EFECE5] dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#16202C] dark:bg-[#F4F1EA]"
                      style={{ width: `${m.stamps * 10}%` }}
                    />
                  </div>

                  <div className="pt-1 space-y-1.5 text-xs text-[#55606E] dark:text-[#CBD5E1] border-t border-[#EFECE5] dark:border-white/10">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#646D78] dark:text-[#94A3B8]">
                        Terakhir pakai
                      </span>
                      <span className="font-medium tabular-nums">
                        {m.lastUsedAt} ·{' '}
                        {m.lastUsedOutlet === 'pemuda' ? 'Pemuda' : 'AWANNCOSTA'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#646D78] dark:text-[#94A3B8]">
                        Expired keanggotaan
                      </span>
                      <span
                        className={`font-medium tabular-nums ${
                          m.membershipStatus === 'segera_berakhir'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-[#16202C] dark:text-white'
                        }`}
                      >
                        {m.membershipExpiresAt}
                        {m.membershipStatus === 'segera_berakhir'
                          ? ' (Segera berakhir)'
                          : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#646D78] dark:text-[#94A3B8] pt-1">
                    <span>
                      {m.vouchers.filter((v) => v.status === 'active').length}{' '}
                      voucher aktif
                    </span>
                    <span className="font-mono-code tabular-nums">
                      {formatRupiah(m.totalSpentAllTime)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: DATABASE KEANGGOTAAN */}
        {activeTab === 'database-anggota' && (() => {
          const q = dbSearch.trim().toLowerCase();
          const dbRows = members.filter((m) => {
            const matchQ =
              !q ||
              m.name.toLowerCase().includes(q) ||
              m.phone.includes(q) ||
              (m.email && m.email.toLowerCase().includes(q)) ||
              m.serialCode.toLowerCase().includes(q);
            const matchStatus =
              dbStatusFilter === 'all' || m.membershipStatus === dbStatusFilter;
            const matchOutlet =
              dbOutletFilter === 'all' || m.favoriteOutlet === dbOutletFilter;
            return matchQ && matchStatus && matchOutlet;
          });

          const handleExportMembersCsv = () => {
            const header = [
              'Kode Kartu',
              'Nama',
              'Nomor WA',
              'Email',
              'Tanggal Lahir',
              'Outlet Favorit',
              'Stempel',
              'Kartu Selesai',
              'Total Cangkir',
              'Total Belanja',
              'Terakhir Penggunaan',
              'Tanggal Gabung',
              'Expired Keanggotaan',
              'Status',
            ];
            const lines = dbRows.map((m) =>
              [
                m.serialCode,
                m.name,
                m.phone,
                m.email || '-',
                m.birthday || '-',
                m.favoriteOutlet === 'pemuda' ? 'RTRW Pemuda' : 'RTRW AWANNCOSTA',
                `${m.stamps}/10`,
                m.completedCards,
                m.totalCupsAllTime,
                m.totalSpentAllTime,
                `${m.lastUsedAt} (${m.lastUsedOutlet})`,
                m.joinedAt,
                m.membershipExpiresAt,
                m.membershipStatus,
              ].join(',')
            );
            const csv = [header.join(','), ...lines].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'database-keanggotaan-rtrw.csv';
            a.click();
            URL.revokeObjectURL(url);
          };

          return (
            <div className="space-y-4">
              <div className="flex flex-col @3xl:flex-row @3xl:items-end justify-between gap-4">
                <div>
                  <h2 className="font-serif-display text-2xl @3xl:text-[28px] font-normal">
                    Database keanggotaan
                  </h2>
                  <p className="text-xs text-[#646D78] dark:text-[#94A3B8] mt-1">
                    Data lengkap seluruh warga RTRW termasuk kontak, outlet favorit,
                    riwayat pakai terakhir, dan masa berlaku keanggotaan.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportMembersCsv}
                  className="inline-flex items-center gap-2 self-start @3xl:self-auto px-4 py-2 rounded-full bg-white dark:bg-[#161E29] border border-[#E2DDD4] dark:border-white/15 text-xs font-medium hover:bg-[#F3EFE6] dark:hover:bg-[#1F2937] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor CSV Anggota</span>
                </button>
              </div>

              {/* Filter Bar */}
              <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-[#8A929D] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={dbSearch}
                    onChange={(e) => setDbSearch(e.target.value)}
                    placeholder="Cari nama, nomor WA, email, atau kode kartu..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#E6E2DA] dark:border-white/10 text-xs focus:outline-none focus:border-[#16202C]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={dbStatusFilter}
                    onChange={(e) =>
                      setDbStatusFilter(
                        e.target.value as 'all' | 'aktif' | 'segera_berakhir'
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#E6E2DA] dark:border-white/10 text-xs"
                  >
                    <option value="all">Semua Status</option>
                    <option value="aktif">Aktif</option>
                    <option value="segera_berakhir">Segera Berakhir</option>
                  </select>

                  <select
                    value={dbOutletFilter}
                    onChange={(e) =>
                      setDbOutletFilter(e.target.value as 'all' | OutletId)
                    }
                    className="px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#E6E2DA] dark:border-white/10 text-xs"
                  >
                    <option value="all">Semua Outlet Favorit</option>
                    <option value="pemuda">RTRW Pemuda</option>
                    <option value="awanncosta">RTRW AWANNCOSTA</option>
                  </select>
                </div>
              </div>

              {/* Full Database Table */}
              <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#EFECE5] dark:border-white/10 text-[10px] uppercase tracking-[0.14em] text-[#646D78] dark:text-[#94A3B8]">
                      <tr>
                        <th className="py-3.5 px-4 font-semibold whitespace-nowrap">
                          Kode Kartu
                        </th>
                        <th className="py-3.5 px-4 font-semibold whitespace-nowrap">
                          Nama &amp; Kontak
                        </th>
                        <th className="py-3.5 px-4 font-semibold whitespace-nowrap">
                          Tgl Lahir
                        </th>
                        <th className="py-3.5 px-4 font-semibold whitespace-nowrap">
                          Outlet Favorit
                        </th>
                        <th className="py-3.5 px-4 font-semibold text-right whitespace-nowrap">
                          Stempel
                        </th>
                        <th className="py-3.5 px-4 font-semibold text-right whitespace-nowrap">
                          Total Belanja
                        </th>
                        <th className="py-3.5 px-4 font-semibold whitespace-nowrap">
                          Terakhir Pakai
                        </th>
                        <th className="py-3.5 px-4 font-semibold whitespace-nowrap">
                          Gabung
                        </th>
                        <th className="py-3.5 px-4 font-semibold whitespace-nowrap">
                          Expired
                        </th>
                        <th className="py-3.5 px-4 font-semibold text-right whitespace-nowrap">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFECE5] dark:divide-white/10">
                      {dbRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={10}
                            className="py-8 text-center text-xs text-[#646D78]"
                          >
                            Tidak ada anggota yang sesuai dengan filter.
                          </td>
                        </tr>
                      ) : (
                        dbRows.map((m) => (
                          <tr
                            key={m.id}
                            onClick={() => setInspectedMemberId(m.id)}
                            className="hover:bg-[#FAF8F4] dark:hover:bg-white/[0.03] cursor-pointer transition-colors"
                          >
                            <td className="py-3.5 px-4 font-mono-code text-[11px] font-medium whitespace-nowrap">
                              {m.serialCode}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <p className="font-medium text-[13px]">{m.name}</p>
                              <p className="text-[11px] text-[#646D78] dark:text-[#94A3B8]">
                                {m.phone}
                                {m.email ? ` · ${m.email}` : ''}
                              </p>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-[#55606E] dark:text-[#CBD5E1]">
                              {m.birthday || '—'}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {m.favoriteOutlet === 'pemuda'
                                ? 'RTRW Pemuda'
                                : 'RTRW AWANNCOSTA'}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono-code tabular-nums whitespace-nowrap">
                              <span className="font-semibold">{m.stamps}/10</span>
                              <span className="text-[#646D78] ml-1.5">
                                ({m.completedCards} kartu)
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono-code tabular-nums whitespace-nowrap">
                              <p className="font-medium">
                                {formatRupiah(m.totalSpentAllTime)}
                              </p>
                              <p className="text-[11px] text-[#646D78]">
                                {m.totalCupsAllTime} cangkir
                              </p>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <p>{m.lastUsedAt}</p>
                              <p className="text-[11px] text-[#646D78]">
                                {m.lastUsedOutlet === 'pemuda'
                                  ? 'Pemuda'
                                  : 'AWANNCOSTA'}
                              </p>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-[#55606E] dark:text-[#CBD5E1]">
                              {m.joinedAt}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap font-medium tabular-nums">
                              {m.membershipExpiresAt}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <span
                                className={`text-[11px] font-semibold ${
                                  m.membershipStatus === 'segera_berakhir'
                                    ? 'text-amber-700 dark:text-amber-400'
                                    : 'text-emerald-700 dark:text-emerald-400'
                                }`}
                              >
                                {m.membershipStatus === 'segera_berakhir'
                                  ? 'Segera Berakhir'
                                  : 'Aktif'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 6: PESAN WA */}
        {activeTab === 'pesan-wa' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-serif-display text-2xl">
                Otomasi pesan WhatsApp
              </h3>
              <p className="text-xs text-[#646D78] dark:text-[#94A3B8]">
                Notifikasi hangat otomatis saat ulang tahun atau mendekati hadiah
                stempel.
              </p>
            </div>

            <div className="grid grid-cols-1 @3xl:grid-cols-3 gap-4">
              {waTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[#646D78]" />
                        <h4 className="font-medium text-sm">{tpl.title}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleWaTemplate(tpl.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider cursor-pointer ${
                          tpl.enabled
                            ? 'bg-[#16202C] text-white dark:bg-[#F4F1EA] dark:text-[#16202C]'
                            : 'bg-[#EFECE5] text-[#646D78] dark:bg-white/10 dark:text-[#94A3B8]'
                        }`}
                      >
                        {tpl.enabled ? 'Aktif' : 'Jeda'}
                      </button>
                    </div>

                    <p className="text-[11px] text-[#646D78] dark:text-[#94A3B8]">
                      {tpl.trigger}
                    </p>

                    <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] p-3 text-xs leading-relaxed text-[#394452] dark:text-[#CBD5E1]">
                      “{tpl.messagePreview}”
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#EFECE5] dark:border-white/10 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#646D78] dark:text-[#94A3B8]">
                      {tpl.lastSent}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSendTestWa(tpl)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DED9CF] dark:border-white/15 text-xs font-medium hover:bg-[#16202C] hover:text-white dark:hover:bg-white dark:hover:text-[#16202C] transition-colors cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Uji Kirim</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: ATURAN PROGRAM */}
        {activeTab === 'aturan' && (
          <form onSubmit={handleSaveRules} className="space-y-6 max-w-4xl">
            <div className="grid grid-cols-1 @5xl:grid-cols-12 gap-6 items-start">
              {/* Left: Parameter & Pilihan Minuman Gratis */}
              <div className="@5xl:col-span-6 space-y-6">
                <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-6 space-y-5">
                  <div>
                    <h3 className="font-serif-display text-2xl">
                      Pengaturan kartu stempel
                    </h3>
                    <p className="text-xs text-[#646D78] dark:text-[#94A3B8] mt-1">
                      Aturan ini berlaku untuk Member App dan validasi Kasir POS.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1.5">
                        Belanja minimal per stempel (Rp)
                      </label>
                      <input
                        type="number"
                        step={1000}
                        value={rulesDraft.minSpendForStamp}
                        onChange={(e) =>
                          setRulesDraft({
                            ...rulesDraft,
                            minSpendForStamp: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 font-mono-code text-sm tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1.5">
                        Masa berlaku voucher (hari)
                      </label>
                      <input
                        type="number"
                        value={rulesDraft.voucherValidityDays}
                        onChange={(e) =>
                          setRulesDraft({
                            ...rulesDraft,
                            voucherValidityDays: Number(e.target.value) || 1,
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 font-mono-code text-sm tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 @3xl:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1.5">
                        Hadiah stempel ke-3
                      </label>
                      <input
                        type="text"
                        value={rulesDraft.milestone3Label}
                        onChange={(e) =>
                          setRulesDraft({
                            ...rulesDraft,
                            milestone3Label: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5">
                        Hadiah stempel ke-6
                      </label>
                      <input
                        type="text"
                        value={rulesDraft.milestone6Label}
                        onChange={(e) =>
                          setRulesDraft({
                            ...rulesDraft,
                            milestone6Label: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5">
                        Hadiah stempel ke-10
                      </label>
                      <input
                        type="text"
                        value={rulesDraft.milestone10Label}
                        onChange={(e) =>
                          setRulesDraft({
                            ...rulesDraft,
                            milestone10Label: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-1">
                    <label className="inline-flex items-center gap-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rulesDraft.birthdayRewardEnabled}
                        onChange={(e) =>
                          setRulesDraft({
                            ...rulesDraft,
                            birthdayRewardEnabled: e.target.checked,
                          })
                        }
                        className="rounded border-[#DED9CF]"
                      />
                      <span>
                        Aktifkan hadiah 1 minuman gratis di bulan ulang tahun
                      </span>
                    </label>

                    <label className="inline-flex items-center gap-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rulesDraft.allowCrossOutlet}
                        onChange={(e) =>
                          setRulesDraft({
                            ...rulesDraft,
                            allowCrossOutlet: e.target.checked,
                          })
                        }
                        className="rounded border-[#DED9CF]"
                      />
                      <span>
                        Voucher &amp; stempel berlaku lintas outlet (Pemuda &amp;
                        AWANNCOSTA)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Pilihan Minuman Gratis */}
                <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-6 space-y-4">
                  <div>
                    <h3 className="font-serif-display text-xl">
                      Pilihan menu minuman gratis (Stempel 10)
                    </h3>
                    <p className="text-xs text-[#646D78] dark:text-[#94A3B8] mt-1">
                      Daftar minuman yang boleh dipilih anggota saat menukar
                      hadiah stempel ke-10.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {rulesDraft.freeDrinkOptions.map((drink) => (
                      <span
                        key={drink}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs font-medium"
                      >
                        <span>{drink}</span>
                        <button
                          type="button"
                          aria-label={`Hapus ${drink}`}
                          onClick={() =>
                            setRulesDraft({
                              ...rulesDraft,
                              freeDrinkOptions:
                                rulesDraft.freeDrinkOptions.filter(
                                  (d) => d !== drink
                                ),
                            })
                          }
                          className="text-[#8A929D] hover:text-red-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFreeDrink}
                      onChange={(e) => setNewFreeDrink(e.target.value)}
                      placeholder="Tambah nama minuman (cth: Hojicha Latte)..."
                      className="flex-1 px-3.5 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newFreeDrink.trim();
                        if (
                          trimmed &&
                          !rulesDraft.freeDrinkOptions.includes(trimmed)
                        ) {
                          setRulesDraft({
                            ...rulesDraft,
                            freeDrinkOptions: [
                              ...rulesDraft.freeDrinkOptions,
                              trimmed,
                            ],
                          });
                          setNewFreeDrink('');
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#EFECE5] dark:bg-white/10 text-xs font-semibold hover:bg-[#E2DDD4] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Kata-kata Aturan Program di Beranda */}
              <div className="@5xl:col-span-6 rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-6 space-y-4">
                <div>
                  <h3 className="font-serif-display text-2xl">
                    Kata-kata aturan program di Beranda
                  </h3>
                  <p className="text-xs text-[#646D78] dark:text-[#94A3B8] mt-1">
                    Teks ini langsung tampil pada bagian <em>Aturan Program</em>{' '}
                    di halaman Beranda.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Judul bagian
                  </label>
                  <input
                    type="text"
                    value={rulesDraft.landingSectionTitle}
                    onChange={(e) =>
                      setRulesDraft({
                        ...rulesDraft,
                        landingSectionTitle: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Penjelasan utama program
                  </label>
                  <textarea
                    rows={3}
                    value={rulesDraft.landingProgramIntro}
                    onChange={(e) =>
                      setRulesDraft({
                        ...rulesDraft,
                        landingProgramIntro: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Keterangan Stempel 03
                  </label>
                  <textarea
                    rows={2}
                    value={rulesDraft.landingMilestone3Desc}
                    onChange={(e) =>
                      setRulesDraft({
                        ...rulesDraft,
                        landingMilestone3Desc: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Keterangan Stempel 06
                  </label>
                  <textarea
                    rows={2}
                    value={rulesDraft.landingMilestone6Desc}
                    onChange={(e) =>
                      setRulesDraft({
                        ...rulesDraft,
                        landingMilestone6Desc: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Keterangan Stempel 10
                  </label>
                  <textarea
                    rows={2}
                    value={rulesDraft.landingMilestone10Desc}
                    onChange={(e) =>
                      setRulesDraft({
                        ...rulesDraft,
                        landingMilestone10Desc: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs leading-relaxed"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="px-6 py-3 rounded-full bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-xs font-semibold cursor-pointer"
              >
                Simpan Aturan &amp; Teks Beranda
              </button>
              {rulesSaved && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  Tersimpan ke Beranda &amp; aplikasi
                </span>
              )}
            </div>
          </form>
        )}

        {/* TAB 9: KONTEN & FOTO BERANDA */}
        {activeTab === 'konten-beranda' && (
          <form
            onSubmit={handleSaveLandingContent}
            className="space-y-6 max-w-5xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-serif-display text-2xl">
                  Konten &amp; Foto Beranda
                </h3>
                <p className="text-xs text-[#646D78] dark:text-[#94A3B8] mt-1">
                  Ubah judul Hero, tombol, kartu pratinjau, foto outlet, alamat,
                  hingga teks footer Beranda secara langsung.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetLandingDefaults}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#DED9CF] dark:border-white/15 bg-white dark:bg-[#161E29] text-xs font-medium hover:bg-[#F3EFE6] dark:hover:bg-[#1F2937] transition-colors whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Kembalikan Default</span>
              </button>
            </div>

            {/* Hero & Footer Editor */}
            <div className="grid grid-cols-1 @5xl:grid-cols-12 gap-6 items-start">
              <div className="@5xl:col-span-7 rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-6 space-y-4">
                <div>
                  <h4 className="font-serif-display text-xl">
                    Teks Utama (Hero) Beranda
                  </h4>
                  <p className="text-xs text-[#646D78] dark:text-[#94A3B8] mt-0.5">
                    Headline pembuka yang pertama kali dilihat pengunjung saat
                    membuka halaman utama.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Label atas (kicker)
                  </label>
                  <input
                    type="text"
                    value={landingDraft.heroKicker}
                    onChange={(e) =>
                      setLandingDraft({
                        ...landingDraft,
                        heroKicker: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs tracking-wider uppercase"
                  />
                </div>

                <div className="grid grid-cols-1 @3xl:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      Judul baris 1
                    </label>
                    <input
                      type="text"
                      value={landingDraft.heroLine1}
                      onChange={(e) =>
                        setLandingDraft({
                          ...landingDraft,
                          heroLine1: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      Kata miring (aksen)
                    </label>
                    <input
                      type="text"
                      value={landingDraft.heroItalicWord}
                      onChange={(e) =>
                        setLandingDraft({
                          ...landingDraft,
                          heroItalicWord: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs italic"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      Judul baris 3
                    </label>
                    <input
                      type="text"
                      value={landingDraft.heroLine3}
                      onChange={(e) =>
                        setLandingDraft({
                          ...landingDraft,
                          heroLine3: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Subjudul Hero
                  </label>
                  <textarea
                    rows={3}
                    value={landingDraft.heroSubtitle}
                    onChange={(e) =>
                      setLandingDraft({
                        ...landingDraft,
                        heroSubtitle: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      Teks tombol daftar (utama)
                    </label>
                    <input
                      type="text"
                      value={landingDraft.heroPrimaryCta}
                      onChange={(e) =>
                        setLandingDraft({
                          ...landingDraft,
                          heroPrimaryCta: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      Teks tombol masuk (sekunder)
                    </label>
                    <input
                      type="text"
                      value={landingDraft.heroSecondaryCta}
                      onChange={(e) =>
                        setLandingDraft({
                          ...landingDraft,
                          heroSecondaryCta: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Kartu Pratinjau & Footer */}
              <div className="@5xl:col-span-5 rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-6 space-y-4">
                <div>
                  <h4 className="font-serif-display text-xl">
                    Kartu Pratinjau &amp; Footer
                  </h4>
                  <p className="text-xs text-[#646D78] dark:text-[#94A3B8] mt-0.5">
                    Identitas kartu stempel di Hero serta catatan kaki Beranda.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      Nama pada kartu
                    </label>
                    <input
                      type="text"
                      value={landingDraft.heroCardHolder}
                      onChange={(e) =>
                        setLandingDraft({
                          ...landingDraft,
                          heroCardHolder: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      Kode seri kartu
                    </label>
                    <input
                      type="text"
                      value={landingDraft.heroCardCode}
                      onChange={(e) =>
                        setLandingDraft({
                          ...landingDraft,
                          heroCardCode: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 font-mono-code text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Keterangan di bawah kartu Hero
                  </label>
                  <input
                    type="text"
                    value={landingDraft.heroCardCaption}
                    onChange={(e) =>
                      setLandingDraft({
                        ...landingDraft,
                        heroCardCaption: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                  />
                </div>

                <div className="pt-2 border-t border-[#EFECE5] dark:border-white/10 space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      Teks hak cipta (Footer kiri)
                    </label>
                    <input
                      type="text"
                      value={landingDraft.footerCopyright}
                      onChange={(e) =>
                        setLandingDraft({
                          ...landingDraft,
                          footerCopyright: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      Teks ajakan pasang aplikasi (Footer kanan)
                    </label>
                    <input
                      type="text"
                      value={landingDraft.footerInstallHint}
                      onChange={(e) =>
                        setLandingDraft({
                          ...landingDraft,
                          footerInstallHint: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Outlet Photos & Info Editor */}
            <div className="grid grid-cols-1 @5xl:grid-cols-2 gap-6">
              {outletsDraft.map((outlet) => (
                <div
                  key={outlet.id}
                  className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 overflow-hidden flex flex-col"
                >
                  <div className="relative h-48 bg-[#EFECE5] dark:bg-[#1F2937] overflow-hidden">
                    {draftImgErrors[outlet.id] || !outlet.image ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#646D78] dark:text-[#94A3B8]">
                        <Coffee className="w-6 h-6 opacity-60" />
                        <span className="font-serif-display text-base">
                          {outlet.name}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={outlet.image}
                        alt={outlet.name}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setDraftImgErrors((prev) => ({
                            ...prev,
                            [outlet.id]: true,
                          }))
                        }
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#16202C]/90 text-white text-xs font-medium hover:bg-[#16202C] transition-colors whitespace-nowrap cursor-pointer shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Unggah Foto Baru</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            handleUploadOutletPhoto(outlet.id, file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleResetOutletPhoto(outlet.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-[#161E29]/90 text-[#16202C] dark:text-[#F4F1EA] border border-[#E6E2DA] dark:border-white/15 text-xs font-medium hover:bg-white transition-colors whitespace-nowrap cursor-pointer shadow-sm"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Foto Awal</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-4 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-serif-display text-xl">
                        Outlet {outlet.code} · {outlet.shortName}
                      </h4>
                      <span className="font-mono-code text-[11px] text-[#646D78] dark:text-[#94A3B8]">
                        ID: {outlet.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Nama outlet
                        </label>
                        <input
                          type="text"
                          value={outlet.name}
                          onChange={(e) =>
                            setOutletsDraft((prev) =>
                              prev.map((o) =>
                                o.id === outlet.id
                                  ? { ...o, name: e.target.value }
                                  : o
                              )
                            )
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Nama singkat (tab kasir)
                        </label>
                        <input
                          type="text"
                          value={outlet.shortName}
                          onChange={(e) =>
                            setOutletsDraft((prev) =>
                              prev.map((o) =>
                                o.id === outlet.id
                                  ? { ...o, shortName: e.target.value }
                                  : o
                              )
                            )
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Kawasan / Area
                        </label>
                        <input
                          type="text"
                          value={outlet.area}
                          onChange={(e) =>
                            setOutletsDraft((prev) =>
                              prev.map((o) =>
                                o.id === outlet.id
                                  ? { ...o, area: e.target.value }
                                  : o
                              )
                            )
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Jam operasional
                        </label>
                        <input
                          type="text"
                          value={outlet.hours}
                          onChange={(e) =>
                            setOutletsDraft((prev) =>
                              prev.map((o) =>
                                o.id === outlet.id
                                  ? { ...o, hours: e.target.value }
                                  : o
                              )
                            )
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Alamat lengkap
                      </label>
                      <input
                        type="text"
                        value={outlet.address}
                        onChange={(e) =>
                          setOutletsDraft((prev) =>
                            prev.map((o) =>
                              o.id === outlet.id
                                ? { ...o, address: e.target.value }
                                : o
                            )
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Telepon outlet
                        </label>
                        <input
                          type="text"
                          value={outlet.phone}
                          onChange={(e) =>
                            setOutletsDraft((prev) =>
                              prev.map((o) =>
                                o.id === outlet.id
                                  ? { ...o, phone: e.target.value }
                                  : o
                              )
                            )
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 font-mono-code text-xs tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Menu andalan (pisahkan koma)
                        </label>
                        <input
                          type="text"
                          value={menuTextByOutlet[outlet.id] ?? ''}
                          onChange={(e) =>
                            setMenuTextByOutlet((prev) => ({
                              ...prev,
                              [outlet.id]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="px-6 py-3 rounded-full bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                Simpan Konten &amp; Foto Beranda
              </button>
              {landingSaved && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  Tersimpan ke Beranda &amp; aplikasi
                </span>
              )}
            </div>
          </form>
        )}

        {/* TAB 10: AKUN KASIR */}
        {activeTab === 'akun-kasir' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-serif-display text-2xl">
                  Akun staf &amp; kasir
                </h3>
                <p className="text-xs text-[#646D78] dark:text-[#94A3B8]">
                  Kelola akses kasir untuk RTRW Pemuda dan RTRW AWANNCOSTA.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStaff((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-xs font-semibold cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Tambah Kasir</span>
              </button>
            </div>

            {showAddStaff && (
              <form
                onSubmit={handleCreateStaff}
                className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-5 grid grid-cols-1 @3xl:grid-cols-4 gap-3 items-end"
              >
                <div>
                  <label className="block text-xs font-medium mb-1">Nama</label>
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="cth: Bima"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={newStaffUsername}
                    onChange={(e) => setNewStaffUsername(e.target.value)}
                    placeholder="bima.pemuda"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Outlet</label>
                  <select
                    value={newStaffOutlet}
                    onChange={(e) =>
                      setNewStaffOutlet(e.target.value as OutletId)
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs"
                  >
                    <option value="pemuda">RTRW Pemuda</option>
                    <option value="awanncosta">RTRW AWANNCOSTA</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Simpan Akun</span>
                </button>
              </form>
            )}

            <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 divide-y divide-[#EFECE5] dark:divide-white/10">
              {staffAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-4 @3xl:px-5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{acc.name}</p>
                      <span className="font-mono-code text-[11px] text-[#646D78] dark:text-[#94A3B8]">
                        @{acc.username}
                      </span>
                    </div>
                    <p className="text-xs text-[#646D78] dark:text-[#94A3B8] mt-0.5">
                      {acc.roleLabel} · Aktif terakhir: {acc.lastActive}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {acc.role === 'kasir' && (
                      <span className="font-mono-code text-xs text-[#55606E] dark:text-[#CBD5E1] tabular-nums">
                        {acc.transactionsToday} tx hari ini
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onToggleStaffActive(acc.id)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
                        acc.active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                          : 'bg-[#EFECE5] text-[#646D78] dark:bg-white/10 dark:text-[#94A3B8]'
                      }`}
                    >
                      {acc.active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Member Stamp Card & Database Detail Modal */}
      {inspectedMember && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setInspectedMemberId(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#FAF8F4] dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#646D78]">
                  DETAIL KEANGGOTAAN · {inspectedMember.serialCode}
                </p>
                <h3 className="font-serif-display text-2xl mt-0.5">
                  {inspectedMember.name}
                </h3>
                <p className="text-xs text-[#646D78] dark:text-[#94A3B8]">
                  {inspectedMember.phone}
                  {inspectedMember.email ? ` · ${inspectedMember.email}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedMemberId(null)}
                className="p-1.5 rounded-lg text-[#646D78] hover:text-[#16202C] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <StampCard
              cardNumber={inspectedMember.cardNumber}
              holderName={inspectedMember.name}
              serialCode={inspectedMember.serialCode}
              stamps={inspectedMember.stamps}
              stampDates={inspectedMember.stampDates}
              compact={true}
            />

            <div className="grid grid-cols-2 gap-3 text-xs bg-white dark:bg-[#0E1319] p-4 rounded-xl border border-[#E6E2DA] dark:border-white/10">
              <div>
                <span className="text-[#646D78]">Terakhir penggunaan</span>
                <p className="font-medium mt-0.5">
                  {inspectedMember.lastUsedAt} · RTRW{' '}
                  {inspectedMember.lastUsedOutlet === 'pemuda'
                    ? 'Pemuda'
                    : 'AWANNCOSTA'}
                </p>
              </div>
              <div>
                <span className="text-[#646D78]">Expired keanggotaan</span>
                <p className="font-medium mt-0.5 tabular-nums">
                  {inspectedMember.membershipExpiresAt}
                </p>
              </div>
              <div>
                <span className="text-[#646D78]">Tanggal bergabung</span>
                <p className="font-medium mt-0.5">{inspectedMember.joinedAt}</p>
              </div>
              <div>
                <span className="text-[#646D78]">Ulang tahun</span>
                <p className="font-medium mt-0.5">
                  {inspectedMember.birthday || '—'}
                </p>
              </div>
              <div>
                <span className="text-[#646D78]">Total belanja</span>
                <p className="font-mono-code font-semibold mt-0.5 tabular-nums">
                  {formatRupiah(inspectedMember.totalSpentAllTime)}
                </p>
              </div>
              <div>
                <span className="text-[#646D78]">Total cangkir</span>
                <p className="font-mono-code font-semibold mt-0.5 tabular-nums">
                  {inspectedMember.totalCupsAllTime} cangkir (
                  {inspectedMember.completedCards} kartu)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => onExtendMembership(inspectedMember.id)}
                className="px-4 py-2 rounded-full bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-xs font-semibold cursor-pointer"
              >
                Perpanjang +1 Tahun
              </button>
              <button
                type="button"
                onClick={() => setInspectedMemberId(null)}
                className="px-4 py-2 rounded-full border border-[#DED9CF] dark:border-white/15 text-xs font-medium cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedTx(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono-code text-[11px] text-[#646D78]">
                  {selectedTx.id}
                </p>
                <h3 className="font-serif-display text-2xl mt-0.5">
                  {selectedTx.memberName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-lg text-[#646D78] hover:text-[#16202C] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#646D78]">Outlet</span>
                <span>
                  RTRW {selectedTx.outlet === 'pemuda' ? 'Pemuda' : 'AWANNCOSTA'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#646D78]">Kasir</span>
                <span>{selectedTx.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#646D78]">Menu</span>
                <span>{selectedTx.items.join(', ')}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#EFECE5] dark:border-white/10 font-semibold">
                <span>Netto</span>
                <span className="font-mono-code tabular-nums">
                  {formatRupiah(selectedTx.netAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
