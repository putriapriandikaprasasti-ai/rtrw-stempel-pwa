import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  KeyRound,
  Mail,
  MessageCircle,
  Moon,
  Phone,
  Sun,
} from 'lucide-react';
import { Member } from '../types';

export interface MemberResetCandidate {
  id: string;
  maskedHint: string;
  hasBirthday: boolean;
}

interface AuthMemberViewProps {
  initialMode?: 'masuk' | 'daftar';
  darkMode: boolean;
  onToggleDark: () => void;
  onBackLanding: () => void;
  onLoginMember: (identifier: string, pin: string) => Promise<boolean> | boolean;
  onRegisterMember: (payload: {
    name: string;
    contact: string;
    pin: string;
    birthday?: string;
  }) => Promise<{ ok: boolean; member?: Member; error?: string }>;
  onLookupMemberForReset: (
    method: 'phone' | 'email',
    contact: string
  ) => Promise<{ ok: boolean; candidate?: MemberResetCandidate; error?: string }>;
  onResetMemberPin: (payload: {
    memberId: string;
    verificationName: string;
    verificationExtra?: string;
    newPin: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

export const AuthMemberView: React.FC<AuthMemberViewProps> = ({
  initialMode = 'masuk',
  darkMode,
  onToggleDark,
  onBackLanding,
  onLoginMember,
  onRegisterMember,
  onLookupMemberForReset,
  onResetMemberPin,
}) => {
  const [mode, setMode] = useState<'masuk' | 'daftar' | 'lupa-pin'>(initialMode);
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const birthdayInputRef = useRef<HTMLInputElement | null>(null);

  // Lupa PIN states
  const [resetMethod, setResetMethod] = useState<'phone' | 'email'>('phone');
  const [resetContact, setResetContact] = useState('');
  const [resetCandidate, setResetCandidate] =
    useState<MemberResetCandidate | null>(null);
  const [verifyName, setVerifyName] = useState('');
  const [verifyExtra, setVerifyExtra] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  const openDatePicker = () => {
    const input = birthdayInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
        return;
      } catch {
        // Fallback below if browser blocks showPicker
      }
    }
    input.focus();
    input.click();
  };

  const formatBirthdayIndonesian = (isoOrText: string): string | undefined => {
    const trimmed = isoOrText.trim();
    if (!trimmed) return undefined;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (!match) return trimmed;
    const [, year, month, day] = match;
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    const monthName = months[Number(month) - 1];
    if (!monthName) return trimmed;
    return `${Number(day)} ${monthName} ${year}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!identifier.trim() || pin.trim().length !== 6) {
      setError('Masukkan nomor WhatsApp/email dan PIN 6 digit.');
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await onLoginMember(identifier.trim(), pin.trim());
      if (!ok) {
        setError(
          'Akun tidak ditemukan atau PIN tidak cocok. Periksa kembali nomor/email dan PIN Anda.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!name.trim()) {
      setError('Mohon isi nama panggilan kamu.');
      return;
    }
    if (!identifier.trim()) {
      setError('Masukkan nomor WhatsApp atau email aktif.');
      return;
    }
    if (!/^\d{6}$/.test(pin.trim())) {
      setError('PIN harus terdiri dari 6 digit angka.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await onRegisterMember({
        name: name.trim(),
        contact: identifier.trim(),
        pin: pin.trim(),
        birthday: formatBirthdayIndonesian(birthday),
      });
      if (!res.ok) {
        setError(
          res.error || 'Pendaftaran gagal disimpan. Silakan coba lagi.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLookupReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!resetContact.trim()) {
      setError(
        resetMethod === 'phone'
          ? 'Masukkan nomor HP / WhatsApp yang terdaftar.'
          : 'Masukkan alamat email yang terdaftar.'
      );
      return;
    }
    if (resetMethod === 'email' && !resetContact.includes('@')) {
      setError('Format email belum valid.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await onLookupMemberForReset(
        resetMethod,
        resetContact.trim()
      );
      if (!res.ok || !res.candidate) {
        setError(
          res.error ||
            `Akun dengan ${resetMethod === 'phone' ? 'nomor HP' : 'email'} tersebut belum ditemukan.`
        );
        return;
      }
      setResetCandidate(res.candidate);
      setVerifyName('');
      setVerifyExtra('');
      setNewPin('');
      setConfirmNewPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!resetCandidate) return;
    if (!verifyName.trim()) {
      setError('Masukkan nama lengkap atau nama panggilan yang terdaftar.');
      return;
    }
    if (!/^\d{6}$/.test(newPin)) {
      setError('PIN baru harus terdiri dari 6 digit angka.');
      return;
    }
    if (newPin !== confirmNewPin) {
      setError('Konfirmasi PIN baru tidak cocok.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onResetMemberPin({
        memberId: resetCandidate.id,
        verificationName: verifyName.trim(),
        verificationExtra: verifyExtra.trim() || undefined,
        newPin,
      });
      if (!res.ok) {
        setError(res.error || 'Verifikasi belum cocok. Periksa kembali data Anda.');
        return;
      }
      setIdentifier(resetContact.trim());
      setPin('');
      setResetCandidate(null);
      setMode('masuk');
      setSuccessMsg('PIN berhasil diperbarui. Silakan masuk dengan PIN barumu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForgotFlow = () => {
    setResetCandidate(null);
    setResetContact('');
    setVerifyName('');
    setVerifyExtra('');
    setNewPin('');
    setConfirmNewPin('');
    setError('');
  };

  const isMasukReady = identifier.trim().length > 3 && pin.trim().length === 6;
  const isDaftarReady =
    name.trim().length > 1 &&
    identifier.trim().length > 3 &&
    /^\d{6}$/.test(pin.trim());

  const adminHelpWaUrl = `https://wa.me/6281228101000?text=${encodeURIComponent(
    'Halo Admin RTRW, saya lupa PIN kartu stempel warga dan butuh bantuan verifikasi akun.'
  )}`;

  return (
    <div className="min-h-full bg-[#FAF8F4] dark:bg-[#0E1319] text-[#16202C] dark:text-[#F4F1EA]">
      {/* Header */}
      <header className="w-full border-b border-[#E6E2DA]/80 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-5 @3xl:px-8 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackLanding}
            className="flex items-baseline gap-2.5 cursor-pointer whitespace-nowrap"
          >
            <span className="font-serif-display text-xl @3xl:text-2xl font-bold tracking-tight">
              RTRW
            </span>
            <span className="text-[10px] font-medium tracking-[0.22em] text-[#5B6470] dark:text-[#94A3B8] uppercase">
              KARTU STEMPEL
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleDark}
            aria-label={darkMode ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            className="w-9 h-9 rounded-full border border-[#E2DDD4] dark:border-white/15 bg-white dark:bg-[#161E29] flex items-center justify-center hover:bg-[#F3EFE6] dark:hover:bg-[#1F2937] transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 @3xl:px-8 py-8 @3xl:py-14">
        <button
          type="button"
          onClick={onBackLanding}
          className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] uppercase text-[#5B6470] dark:text-[#94A3B8] hover:text-[#16202C] dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BERANDA</span>
        </button>

        <div className="mt-8 grid grid-cols-1 @3xl:grid-cols-12 gap-8 @3xl:gap-12 items-start">
          {/* Left Copy */}
          <div className="@3xl:col-span-5 space-y-4">
            <h1 className="font-serif-display text-4xl @3xl:text-5xl leading-[1.08] font-normal [text-wrap:balance]">
              {mode === 'masuk'
                ? 'Masuk ke kartu stempelmu.'
                : mode === 'daftar'
                  ? 'Jadi warga RTRW.'
                  : 'Atur ulang PIN kartu stempel.'}
            </h1>
            <p className="text-sm leading-relaxed text-[#55606E] dark:text-[#A3B1C2]">
              {mode === 'lupa-pin'
                ? 'Verifikasi kepemilikan akun menggunakan nomor WhatsApp atau email yang kamu daftarkan, lalu buat PIN 6 digit baru.'
                : 'Satu akun untuk RTRW Pemuda dan RTRW AWANNCOSTA. Gunakan nomor WhatsApp atau email, lalu PIN 6 digit yang kamu buat sendiri.'}
            </p>
          </div>

          {/* Right Form Card */}
          <div className="@3xl:col-span-7 flex @3xl:justify-end">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 shadow-xl shadow-[#16202C]/[0.05] p-6 @3xl:p-7">
              {/* Segmented Toggle */}
              <div className="grid grid-cols-2 p-1 rounded-full bg-[#EFECE5] dark:bg-[#0E1319]">
                <button
                  type="button"
                  onClick={() => {
                    setMode('masuk');
                    setError('');
                    resetForgotFlow();
                  }}
                  className={`py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    mode === 'masuk' || mode === 'lupa-pin'
                      ? 'bg-white dark:bg-[#1E293B] text-[#16202C] dark:text-white shadow-xs'
                      : 'text-[#646D78] dark:text-[#94A3B8] hover:text-[#16202C]'
                  }`}
                >
                  Masuk
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('daftar');
                    setError('');
                    setSuccessMsg('');
                    resetForgotFlow();
                  }}
                  className={`py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    mode === 'daftar'
                      ? 'bg-white dark:bg-[#1E293B] text-[#16202C] dark:text-white shadow-xs'
                      : 'text-[#646D78] dark:text-[#94A3B8] hover:text-[#16202C]'
                  }`}
                >
                  Daftar
                </button>
              </div>

              {mode === 'masuk' && (
                <form onSubmit={handleLogin} className="mt-6 space-y-4">
                  {successMsg && (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3.5 py-2.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0] mb-1.5">
                      Nomor WhatsApp atau email
                    </label>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="0812xxxxxxx atau nama@email.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm placeholder:text-[#9BA3AE] focus:outline-none focus:border-[#16202C] dark:focus:border-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0]">
                        PIN 6 digit
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('lupa-pin');
                          setError('');
                          setSuccessMsg('');
                          setResetMethod(
                            identifier.includes('@') ? 'email' : 'phone'
                          );
                          setResetContact(identifier.trim());
                          setResetCandidate(null);
                        }}
                        className="text-[11px] font-semibold text-[#55606E] dark:text-[#CBD5E1] hover:text-[#16202C] dark:hover:text-white underline underline-offset-4 cursor-pointer"
                      >
                        Lupa PIN?
                      </button>
                    </div>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm tracking-[0.25em] placeholder:tracking-[0.2em] placeholder:text-[#9BA3AE] focus:outline-none focus:border-[#16202C] dark:focus:border-white"
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3 rounded-full text-xs font-semibold transition-all cursor-pointer disabled:opacity-60 ${
                      isMasukReady
                        ? 'bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] hover:opacity-90'
                        : 'bg-[#8E959E] text-white hover:bg-[#16202C]'
                    }`}
                  >
                    {isSubmitting ? 'Memproses…' : 'Masuk'}
                  </button>
                </form>
              )}

              {mode === 'lupa-pin' && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[#16202C] dark:text-[#F4F1EA]" />
                      <h2 className="text-sm font-semibold">Reset PIN Warga</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('masuk');
                        resetForgotFlow();
                      }}
                      className="text-[11px] font-medium text-[#646D78] hover:text-[#16202C] dark:text-[#94A3B8] dark:hover:text-white cursor-pointer"
                    >
                      Kembali ke Masuk
                    </button>
                  </div>

                  {!resetCandidate ? (
                    <form onSubmit={handleLookupReset} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-medium text-[#646D78] dark:text-[#94A3B8] mb-1.5">
                          Pilih jalur verifikasi akun
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setResetMethod('phone');
                              setError('');
                            }}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                              resetMethod === 'phone'
                                ? 'border-[#16202C] dark:border-[#F4F1EA] bg-[#FAF8F4] dark:bg-[#0E1319] text-[#16202C] dark:text-white'
                                : 'border-[#DED9CF] dark:border-white/15 text-[#646D78] dark:text-[#94A3B8]'
                            }`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Nomor HP / WA</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResetMethod('email');
                              setError('');
                            }}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                              resetMethod === 'email'
                                ? 'border-[#16202C] dark:border-[#F4F1EA] bg-[#FAF8F4] dark:bg-[#0E1319] text-[#16202C] dark:text-white'
                                : 'border-[#DED9CF] dark:border-white/15 text-[#646D78] dark:text-[#94A3B8]'
                            }`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Email Terdaftar</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0] mb-1.5">
                          {resetMethod === 'phone'
                            ? 'Nomor HP / WhatsApp terdaftar'
                            : 'Alamat email terdaftar'}
                        </label>
                        <input
                          type={resetMethod === 'email' ? 'email' : 'text'}
                          value={resetContact}
                          onChange={(e) => setResetContact(e.target.value)}
                          placeholder={
                            resetMethod === 'phone'
                              ? '0812xxxxxxx'
                              : 'nama@email.com'
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm placeholder:text-[#9BA3AE] focus:outline-none focus:border-[#16202C] dark:focus:border-white"
                        />
                      </div>

                      {error && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {error}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-full bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60"
                      >
                        {isSubmitting ? 'Mencari akun…' : 'Cari Akun'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleConfirmResetPin} className="space-y-3.5">
                      <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#E6E2DA] dark:border-white/10 p-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#646D78] dark:text-[#94A3B8]">
                            Akun Ditemukan
                          </p>
                          <p className="text-xs font-medium mt-0.5">
                            {resetCandidate.maskedHint}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setResetCandidate(null);
                            setError('');
                          }}
                          className="text-[11px] underline text-[#646D78] cursor-pointer"
                        >
                          Ganti
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0] mb-1">
                          Nama lengkap / panggilan terdaftar
                        </label>
                        <input
                          type="text"
                          value={verifyName}
                          onChange={(e) => setVerifyName(e.target.value)}
                          placeholder="Ketik nama sesuai pendaftaran"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm focus:outline-none focus:border-[#16202C] dark:focus:border-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0] mb-1">
                          Kode Seri Kartu (opsional)
                        </label>
                        <input
                          type="text"
                          value={verifyExtra}
                          onChange={(e) => setVerifyExtra(e.target.value)}
                          placeholder="cth: RTRW-BAF6F4F7"
                          className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-xs font-mono-code uppercase focus:outline-none focus:border-[#16202C] dark:focus:border-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0] mb-1">
                            PIN baru (6 digit)
                          </label>
                          <input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={newPin}
                            onChange={(e) =>
                              setNewPin(e.target.value.replace(/\D/g, ''))
                            }
                            placeholder="••••••"
                            className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm tracking-[0.2em] focus:outline-none focus:border-[#16202C] dark:focus:border-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0] mb-1">
                            Ulangi PIN baru
                          </label>
                          <input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={confirmNewPin}
                            onChange={(e) =>
                              setConfirmNewPin(e.target.value.replace(/\D/g, ''))
                            }
                            placeholder="••••••"
                            className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm tracking-[0.2em] focus:outline-none focus:border-[#16202C] dark:focus:border-white"
                          />
                        </div>
                      </div>

                      {error && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {error}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-full bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60"
                      >
                        {isSubmitting ? 'Menyimpan…' : 'Simpan PIN Baru'}
                      </button>
                    </form>
                  )}

                  <div className="pt-3 border-t border-[#EFECE5] dark:border-white/10 space-y-2">
                    <p className="text-[11px] leading-relaxed text-[#646D78] dark:text-[#94A3B8]">
                      Verifikasi mencocokkan langsung Email/Nomor HP &amp; nama terdaftar di database RTRW (pengiriman kode OTP otomatis memerlukan layanan Email SMTP atau WhatsApp Gateway API).
                    </p>
                    <a
                      href={adminHelpWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#16202C] dark:text-[#F4F1EA] hover:underline"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Butuh bantuan? Chat Admin via WhatsApp</span>
                    </a>
                  </div>
                </div>
              )}

              {mode === 'daftar' && (
                <form onSubmit={handleRegister} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0] mb-1.5">
                      Nama
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama panggilan"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm placeholder:text-[#9BA3AE] focus:outline-none focus:border-[#16202C] dark:focus:border-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0] mb-1.5">
                      Nomor WhatsApp atau email
                    </label>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="0812xxxxxxx atau nama@email.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm placeholder:text-[#9BA3AE] focus:outline-none focus:border-[#16202C] dark:focus:border-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0] mb-1.5">
                      PIN 6 digit
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm tracking-[0.25em] placeholder:tracking-[0.2em] placeholder:text-[#9BA3AE] focus:outline-none focus:border-[#16202C] dark:focus:border-white"
                    />
                    <p className="mt-1 text-[11px] text-[#646D78] dark:text-[#94A3B8]">
                      Ingat PIN ini — dipakai setiap kali masuk.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="register-birthday"
                      className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0] mb-1.5"
                    >
                      Tanggal lahir (opsional)
                    </label>
                    <div className="relative">
                      <input
                        id="register-birthday"
                        ref={birthdayInputRef}
                        type="date"
                        max="2026-12-31"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        onClick={openDatePicker}
                        className="w-full px-3.5 py-2.5 pr-11 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm focus:outline-none focus:border-[#16202C] dark:focus:border-white [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:pointer-events-none cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={openDatePicker}
                        aria-label="Pilih tanggal lahir"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-[#646D78] hover:text-[#16202C] dark:hover:text-white hover:bg-[#FAF8F4] dark:hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-[#646D78] dark:text-[#94A3B8]">
                      Dapat gratis 1 minuman di bulan ulang tahunmu.
                    </p>
                  </div>

                  {error && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3 rounded-full text-xs font-semibold transition-all cursor-pointer disabled:opacity-60 ${
                      isDaftarReady
                        ? 'bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] hover:opacity-90'
                        : 'bg-[#8E959E] text-white hover:bg-[#16202C]'
                    }`}
                  >
                    {isSubmitting ? 'Mendaftar…' : 'Buat akun'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

