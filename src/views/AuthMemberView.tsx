import React, { useRef, useState } from 'react';
import { ArrowLeft, Calendar, Moon, Sun } from 'lucide-react';
import { Member } from '../types';

interface AuthMemberViewProps {
  initialMode?: 'masuk' | 'daftar';
  darkMode: boolean;
  onToggleDark: () => void;
  onBackLanding: () => void;
  onLoginMember: (identifier: string, pin: string) => boolean;
  onRegisterMember: (payload: {
    name: string;
    contact: string;
    pin: string;
    birthday?: string;
  }) => Member;
}

export const AuthMemberView: React.FC<AuthMemberViewProps> = ({
  initialMode = 'masuk',
  darkMode,
  onToggleDark,
  onBackLanding,
  onLoginMember,
  onRegisterMember,
}) => {
  const [mode, setMode] = useState<'masuk' | 'daftar'>(initialMode);
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [error, setError] = useState('');
  const birthdayInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || pin.trim().length !== 6) {
      setError('Masukkan nomor WhatsApp/email dan PIN 6 digit.');
      return;
    }
    const ok = onLoginMember(identifier.trim(), pin.trim());
    if (!ok) {
      setError('Akun tidak ditemukan atau PIN tidak cocok. Periksa kembali nomor/email dan PIN Anda.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
    onRegisterMember({
      name: name.trim(),
      contact: identifier.trim(),
      pin: pin.trim(),
      birthday: formatBirthdayIndonesian(birthday),
    });
  };

  const isMasukReady = identifier.trim().length > 3 && pin.trim().length === 6;
  const isDaftarReady =
    name.trim().length > 1 &&
    identifier.trim().length > 3 &&
    /^\d{6}$/.test(pin.trim());

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
              {mode === 'masuk' ? 'Masuk ke kartu stempelmu.' : 'Jadi warga RTRW.'}
            </h1>
            <p className="text-sm leading-relaxed text-[#55606E] dark:text-[#A3B1C2]">
              Satu akun untuk RTRW Pemuda dan RTRW AWANNCOSTA. Gunakan nomor
              WhatsApp atau email, lalu PIN 6 digit yang kamu buat sendiri.
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
                  }}
                  className={`py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    mode === 'masuk'
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

              {mode === 'masuk' ? (
                <form onSubmit={handleLogin} className="mt-6 space-y-4">
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
                  </div>

                  {error && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    className={`w-full py-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isMasukReady
                        ? 'bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] hover:opacity-90'
                        : 'bg-[#8E959E] text-white hover:bg-[#16202C]'
                    }`}
                  >
                    Masuk
                  </button>
                </form>
              ) : (
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
                    className={`w-full py-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isDaftarReady
                        ? 'bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] hover:opacity-90'
                        : 'bg-[#8E959E] text-white hover:bg-[#16202C]'
                    }`}
                  >
                    Buat akun
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
