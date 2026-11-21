import React, { useEffect, useState } from 'react';
import { ArrowUpRight, MapPin, Moon, Sun, Clock, Phone, X, Coffee, Download } from 'lucide-react';
import { StampCard } from '../components/StampCard';
import { LandingContent, OutletInfo, ProgramRules } from '../types';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface LandingViewProps {
  darkMode: boolean;
  onToggleDark: () => void;
  onGoAuthMember: (mode: 'masuk' | 'daftar') => void;
  onGoStaffAuth: () => void;
  rules: ProgramRules;
  landingContent: LandingContent;
  outlets: OutletInfo[];
}

export const LandingView: React.FC<LandingViewProps> = ({
  darkMode,
  onToggleDark,
  onGoAuthMember,
  onGoStaffAuth,
  rules,
  landingContent,
  outlets,
}) => {
  const [selectedOutlet, setSelectedOutlet] = useState<OutletInfo | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallHelp(false);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleTriggerPwaInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallHelp(false);
    }
  };

  return (
    <div className="min-h-full bg-[#FAF8F4] dark:bg-[#0E1319] text-[#16202C] dark:text-[#F4F1EA]">
      {/* Top Bar */}
      <header className="w-full border-b border-[#E6E2DA]/80 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-5 @3xl:px-8 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-baseline gap-2.5 text-left cursor-pointer whitespace-nowrap shrink-0"
          >
            <span className="font-serif-display text-xl @3xl:text-2xl font-bold tracking-tight">
              RTRW
            </span>
            <span className="text-[10px] font-medium tracking-[0.22em] text-[#5B6470] dark:text-[#94A3B8] uppercase">
              KARTU STEMPEL
            </span>
          </button>

          <div className="flex items-center gap-3 @3xl:gap-4 shrink-0">
            <button
              type="button"
              onClick={onGoStaffAuth}
              className="text-[11px] font-medium tracking-[0.16em] uppercase text-[#5B6470] dark:text-[#CBD5E1] hover:text-[#16202C] dark:hover:text-white transition-colors whitespace-nowrap px-2 py-1.5 cursor-pointer"
            >
              STAF &amp; KASIR
            </button>
            <button
              type="button"
              onClick={onToggleDark}
              aria-label={darkMode ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
              className="w-9 h-9 rounded-full border border-[#E2DDD4] dark:border-white/15 bg-white dark:bg-[#161E29] flex items-center justify-center text-[#16202C] dark:text-[#F4F1EA] hover:bg-[#F3EFE6] dark:hover:bg-[#1F2937] transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-5 @3xl:px-8">
        {/* Hero Split */}
        <section className="py-10 @3xl:py-16 grid grid-cols-1 @5xl:grid-cols-12 gap-10 @5xl:gap-12 items-center">
          <div className="@5xl:col-span-6 space-y-6">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#646D78] dark:text-[#94A3B8]">
              {landingContent.heroKicker}
            </p>
            <h1 className="font-serif-display text-[42px] @3xl:text-[56px] leading-[1.06] tracking-tight font-normal text-[#16202C] dark:text-[#F4F1EA] [text-wrap:balance]">
              {landingContent.heroLine1}{' '}
              {landingContent.heroItalicWord && (
                <span className="italic block">{landingContent.heroItalicWord}</span>
              )}{' '}
              {landingContent.heroLine3}
            </h1>
            <p className="text-[15px] @3xl:text-base leading-relaxed text-[#55606E] dark:text-[#A3B1C2] max-w-md">
              {landingContent.heroSubtitle}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onGoAuthMember('daftar')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
              >
                <span>{landingContent.heroPrimaryCta}</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onGoAuthMember('masuk')}
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white dark:bg-[#161E29] border border-[#DED9CF] dark:border-white/15 text-[#16202C] dark:text-[#F4F1EA] text-sm font-medium hover:bg-[#F3EFE6] dark:hover:bg-[#1E293B] active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
              >
                {landingContent.heroSecondaryCta}
              </button>
            </div>
          </div>

          <div className="@5xl:col-span-6">
            <div className="rounded-3xl bg-[#EFECE5] dark:bg-[#161E29] border border-[#E6E2DA]/80 dark:border-white/10 p-5 @3xl:p-8">
              <StampCard
                cardNumber="01"
                holderName={landingContent.heroCardHolder}
                serialCode={landingContent.heroCardCode}
                stamps={4}
                interactive={true}
              />
              <p className="mt-5 text-center text-xs text-[#646D78] dark:text-[#94A3B8] tracking-wide">
                {landingContent.heroCardCaption ||
                  `Kumpulkan 10 stempel · ${rules.milestone3Label} · ${rules.milestone6Label} · ${rules.milestone10Label}`}
              </p>
            </div>
          </div>
        </section>

        {/* Aturan Program */}
        <section className="py-10 @3xl:py-16 border-t border-[#E6E2DA]/80 dark:border-white/10 grid grid-cols-1 @5xl:grid-cols-12 gap-8 @5xl:gap-12 items-start">
          <div className="@5xl:col-span-4 space-y-4">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#646D78] dark:text-[#94A3B8]">
              ATURAN PROGRAM
            </p>
            <h2 className="font-serif-display text-3xl @3xl:text-4xl leading-tight font-normal [text-wrap:balance]">
              {rules.landingSectionTitle}
            </h2>
            <p className="text-sm leading-relaxed text-[#55606E] dark:text-[#A3B1C2]">
              {rules.landingProgramIntro}
            </p>
          </div>

          <div className="@5xl:col-span-8">
            <div className="rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 grid grid-cols-1 @3xl:grid-cols-3 divide-y @3xl:divide-y-0 @3xl:divide-x divide-[#E6E2DA] dark:divide-white/10">
              <div className="p-6 space-y-3">
                <p className="text-xs font-medium text-[#646D78] dark:text-[#94A3B8] tabular-nums">
                  Stempel 03
                </p>
                <h3 className="font-serif-display text-2xl font-normal">
                  {rules.milestone3Label}
                </h3>
                <p className="text-xs leading-relaxed text-[#55606E] dark:text-[#A3B1C2]">
                  {rules.landingMilestone3Desc}
                </p>
              </div>
              <div className="p-6 space-y-3">
                <p className="text-xs font-medium text-[#646D78] dark:text-[#94A3B8] tabular-nums">
                  Stempel 06
                </p>
                <h3 className="font-serif-display text-2xl font-normal">
                  {rules.milestone6Label}
                </h3>
                <p className="text-xs leading-relaxed text-[#55606E] dark:text-[#A3B1C2]">
                  {rules.landingMilestone6Desc}
                </p>
              </div>
              <div className="p-6 space-y-3">
                <p className="text-xs font-medium text-[#646D78] dark:text-[#94A3B8] tabular-nums">
                  Stempel 10
                </p>
                <h3 className="font-serif-display text-2xl font-normal">
                  {rules.milestone10Label}
                </h3>
                <p className="text-xs leading-relaxed text-[#55606E] dark:text-[#A3B1C2]">
                  {rules.landingMilestone10Desc}
                </p>
                {rules.freeDrinkOptions.length > 0 && (
                  <p className="pt-1 text-[11px] text-[#646D78] dark:text-[#94A3B8] leading-relaxed">
                    Pilihan menu: {rules.freeDrinkOptions.join(' · ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Outlet Showcase */}
        <section className="py-10 @3xl:py-14 border-t border-[#E6E2DA]/80 dark:border-white/10">
          <div className="grid grid-cols-1 @3xl:grid-cols-12 gap-6 items-stretch">
            {outlets.map((outlet, index) => (
              <button
                key={outlet.id}
                type="button"
                onClick={() => setSelectedOutlet(outlet)}
                className={`group text-left rounded-2xl overflow-hidden bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 hover:border-[#16202C]/40 dark:hover:border-white/30 transition-all cursor-pointer flex flex-col ${
                  index === 0 ? '@3xl:col-span-7' : '@3xl:col-span-5'
                }`}
              >
                <div className="relative h-56 @3xl:h-64 w-full bg-[#EFECE5] dark:bg-[#1F2937] overflow-hidden">
                  {imgErrors[outlet.id] || !outlet.image ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#646D78] dark:text-[#94A3B8]">
                      <Coffee className="w-7 h-7 opacity-60" />
                      <span className="font-serif-display text-lg">{outlet.name}</span>
                    </div>
                  ) : (
                    <img
                      src={outlet.image}
                      alt={outlet.name}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setImgErrors((prev) => ({ ...prev, [outlet.id]: true }))
                      }
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  )}
                </div>
                <div className="p-5 @3xl:p-6 flex items-end justify-between gap-4 flex-1">
                  <div>
                    <h3 className="font-serif-display text-2xl font-normal text-[#16202C] dark:text-[#F4F1EA]">
                      {outlet.name}
                    </h3>
                    <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-[#646D78] dark:text-[#94A3B8]">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{outlet.area}</span>
                    </p>
                  </div>
                  <span className="font-mono-code text-xs text-[#8A929D] dark:text-[#64748B] tabular-nums">
                    {outlet.code}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E6E2DA]/80 dark:border-white/10 mt-6">
        <div className="max-w-6xl mx-auto px-5 @3xl:px-8 py-6 flex flex-col @3xl:flex-row items-start @3xl:items-center justify-between gap-3 text-xs text-[#646D78] dark:text-[#94A3B8]">
          <span>{landingContent.footerCopyright}</span>
          <button
            type="button"
            onClick={() => setShowInstallHelp(true)}
            className="hover:text-[#16202C] dark:hover:text-white transition-colors text-left cursor-pointer"
          >
            {landingContent.footerInstallHint}
          </button>
        </div>
      </footer>

      {/* Outlet Detail Modal */}
      {selectedOutlet && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end @3xl:items-center justify-center p-0 @3xl:p-4"
          onClick={() => setSelectedOutlet(null)}
        >
          <div
            className="w-full @3xl:max-w-md rounded-t-3xl @3xl:rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-44 bg-[#EFECE5] dark:bg-[#1F2937]">
              {imgErrors[selectedOutlet.id] || !selectedOutlet.image ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#646D78] dark:text-[#94A3B8]">
                  <Coffee className="w-6 h-6 opacity-60" />
                  <span className="font-serif-display text-base">
                    {selectedOutlet.name}
                  </span>
                </div>
              ) : (
                <img
                  src={selectedOutlet.image}
                  alt={selectedOutlet.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => setSelectedOutlet(null)}
                aria-label="Tutup"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-black/75 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="font-mono-code text-[11px] text-[#646D78] dark:text-[#94A3B8]">
                  OUTLET {selectedOutlet.code} · {selectedOutlet.area.toUpperCase()}
                </p>
                <h3 className="font-serif-display text-2xl mt-1">
                  {selectedOutlet.name}
                </h3>
              </div>

              <div className="space-y-2.5 text-sm text-[#4A535E] dark:text-[#CBD5E1]">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#646D78]" />
                  <span>{selectedOutlet.address}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 shrink-0 text-[#646D78]" />
                  <span>{selectedOutlet.hours}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 shrink-0 text-[#646D78]" />
                  <span className="tabular-nums">{selectedOutlet.phone}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Coffee className="w-4 h-4 mt-0.5 shrink-0 text-[#646D78]" />
                  <span>Menu andalan: {selectedOutlet.signatureMenu.join(' · ')}</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOutlet(null);
                    onGoAuthMember('daftar');
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-xs font-semibold cursor-pointer"
                >
                  Daftar Kartu Stempel
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOutlet(null)}
                  className="py-2.5 px-4 rounded-xl border border-[#E6E2DA] dark:border-white/15 text-xs font-medium cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Modal */}
      {showInstallHelp && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowInstallHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif-display text-xl">Pasang Aplikasi RTRW</h3>
              <button
                type="button"
                onClick={() => setShowInstallHelp(false)}
                className="p-1 text-[#646D78] hover:text-[#16202C] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-[#55606E] dark:text-[#A3B1C2]">
              Akses kartu stempelmu lebih cepat langsung dari layar utama ponsel:
            </p>
            <ol className="text-xs space-y-2 text-[#16202C] dark:text-[#F4F1EA] list-decimal pl-4">
              <li>Buka halaman ini di Safari (iOS) atau Chrome (Android).</li>
              <li>Ketuk ikon Bagikan atau menu titik tiga di pojok browser.</li>
              <li>Pilih <strong>“Tambahkan ke Layar Utama”</strong> / <em>Add to Home Screen</em>.</li>
            </ol>
            {deferredPrompt && (
              <button
                type="button"
                onClick={handleTriggerPwaInstall}
                className="w-full py-2.5 px-4 rounded-xl bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pasang Aplikasi Sekarang</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowInstallHelp(false)}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                deferredPrompt
                  ? 'border border-[#DED9CF] dark:border-white/15'
                  : 'bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C]'
              }`}
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
