import React, { useState } from 'react';
import { Monitor, Smartphone, Info, RotateCcw, X } from 'lucide-react';
import { AppRoute, ViewportMode } from '../types';

interface PrototypeBarProps {
  viewport: ViewportMode;
  onViewportChange: (mode: ViewportMode) => void;
  route: AppRoute;
  onNavigate: (route: AppRoute) => void;
  onResetDemo: () => void;
}

const ROUTE_OPTIONS: { id: AppRoute; label: string }[] = [
  { id: 'landing', label: 'Beranda' },
  { id: 'auth-member', label: 'Masuk Warga' },
  { id: 'member-app', label: 'Kartu Member' },
  { id: 'auth-staff', label: 'Masuk Staf' },
  { id: 'cashier', label: 'Kasir POS' },
  { id: 'admin', label: 'Dasbor Admin' },
];

export const PrototypeBar: React.FC<PrototypeBarProps> = ({
  viewport,
  onViewportChange,
  route,
  onNavigate,
  onResetDemo,
}) => {
  const [showNotes, setShowNotes] = useState(false);

  return (
    <>
      <div className="sticky top-0 z-50 w-full bg-[#16202C] text-[#F4F1EA] border-b border-white/10 px-3 sm:px-5 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Device Mode Switcher */}
          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline text-[11px] font-medium tracking-[0.14em] uppercase text-white/60 whitespace-nowrap">
              Pratinjau
            </span>
            <div className="inline-flex items-center rounded-lg bg-white/10 p-0.5">
              <button
                type="button"
                onClick={() => onViewportChange('desktop')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewport === 'desktop'
                    ? 'bg-white text-[#16202C]'
                    : 'text-white/75 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Web / Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => onViewportChange('mobile')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewport === 'mobile'
                    ? 'bg-white text-[#16202C]'
                    : 'text-white/75 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile (390px)</span>
              </button>
            </div>
          </div>

          {/* Center: Quick Screen Jumper */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full">
            {ROUTE_OPTIONS.map((item) => {
              const active = route === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#FAF8F4] text-[#16202C]'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right: Prototype Notes & Reset */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onResetDemo}
              title="Reset data simulasi"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-white/75 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset Data</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Catatan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Prototype Notes Modal */}
      {showNotes && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowNotes(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#161E29] text-[#16202C] dark:text-[#F4F1EA] border border-[#E6E2DA] dark:border-white/10 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#646D78] dark:text-[#94A3B8]">
                  CATATAN PROTOTIPE
                </p>
                <h2 className="font-serif-display text-2xl font-medium mt-1">
                  RTRW — Kartu Stempel Digital
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowNotes(false)}
                className="p-1.5 rounded-lg text-[#646D78] hover:text-[#16202C] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-[#4A535E] dark:text-[#CBD5E1] leading-relaxed">
              <p>
                <strong className="text-[#16202C] dark:text-white">
                  1. Sinkronisasi Data Langsung:
                </strong>{' '}
                Semua layar berbagi state yang sama. Jika Anda mencatat transaksi di{' '}
                <em>Kasir POS</em> untuk Sekar Ayu (misalnya +1 stempel atau pakai voucher),
                perubahan langsung tampil di <em>Kartu Member</em> dan <em>Dasbor Admin</em>.
              </p>
              <p>
                <strong className="text-[#16202C] dark:text-white">
                  2. Bagian yang Dilengkapi dari Desain:
                </strong>{' '}
                Pada lampiran PDF, tab <em>Voucher</em>, <em>Riwayat</em>, <em>Peringkat</em>,
                dan <em>QR Saya</em> di aplikasi member serta 7 tab lanjutan di Dasbor Admin
                (<em>Klaim per outlet</em> s/d <em>Akun kasir</em>) belum tergambar rinci,
                sehingga telah dilengkapi mengikuti bahasa visual, tipografi, dan palet warna
                yang sama persis.
              </p>
              <p>
                <strong className="text-[#16202C] dark:text-white">
                  3. Mode Web & Mobile (390px):
                </strong>{' '}
                Gunakan tombol di bilah atas untuk menguji tata letak responsif penuh pada
                layar Desktop maupun bingkai ponsel 390px kapan saja.
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowNotes(false)}
                className="px-4 py-2 rounded-xl bg-[#16202C] text-white dark:bg-[#F4F1EA] dark:text-[#16202C] text-xs font-semibold cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
