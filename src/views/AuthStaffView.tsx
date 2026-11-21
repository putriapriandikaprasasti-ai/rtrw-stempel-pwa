import React, { useState } from 'react';
import { ArrowLeft, MapPin, Moon, Sun } from 'lucide-react';
import { OutletId, OutletInfo, StaffAccount, StaffMemberUiConfig } from '../types';

interface AuthStaffViewProps {
  staffAccounts: StaffAccount[];
  outlets: OutletInfo[];
  uiConfig: StaffMemberUiConfig;
  darkMode: boolean;
  onToggleDark: () => void;
  onBackLanding: () => void;
  onLoginStaff: (staff: StaffAccount, selectedOutlet: OutletId) => void;
}

export const AuthStaffView: React.FC<AuthStaffViewProps> = ({
  staffAccounts,
  outlets,
  uiConfig,
  darkMode,
  onToggleDark,
  onBackLanding,
  onLoginStaff,
}) => {
  const [selectedOutlet, setSelectedOutlet] = useState<OutletId>('pemuda');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
            {uiConfig.staffLoginTitle}
          </h1>
          <p className="text-sm text-[#55606E] dark:text-[#A3B1C2]">
            {uiConfig.staffLoginSubtitle}
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="mt-7 rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 shadow-sm p-6 space-y-5"
        >
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
            <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0] mb-1.5">
              Kata sandi
            </label>
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
      </main>
    </div>
  );
};
