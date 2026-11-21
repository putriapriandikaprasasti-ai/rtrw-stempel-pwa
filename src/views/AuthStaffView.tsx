import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  Phone,
  Sun,
} from 'lucide-react';
import { OutletId, OutletInfo, StaffAccount, StaffMemberUiConfig } from '../types';

export interface StaffResetCandidate {
  id: string;
  maskedHint: string;
  roleLabel: string;
  role: StaffAccount['role'];
}

interface AuthStaffViewProps {
  staffAccounts: StaffAccount[];
  outlets: OutletInfo[];
  uiConfig: StaffMemberUiConfig;
  darkMode: boolean;
  onToggleDark: () => void;
  onBackLanding: () => void;
  onLoginStaff: (staff: StaffAccount, selectedOutlet: OutletId) => void;
  onLookupStaffForReset: (
    method: 'phone' | 'email',
    contact: string
  ) => Promise<{ ok: boolean; candidate?: StaffResetCandidate; error?: string }>;
  onResetStaffPassword: (payload: {
    staffId: string;
    verificationUsername: string;
    verificationOutlet: OutletId | 'all';
    newPassword: string;
  }) => Promise<{ ok: boolean; username?: string; error?: string }>;
}

export const AuthStaffView: React.FC<AuthStaffViewProps> = ({
  staffAccounts,
  outlets,
  uiConfig,
  darkMode,
  onToggleDark,
  onBackLanding,
  onLoginStaff,
  onLookupStaffForReset,
  onResetStaffPassword,
}) => {
  const [selectedOutlet, setSelectedOutlet] = useState<OutletId>('pemuda');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Lupa kata sandi staf
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetMethod, setResetMethod] = useState<'email' | 'phone'>('email');
  const [resetContact, setResetContact] = useState('');
  const [resetCandidate, setResetCandidate] =
    useState<StaffResetCandidate | null>(null);
  const [verifyUsername, setVerifyUsername] = useState('');
  const [verifyOutlet, setVerifyOutlet] = useState<OutletId | 'all'>('pemuda');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!username.trim() || !password.trim()) {
      setError('Masukkan username dan kata sandi staf Anda.');
      return;
    }
    const found = staffAccounts.find(
      (s) =>
        s.username.toLowerCase() === username.trim().toLowerCase() && s.active
    );
    if (!found) {
      setError('Akun staf tidak ditemukan atau sedang nonaktif.');
      return;
    }
    if (found.password && found.password !== '••••••' && password !== found.password) {
      setError('Username atau kata sandi tidak cocok.');
      return;
    }
    onLoginStaff(found, selectedOutlet);
  };

  const handleLookupStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!resetContact.trim()) {
      setError(
        resetMethod === 'email'
          ? 'Masukkan alamat email staf yang terdaftar.'
          : 'Masukkan nomor HP / WhatsApp staf yang terdaftar.'
      );
      return;
    }
    if (resetMethod === 'email' && !resetContact.includes('@')) {
      setError('Format email belum valid.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await onLookupStaffForReset(
        resetMethod,
        resetContact.trim()
      );
      if (!res.ok || !res.candidate) {
        setError(
          res.error ||
            `Akun staf dengan ${resetMethod === 'email' ? 'email' : 'nomor HP'} tersebut belum ditemukan.`
        );
        return;
      }
      setResetCandidate(res.candidate);
      setVerifyUsername('');
      setVerifyOutlet(
        res.candidate.role === 'admin_pusat' ? 'all' : 'pemuda'
      );
      setNewPassword('');
      setConfirmNewPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!resetCandidate) return;
    if (!verifyUsername.trim()) {
      setError('Masukkan username staf yang terdaftar.');
      return;
    }
    if (newPassword.trim().length < 6) {
      setError('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onResetStaffPassword({
        staffId: resetCandidate.id,
        verificationUsername: verifyUsername.trim(),
        verificationOutlet: verifyOutlet,
        newPassword: newPassword.trim(),
      });
      if (!res.ok) {
        setError(res.error || 'Verifikasi username atau outlet belum cocok.');
        return;
      }
      if (res.username) {
        setUsername(res.username);
      }
      setPassword('');
      setIsResetMode(false);
      setResetCandidate(null);
      setResetContact('');
      setSuccessMsg(
        'Kata sandi staf berhasil diperbarui. Silakan masuk dengan kata sandi baru.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const adminCenter = staffAccounts.find((s) => s.role === 'admin_pusat');
  const adminDigits = (adminCenter?.phone || '081228101000').replace(/\D/g, '');
  const adminWaDigits = adminDigits.startsWith('0')
    ? `62${adminDigits.slice(1)}`
    : adminDigits;
  const staffAdminWaUrl = `https://wa.me/${adminWaDigits}?text=${encodeURIComponent(
    'Halo Admin Pusat RTRW, saya butuh bantuan reset kata sandi akun staf/kasir.'
  )}`;

  const isReady = username.trim().length > 0 && password.trim().length > 0;

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
              {uiConfig.staffHeaderBadge}
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

      <main className="max-w-md mx-auto px-5 py-10 @3xl:py-14">
        <button
          type="button"
          onClick={onBackLanding}
          className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] uppercase text-[#5B6470] dark:text-[#94A3B8] hover:text-[#16202C] dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BERANDA</span>
        </button>

        <div className="mt-6 space-y-2">
          <h1 className="font-serif-display text-4xl font-normal">
            {isResetMode ? 'Reset kata sandi staf' : uiConfig.staffLoginTitle}
          </h1>
          <p className="text-sm text-[#55606E] dark:text-[#A3B1C2]">
            {isResetMode
              ? 'Verifikasi menggunakan email atau nomor HP staf yang terdaftar di Dasbor Admin.'
              : uiConfig.staffLoginSubtitle}
          </p>
        </div>

        {!isResetMode ? (
          <form
            onSubmit={handleSubmit}
            className="mt-7 rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 shadow-sm p-6 space-y-5"
          >
            {successMsg && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3.5 py-2.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0] mb-2">
                {uiConfig.staffOutletLabel}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {outlets.map((outlet) => {
                  const active = selectedOutlet === outlet.id;
                  return (
                    <button
                      key={outlet.id}
                      type="button"
                      onClick={() => setSelectedOutlet(outlet.id)}
                      className={`w-full min-w-0 p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 overflow-hidden ${
                        active
                          ? 'border-[#16202C] dark:border-[#F4F1EA] bg-[#FAF8F4] dark:bg-[#1E293B] ring-1 ring-[#16202C] dark:ring-[#F4F1EA]'
                          : 'border-[#E6E2DA] dark:border-white/10 hover:border-[#B8B2A6]'
                      }`}
                    >
                      <p className="font-serif-display text-base font-medium leading-snug break-words">
                        {outlet.shortName}
                      </p>
                      <div className="flex items-start gap-1.5 min-w-0 text-[11px] leading-snug text-[#646D78] dark:text-[#94A3B8]">
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span className="min-w-0 break-words">
                          {outlet.area}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0] mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="dimas.pemuda"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm focus:outline-none focus:border-[#16202C] dark:focus:border-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0]">
                  Kata sandi
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(true);
                    setError('');
                    setSuccessMsg('');
                    setResetCandidate(null);
                  }}
                  className="text-[11px] font-semibold text-[#55606E] dark:text-[#CBD5E1] hover:text-[#16202C] dark:hover:text-white underline underline-offset-4 cursor-pointer"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm focus:outline-none focus:border-[#16202C] dark:focus:border-white"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              className={`w-full py-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isReady
                  ? 'bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] hover:opacity-90'
                  : 'bg-[#8E959E] text-white hover:bg-[#16202C]'
              }`}
            >
              {uiConfig.staffLoginButtonText}
            </button>
          </form>
        ) : (
          <div className="mt-7 rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#16202C] dark:text-[#F4F1EA]" />
                <h2 className="text-sm font-semibold">Verifikasi Akun Staf</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(false);
                  setResetCandidate(null);
                  setError('');
                }}
                className="text-[11px] font-medium text-[#646D78] hover:text-[#16202C] dark:text-[#94A3B8] dark:hover:text-white cursor-pointer"
              >
                Kembali ke Login
              </button>
            </div>

            {!resetCandidate ? (
              <form onSubmit={handleLookupStaff} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-[#646D78] dark:text-[#94A3B8] mb-1.5">
                    Pilih metode verifikasi
                  </label>
                  <div className="grid grid-cols-2 gap-2">
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
                      <span>Email Staf</span>
                    </button>
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
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0] mb-1.5">
                    {resetMethod === 'email'
                      ? 'Email staf terdaftar'
                      : 'Nomor HP / WhatsApp staf terdaftar'}
                  </label>
                  <input
                    type={resetMethod === 'email' ? 'email' : 'text'}
                    value={resetContact}
                    onChange={(e) => setResetContact(e.target.value)}
                    placeholder={
                      resetMethod === 'email'
                        ? 'dimas.pemuda@rtrw.id'
                        : '0812xxxxxxxx'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm focus:outline-none focus:border-[#16202C] dark:focus:border-white"
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
                  {isSubmitting ? 'Mencari akun staf…' : 'Cari Akun Staf'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmResetPassword} className="space-y-4">
                <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#0E1319] border border-[#E6E2DA] dark:border-white/10 p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#646D78] dark:text-[#94A3B8]">
                      Akun Ditemukan
                    </p>
                    <p className="text-xs font-medium mt-0.5">
                      {resetCandidate.maskedHint} · {resetCandidate.roleLabel}
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
                    Konfirmasi Username terdaftar
                  </label>
                  <input
                    type="text"
                    value={verifyUsername}
                    onChange={(e) => setVerifyUsername(e.target.value)}
                    placeholder="cth: dimas.pemuda"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm font-mono-code focus:outline-none focus:border-[#16202C] dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0] mb-1">
                    Outlet bertugas terdaftar
                  </label>
                  <select
                    value={verifyOutlet}
                    onChange={(e) =>
                      setVerifyOutlet(e.target.value as OutletId | 'all')
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm focus:outline-none focus:border-[#16202C] dark:focus:border-white"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                    <option value="all">Semua Outlet (Admin Pusat)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0] mb-1">
                      Kata sandi baru
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 karakter"
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm focus:outline-none focus:border-[#16202C] dark:focus:border-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0] mb-1">
                      Ulangi kata sandi
                    </label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Ketik ulang"
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#0E1319] border border-[#DED9CF] dark:border-white/15 text-sm focus:outline-none focus:border-[#16202C] dark:focus:border-white"
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
                  {isSubmitting ? 'Menyimpan…' : 'Simpan Kata Sandi Baru'}
                </button>
              </form>
            )}

            <div className="pt-3 border-t border-[#EFECE5] dark:border-white/10 space-y-2">
              <p className="text-[11px] leading-relaxed text-[#646D78] dark:text-[#94A3B8]">
                Jika email atau nomor HP belum terdaftar pada akun staf Anda, minta Admin Pusat menambahkannya di tab Akun Kasir atau hubungi via WhatsApp:
              </p>
              <a
                href={staffAdminWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#16202C] dark:text-[#F4F1EA] hover:underline"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Minta Bantuan Reset ke Admin Pusat</span>
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

