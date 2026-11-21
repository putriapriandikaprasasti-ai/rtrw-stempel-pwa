import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  KeyRound,
  LogOut,
  MapPin,
  Moon,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Sparkles,
  Sun,
  Ticket,
  X,
} from 'lucide-react';
import { StampCard } from '../components/StampCard';
import { formatRupiah } from '../data/mockData';
import {
  Member,
  MenuItem,
  OutletId,
  OutletInfo,
  ProgramRules,
  StaffAccount,
  StaffMemberUiConfig,
  Voucher,
} from '../types';

interface CashierViewProps {
  staff: StaffAccount;
  activeOutlet: OutletId;
  outlets: OutletInfo[];
  members: Member[];
  menuItems: MenuItem[];
  initialSelectedMemberId?: string | null;
  rules: ProgramRules;
  uiConfig: StaffMemberUiConfig;
  darkMode: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
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

type FindTab = 'scan' | 'manual';
type CameraStatus = 'idle' | 'starting' | 'active' | 'denied' | 'error';

export const CashierView: React.FC<CashierViewProps> = ({
  staff,
  activeOutlet,
  outlets,
  members,
  menuItems,
  initialSelectedMemberId = null,
  rules,
  uiConfig,
  darkMode,
  onToggleDark,
  onLogout,
  onRecordTransaction,
}) => {
  const activeOutletName =
    outlets.find((o) => o.id === activeOutlet)?.name ||
    (activeOutlet === 'pemuda' ? 'RTRW Pemuda' : 'RTRW AWANNCOSTA');
  const [findTab, setFindTab] = useState<FindTab>('scan');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [showOtherMenus, setShowOtherMenus] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    initialSelectedMemberId
  );

