import React, { useState } from 'react';
import { ArrowLeft, MapPin, Moon, Sun } from 'lucide-react';
import { OutletId, OutletInfo, StaffAccount } from '../types';

interface AuthStaffViewProps {
  staffAccounts: StaffAccount[];
  outlets: OutletInfo[];
  darkMode: boolean;
  onToggleDark: () => void;
  onBackLanding: () => void;
  onLoginStaff: (staff: StaffAccount, selectedOutlet: OutletId) => void;
}

export const AuthStaffView: React.FC<AuthStaffViewProps> = ({
  staffAccounts,
  outlets,
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
      setError('Masukkan username dan kata sandi, atau pilih Akun Demo di bawah.');
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
    onLoginStaff(found, selectedOutlet);
  };

  const quickDemoLogin = (
    staffId: string,
    outletOverride: OutletId
  ) => {
    const found = staffAccounts.find((s) => s.id === staffId);
    if (found) {
      setSelectedOutlet(outletOverride);
      onLoginStaff(found, outletOverride);
    }
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
              RUANG STAF
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
            Masuk staf
          </h1>
          <p className="text-sm text-[#55606E] dark:text-[#A3B1C2]">
            Kasir wajib memilih outlet tempat bertugas hari ini.
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="mt-7 rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 shadow-sm p-6 space-y-5"
        >
          <div>
            <label className="block text-xs font-medium text-[#16202C] dark:text-[#E2E8F0] mb-2">
              Outlet
            </label>
            <div className="grid grid-cols-2 gap-3">
              {outlets.map((outlet) => {
                const active = selectedOutlet === outlet.id;
                return (
                  <button
                    key={outlet.id}
                    type="button"
                    onClick={() => setSelectedOutlet(outlet.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'border-[#16202C] dark:border-[#F4F1EA] bg-[#FAF8F4] dark:bg-[#1E293B] ring-1 ring-[#16202C] dark:ring-[#F4F1EA]'
                        : 'border-[#E6E2DA] dark:border-white/10 hover:border-[#B8B2A6]'
                    }`}
                  >
                    <p className="font-serif-display text-base font-medium">
                      {outlet.shortName}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#646D78] dark:text-[#94A3B8]">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{outlet.area}</span>
                    </p>
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
            Masuk
          </button>
        </form>

        {/* Demo Accounts Box */}
        <div className="mt-5 rounded-2xl border border-dashed border-[#D8D3C8] dark:border-white/15 p-4">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#646D78] dark:text-[#94A3B8] mb-3">
            AKUN DEMO
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => quickDemoLogin('stf-dimas', 'pemuda')}
              className="px-3 py-1.5 rounded-full bg-white dark:bg-[#161E29] border border-[#E2DDD4] dark:border-white/15 text-xs font-medium hover:bg-[#16202C] hover:text-white dark:hover:bg-white dark:hover:text-[#16202C] transition-colors cursor-pointer"
            >
              Kasir Pemuda
            </button>
            <button
              type="button"
              onClick={() => quickDemoLogin('stf-sinta', 'awanncosta')}
              className="px-3 py-1.5 rounded-full bg-white dark:bg-[#161E29] border border-[#E2DDD4] dark:border-white/15 text-xs font-medium hover:bg-[#16202C] hover:text-white dark:hover:bg-white dark:hover:text-[#16202C] transition-colors cursor-pointer"
            >
              Kasir AWANNCOSTA
            </button>
            <button
              type="button"
              onClick={() => quickDemoLogin('stf-admin-pemuda', 'pemuda')}
              className="px-3 py-1.5 rounded-full bg-white dark:bg-[#161E29] border border-[#E2DDD4] dark:border-white/15 text-xs font-medium hover:bg-[#16202C] hover:text-white dark:hover:bg-white dark:hover:text-[#16202C] transition-colors cursor-pointer"
            >
              Admin Pemuda
            </button>
            <button
              type="button"
              onClick={() => quickDemoLogin('stf-admin-pusat', 'pemuda')}
              className="px-3 py-1.5 rounded-full bg-white dark:bg-[#161E29] border border-[#E2DDD4] dark:border-white/15 text-xs font-medium hover:bg-[#16202C] hover:text-white dark:hover:bg-white dark:hover:text-[#16202C] transition-colors cursor-pointer"
            >
              Admin Pusat
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