  // Camera scanner state
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraError, setCameraError] = useState<string>('');
  const [scanNotice, setScanNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const lastUnknownRef = useRef<{ code: string; at: number }>({
    code: '',
    at: 0,
  });

  // Transaction builder state
  const [selectedOrderItems, setSelectedOrderItems] = useState<
    { name: string; price: number }[]
  >([{ name: 'Kopi Susu Warga', price: 28000 }]);
  const [regularMenuName, setRegularMenuName] = useState('');
  const [regularMenuPrice, setRegularMenuPrice] = useState('');
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

  const outletActiveMenus = useMemo(
    () =>
      menuItems.filter((m) => m.active && m.outlets.includes(activeOutlet)),
    [menuItems, activeOutlet]
  );

  const quickMenuItems = useMemo(
    () => outletActiveMenus.filter((m) => m.isQuickMenu),
    [outletActiveMenus]
  );

  const otherOutletMenus = useMemo(
    () => outletActiveMenus.filter((m) => !m.isQuickMenu),
    [outletActiveMenus]
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

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current !== null) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus((prev) =>
      prev === 'active' || prev === 'starting' ? 'idle' : prev
    );
  }, []);

  const handleSelectMember = useCallback(
    (member: Member, preselectedVoucherId = '') => {
      stopCamera();
      setSelectedMemberId(member.id);
      setSelectedVoucherId(preselectedVoucherId);
      setLastReceipt(null);
      setSearchQuery('');
      setManualCode('');
    },
    [stopCamera]
  );

  const resolveScannedOrTypedCode = useCallback(
    (rawInput: string, fromCamera: boolean): boolean => {
      const code = rawInput.trim();
      if (!code) return false;
      const lower = code.toLowerCase();
      const normalizedCard = code.replace(/\s+/g, '');

      // 1. Match member by serial code, phone, or card number
      const matchedMember = members.find(
        (m) =>
          m.serialCode.toLowerCase() === lower ||
          m.phone === code ||
          m.cardNumber.replace(/\s+/g, '') === normalizedCard
      );

      if (matchedMember) {
        handleSelectMember(matchedMember);
        setScanNotice({
          type: 'success',
          message: `Pelanggan teridentifikasi: ${matchedMember.name} (${matchedMember.serialCode}).`,
        });
        return true;
      }

      // 2. Match by voucher code
      for (const m of members) {
        const matchedVoucher = m.vouchers.find(
          (v) => v.code.toLowerCase() === lower
        );
        if (matchedVoucher) {
          if (matchedVoucher.status !== 'active') {
            setScanNotice({
              type: 'error',
              message: `Voucher ${matchedVoucher.code} milik ${m.name} sudah terpakai.`,
            });
            return false;
          }
          handleSelectMember(m, matchedVoucher.id);
          setScanNotice({
            type: 'success',
            message: `Voucher ${matchedVoucher.code} milik ${m.name} siap ditukarkan.`,
          });
          return true;
        }
      }

      // 3. Unknown code feedback (debounced for camera frames)
      const now = Date.now();
      if (
        !fromCamera ||
        lastUnknownRef.current.code !== lower ||
        now - lastUnknownRef.current.at > 2000
      ) {
        lastUnknownRef.current = { code: lower, at: now };
        setScanNotice({
          type: 'error',
          message: `Kode "${code}" tidak terdaftar sebagai member atau voucher aktif RTRW.`,
        });
      }
      return false;
    },
    [members, handleSelectMember]
  );

  const startCamera = useCallback(async () => {
    setCameraError('');
    setScanNotice(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraStatus('error');
      setCameraError(
        'Browser atau koneksi saat ini tidak mendukung akses kamera. Pastikan halaman dibuka lewat HTTPS atau gunakan input kode manual di bawah.'
      );
      return;
    }

    stopCamera();
    setCameraStatus('starting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.srcObject = stream;
        await videoEl.play().catch(() => {});
      }
      setCameraStatus('active');
    } catch (err) {
      stopCamera();
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setCameraError(
          'Izin kamera ditolak. Berikan izin kamera di browser HP Anda lalu tekan "Buka Kamera", atau gunakan input kode manual di bawah.'
        );
      } else if (
        name === 'NotFoundError' ||
        name === 'DevicesNotFoundError' ||
        name === 'OverconstrainedError'
      ) {
        setCameraStatus('error');
        setCameraError(
          'Kamera tidak ditemukan atau sedang dipakai aplikasi lain. Gunakan input kode manual di bawah sebagai cadangan.'
        );
      } else {
        setCameraStatus('error');
        setCameraError(
          'Tidak dapat mengakses kamera pada perangkat ini. Silakan gunakan input kode manual di bawah.'
        );
      }
    }
  }, [stopCamera]);

  // Scan frames while camera is active
  useEffect(() => {
    if (cameraStatus !== 'active') return;

    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) return;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (decoded && decoded.data) {
        resolveScannedOrTypedCode(decoded.data, true);
      }
    };

    scanTimerRef.current = window.setInterval(scanFrame, 220);

    return () => {
      if (scanTimerRef.current !== null) {
        window.clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
    };
  }, [cameraStatus, resolveScannedOrTypedCode]);

  // Stop camera when leaving Scan tab or unmounting
  useEffect(() => {
    if (findTab !== 'scan') {
      stopCamera();
    }
  }, [findTab, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    resolveScannedOrTypedCode(manualCode, false);
  };

  const handleAddMenuItem = (name: string, price: number) => {
    setSelectedOrderItems((prev) => [...prev, { name, price }]);
    if (price > 0) {
      setGrossAmount((prev) => prev + price);
    }
  };

  const handleRegularNameChange = (val: string) => {
    setRegularMenuName(val);
    const matched = outletActiveMenus.find(
      (m) => m.name.toLowerCase() === val.trim().toLowerCase()
    );
    if (matched) {
      setRegularMenuPrice(String(matched.price));
    }
  };

  const handleAddRegularMenu = () => {
    const trimmed = regularMenuName.trim();
    if (!trimmed) return;
    const parsedPrice = Math.max(0, Number(regularMenuPrice) || 0);
    handleAddMenuItem(trimmed, parsedPrice);
    setRegularMenuName('');
    setRegularMenuPrice('');
  };

  const handleRemoveOrderItem = (indexToRemove: number) => {
    const target = selectedOrderItems[indexToRemove];
    setSelectedOrderItems((prev) =>
      prev.filter((_, idx) => idx !== indexToRemove)
    );
    if (target && target.price > 0) {
      setGrossAmount((prev) => Math.max(0, prev - target.price));
    }
  };

  const handleSubmitTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || grossAmount <= 0) return;

    const itemNames = selectedOrderItems.map((item) => item.name);

    const result = onRecordTransaction({
      memberId: selectedMember.id,
      outlet: activeOutlet,
      items: itemNames.length > 0 ? itemNames : ['Pembelian Menu RTRW'],
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
                {uiConfig.cashierHeaderBadge}
              </span>
            </div>

            <span className="hidden @md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#161E29] border border-[#E2DDD4] dark:border-white/15 text-xs font-medium whitespace-nowrap">
              <MapPin className="w-3 h-3 text-[#646D78]" />
              <span>{activeOutletName}</span>
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
              onClick={() => {
                stopCamera();
                onLogout();
              }}
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
                {uiConfig.cashierStep1Title}
              </h1>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-5 space-y-4 shadow-xs">
              {/* Tabs: Scan vs Cari Manual */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-[#EFECE5] dark:bg-[#0E1319]">
                <button
                  type="button"
                  onClick={() => setFindTab('scan')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    findTab === 'scan'
                      ? 'bg-white dark:bg-[#1E293B] text-[#16202C] dark:text-white shadow-xs'
                      : 'text-[#646D78] dark:text-[#94A3B8]'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFindTab('manual')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    findTab === 'manual'
                      ? 'bg-white dark:bg-[#1E293B] text-[#16202C] dark:text-white shadow-xs'
                      : 'text-[#646D78] dark:text-[#94A3B8]'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Cari Pelanggan</span>
                </button>
              </div>

              {findTab === 'scan' ? (
                <div className="space-y-4">
                  {/* Live Camera Viewfinder */}
                  <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-[#16202C] text-white border border-[#E6E2DA]/40 dark:border-white/10">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${
                        cameraStatus === 'active' ? 'block' : 'hidden'
                      }`}
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {cameraStatus === 'active' && (
                      <>
                        {/* Reticle overlay */}
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                          <div className="w-44 h-44 rounded-2xl border-2 border-white/85 shadow-[0_0_0_9999px_rgba(14,19,25,0.42)]" />
                        </div>
                        <div className="pointer-events-none absolute bottom-3 inset-x-3 flex justify-center">
                          <span className="px-3 py-1 rounded-full bg-black/65 backdrop-blur-xs text-[11px] font-medium text-white">
                            Arahkan kamera ke QR Member atau Voucher
                          </span>
                        </div>
                      </>
                    )}

                    {cameraStatus === 'starting' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center space-y-2">
                        <RefreshCw className="w-7 h-7 text-white/85 animate-spin" />
                        <p className="text-xs text-white/85">
                          Meminta izin akses kamera…
                        </p>
                      </div>
                    )}

                    {(cameraStatus === 'idle' ||
                      cameraStatus === 'denied' ||
                      cameraStatus === 'error') && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center space-y-3">
                        <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center">
                          {cameraStatus === 'denied' || cameraStatus === 'error' ? (
                            <CameraOff className="w-5 h-5 text-amber-300" />
                          ) : (
                            <QrCode className="w-5 h-5 text-white/85" />
                          )}
                        </div>
                        <div className="space-y-1 max-w-xs">
                          <p className="text-xs font-semibold text-white">
                            {cameraStatus === 'denied'
                              ? 'Izin Kamera Ditolak'
                              : cameraStatus === 'error'
                                ? 'Kamera Tidak Tersedia'
                                : 'Pemindai Kamera QR'}
                          </p>
                          <p className="text-[11px] leading-relaxed text-white/75">
                            {cameraError ||
                              'Tekan tombol di bawah untuk mengaktifkan kamera HP dan memindai QR pelanggan.'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FAF8F4] text-[#16202C] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>
                            {cameraStatus === 'idle'
                              ? 'Izinkan & Buka Kamera'
                              : 'Coba Buka Kamera Lagi'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {cameraStatus === 'active' && (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="w-full py-2.5 px-4 rounded-xl border border-[#DED9CF] dark:border-white/15 text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-[#FAF8F4] dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <CameraOff className="w-3.5 h-3.5" />
                      <span>Matikan Kamera</span>
                    </button>
                  )}

                  {scanNotice && (
                    <div
                      className={`rounded-xl px-3.5 py-2.5 text-xs flex items-start gap-2 border ${
                        scanNotice.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                          : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                      }`}
                    >
                      {scanNotice.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <span>{scanNotice.message}</span>
                    </div>
                  )}

                  <div className="relative flex items-center justify-center">
                    <div className="w-full border-t border-[#EFECE5] dark:border-white/10" />
                    <span className="bg-white dark:bg-[#161E29] px-3 text-[11px] text-[#646D78] dark:text-[#94A3B8] whitespace-nowrap">
                      atau input kode manual
                    </span>
                    <div className="w-full border-t border-[#EFECE5] dark:border-white/10" />
                  </div>

                  {/* Manual Fallback Input */}
                  <form onSubmit={handleManualCodeSubmit} className="space-y-2">
                    <label className="block text-[11px] font-medium text-[#55606E] dark:text-[#94A3B8]">
                      Kode Seri Member / Kode Voucher / No. HP
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1 min-w-0">
                        <KeyRound className="w-3.5 h-3.5 text-[#8A929D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                          placeholder="RTRW-XXXXXXXX / 0812…"
                          className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 font-mono-code text-xs placeholder:text-[#9BA3AE] focus:outline-none focus:border-[#16202C] dark:focus:border-white"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!manualCode.trim()}
                        className="px-4 py-2.5 rounded-xl bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0 cursor-pointer"
                      >
                        Pakai Kode
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="0812… / email / nama / kode seri"
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

                  {searchQuery.trim().length > 0 ? (
                    <div className="divide-y divide-[#EFECE5] dark:divide-white/10 border border-[#E6E2DA] dark:border-white/10 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
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
                              <p className="text-sm font-medium truncate">
                                {m.name}
                              </p>
                              <p className="text-[11px] text-[#646D78] dark:text-[#94A3B8] font-mono-code truncate">
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
                    <p className="text-xs leading-relaxed text-[#646D78] dark:text-[#94A3B8] py-2">
                      Ketik nama, nomor WhatsApp, email, atau kode seri anggota
                      untuk memilih pelanggan secara manual.
                    </p>
                  )}
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
                {uiConfig.cashierStep2Title}
              </h2>
            </div>

            {!selectedMember ? (
              <div className="rounded-2xl border border-dashed border-[#DED9CF] dark:border-white/15 bg-white/40 dark:bg-[#161E29]/40 p-10 text-center">
                <p className="text-sm text-[#646D78] dark:text-[#94A3B8]">
                  {uiConfig.cashierEmptyPrompt}
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
                      Stempel saat ini:{' '}
                      <strong>{selectedMember.stamps}/10</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMemberId(null);
                      setLastReceipt(null);
                      setScanNotice(null);
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
                      ? `+1 Stempel · ${activeOutletName}`
                      : null
                  }
                  brandTitle={uiConfig.cardBrandTitle}
                  cardSubtitle={uiConfig.cardSubtitle}
                  cardNumberLabel={uiConfig.cardNumberLabel}
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
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMemberId(null);
                        setLastReceipt(null);
                        setScanNotice(null);
                      }}
                      className="px-3 py-1.5 rounded-full bg-emerald-700 text-white text-[11px] font-semibold hover:bg-emerald-800 transition-colors shrink-0 whitespace-nowrap cursor-pointer"
                    >
                      Pelanggan Berikutnya →
                    </button>
                  </div>
                )}

                {/* Quick & Regular Menu Builder */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium">
                      Tambah Menu Cepat
                    </label>
                    <div className="flex items-center gap-3">
                      {otherOutletMenus.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowOtherMenus((v) => !v)}
                          className="text-[11px] font-medium text-[#394452] dark:text-[#CBD5E1] hover:underline cursor-pointer"
                        >
                          {showOtherMenus
                            ? 'Tutup menu lainnya'
                            : `+ Menu lainnya (${otherOutletMenus.length})`}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderItems([]);
                          setGrossAmount(0);
                        }}
                        className="text-[11px] text-[#646D78] hover:text-[#16202C] dark:hover:text-white cursor-pointer"
                      >
                        Kosongkan
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {quickMenuItems.length === 0 ? (
                      <p className="text-xs text-[#646D78] dark:text-[#94A3B8]">
                        Belum ada item di Tambahan Menu Cepat untuk outlet ini.
                      </p>
                    ) : (
                      quickMenuItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            handleAddMenuItem(item.name, item.price)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#E6E2DA] dark:border-white/10 text-xs hover:border-[#16202C] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{item.name}</span>
                          <span className="font-mono-code text-[11px] text-[#646D78]">
                            {Math.round(item.price / 1000)}k
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  {showOtherMenus && otherOutletMenus.length > 0 && (
                    <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#E6E2DA] dark:border-white/10 p-3 space-y-2">
                      <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#646D78] dark:text-[#94A3B8]">
                        MENU KESELURUHAN OUTLET
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {otherOutletMenus.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              handleAddMenuItem(item.name, item.price)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 text-xs hover:border-[#16202C] transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>{item.name}</span>
                            <span className="font-mono-code text-[11px] text-[#646D78]">
                              {Math.round(item.price / 1000)}k
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regular / Manual Menu Name & Price Input */}
                  <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#E6E2DA] dark:border-white/10 p-3 space-y-2">
                    <label
                      htmlFor="cashier-regular-menu"
                      className="block text-[11px] font-medium text-[#55606E] dark:text-[#CBD5E1]"
                    >
                      Input Nama Menu Reguler (untuk catatan database)
                    </label>
                    <div className="flex flex-col @md:flex-row gap-2">
                      <input
                        id="cashier-regular-menu"
                        type="text"
                        list="rtrw-outlet-menus"
                        value={regularMenuName}
                        onChange={(e) => handleRegularNameChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddRegularMenu();
                          }
                        }}
                        placeholder="Ketik nama menu reguler…"
                        className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white dark:bg-[#161E29] border border-[#DED9CF] dark:border-white/15 text-xs placeholder:text-[#9BA3AE] focus:outline-none focus:border-[#16202C] dark:focus:border-white"
                      />
                      <datalist id="rtrw-outlet-menus">
                        {outletActiveMenus.map((m) => (
                          <option key={m.id} value={m.name} />
                        ))}
                      </datalist>

                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          step={500}
                          value={regularMenuPrice}
                          onChange={(e) => setRegularMenuPrice(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddRegularMenu();
                            }
                          }}
                          placeholder="Harga (Rp)"
                          aria-label="Harga menu reguler"
                          className="w-28 px-3 py-2 rounded-xl bg-white dark:bg-[#161E29] border border-[#DED9CF] dark:border-white/15 font-mono-code text-xs tabular-nums placeholder:text-[#9BA3AE] focus:outline-none focus:border-[#16202C] dark:focus:border-white"
                        />
                        <button
                          type="button"
                          onClick={handleAddRegularMenu}
                          disabled={!regularMenuName.trim()}
                          className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Selected Order Items Chips */}
                  {selectedOrderItems.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-[#646D78] dark:text-[#94A3B8]">
                        Item tercatat ({selectedOrderItems.length}):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedOrderItems.map((item, idx) => (
                          <span
                            key={`${item.name}-${idx}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EFECE5] dark:bg-white/10 text-xs font-medium"
                          >
                            <span>{item.name}</span>
                            {item.price > 0 && (
                              <span className="font-mono-code text-[11px] text-[#646D78] dark:text-[#CBD5E1]">
                                {Math.round(item.price / 1000)}k
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveOrderItem(idx)}
                              aria-label={`Hapus ${item.name}`}
                              className="text-[#646D78] hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
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
                      <span className="text-[11px] text-[#646D78]">
                        Standar
                      </span>
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
                  {uiConfig.cashierSubmitButtonText}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};
