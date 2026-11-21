import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { StampHistoryEntry } from '../types';

interface StampCardProps {
  cardNumber?: string;
  holderName: string;
  serialCode: string;
  stamps: number;
  stampDates?: StampHistoryEntry[];
  interactive?: boolean;
  compact?: boolean;
  animatingSlot?: number | null;
  animationNonce?: number;
  justStampedLabel?: string | null;
}

function CoffeeCupIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Steam lines */}
      <path
        d="M8.5 5.5C8.5 4.5 9.2 4 9.2 3.2M11.5 5.5C11.5 4.5 12.2 4 12.2 3.2M14.5 5.5C14.5 4.5 15.2 4 15.2 3.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Cup body */}
      <path
        d="M6.5 8.5H16.5V13.5C16.5 16.2614 14.2614 18.5 11.5 18.5C8.73858 18.5 6.5 16.2614 6.5 13.5V8.5Z"
        fill="currentColor"
      />
      {/* Handle */}
      <path
        d="M16.5 9.8H18C19.1046 9.8 20 10.6954 20 11.8C20 12.9046 19.1046 13.8 18 13.8H16.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const StampCard: React.FC<StampCardProps> = ({
  cardNumber = '01',
  holderName,
  serialCode,
  stamps,
  stampDates = [],
  interactive = true,
  compact = false,
  animatingSlot = null,
  animationNonce = 0,
  justStampedLabel = null,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [activeAnimSlot, setActiveAnimSlot] = useState<number | null>(null);
  const [animCycle, setAnimCycle] = useState(0);
  const prevStampsRef = useRef(stamps);

  // Automatically animate whenever stamps increase (or wrap from 10 to 1)
  useEffect(() => {
    const prev = prevStampsRef.current;
    if (stamps > prev || (prev === 10 && stamps === 1)) {
      setActiveAnimSlot(stamps);
      setAnimCycle((c) => c + 1);
      const timer = setTimeout(() => setActiveAnimSlot(null), 1500);
      prevStampsRef.current = stamps;
      return () => clearTimeout(timer);
    }
    prevStampsRef.current = stamps;
  }, [stamps]);

  // Allow explicit replay / external trigger via animatingSlot + animationNonce
  useEffect(() => {
    if (animatingSlot && animationNonce > 0) {
      setActiveAnimSlot(animatingSlot);
      setAnimCycle((c) => c + 1);
      const timer = setTimeout(() => setActiveAnimSlot(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [animatingSlot, animationNonce]);

  const milestoneLabel = (slot: number) => {
    if (slot === 3) return '10%';
    if (slot === 6) return '15%';
    if (slot === 10) return 'GRATIS';
    return null;
  };

  const getSlotDetails = (slot: number) => {
    const history = stampDates.find((entry) => entry.slot === slot);
    const milestone =
      slot === 3
        ? 'Hadiah Stempel ke-3: Voucher Diskon 10%'
        : slot === 6
          ? 'Hadiah Stempel ke-6: Voucher Diskon 15%'
          : slot === 10
            ? 'Hadiah Stempel ke-10: Gratis 1 Minuman'
            : null;

    if (history) {
      return `Stempel #${slot} · ${history.date} · RTRW ${history.outlet === 'pemuda' ? 'Pemuda' : 'AWANNCOSTA'} (${history.item})`;
    }
    if (slot <= stamps) {
      return milestone
        ? `Stempel #${slot} tercapai · ${milestone}`
        : `Stempel #${slot} sudah terkumpul`;
    }
    return milestone
      ? `Slot #${slot} · ${milestone}`
      : `Slot #${slot} · ${slot - stamps} transaksi lagi`;
  };

  return (
    <div className="w-full">
      <motion.div
        key={`card-pulse-${animCycle}`}
        animate={
          activeAnimSlot !== null
            ? {
                scale: [1, 0.985, 1.006, 1],
              }
            : { scale: 1 }
        }
        transition={{ duration: 0.5, times: [0, 0.35, 0.65, 1], ease: 'easeOut' }}
        className={`brushed-metal-card relative overflow-hidden rounded-2xl border border-white/60 dark:border-white/10 ${
          compact ? 'p-5' : 'p-6 sm:p-7'
        }`}
      >
        {/* Specular brushed-metal sweep when stamped */}
        <AnimatePresence>
          {activeAnimSlot !== null && (
            <motion.div
              key={`sheen-${animCycle}`}
              initial={{ x: '-120%', opacity: 0 }}
              animate={{ x: '130%', opacity: [0, 0.65, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.85, delay: 0.15, ease: 'easeInOut' }}
              className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 dark:via-white/15 to-transparent"
            />
          )}
        </AnimatePresence>

        {/* Optional brief status chip on top-center during stamp impact */}
        <AnimatePresence>
          {activeAnimSlot !== null && justStampedLabel && (
            <motion.div
              key={`badge-${animCycle}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] text-[10px] font-semibold tracking-wide whitespace-nowrap shadow-md"
            >
              {justStampedLabel}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Row: Brand & Card No */}
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="font-serif-display text-2xl sm:text-[26px] font-bold tracking-tight text-[#16202C] dark:text-[#F4F1EA] leading-none">
              RTRW
            </div>
            <div className="mt-1.5 text-[9px] sm:text-[10px] font-semibold tracking-[0.24em] text-[#4B5563] dark:text-[#A3B1C2] uppercase">
              KARTU STEMPEL WARGA
            </div>
          </div>

          <div className="text-right">
            <div className="text-[9px] font-semibold tracking-[0.22em] text-[#55606E] dark:text-[#94A3B8] uppercase">
              KARTU NO.
            </div>
            <div className="font-mono-code text-sm font-semibold text-[#16202C] dark:text-[#F4F1EA] tabular-nums mt-0.5">
              {cardNumber}
            </div>
          </div>
        </div>

        {/* 10 Stamp Grid (2 x 5) */}
        <div className="relative z-10 mt-6 mb-5 grid grid-cols-5 gap-y-5 gap-x-2.5 sm:gap-x-4 place-items-center">
          {Array.from({ length: 10 }, (_, idx) => {
            const slot = idx + 1;
            const isFilled = slot <= stamps;
            const mLabel = milestoneLabel(slot);
            const isSelected = selectedSlot === slot;
            const isJustStamped = activeAnimSlot === slot;
            const isMilestoneSlot = slot === 3 || slot === 6 || slot === 10;

            return (
              <div key={slot} className="relative flex flex-col items-center">
                {/* Shockwave Ripple Ring on Stamp Impact */}
                {isJustStamped && (
                  <motion.span
                    key={`ring-${animCycle}-${slot}`}
                    initial={{ scale: 0.65, opacity: 0.85 }}
                    animate={{ scale: 1.85, opacity: 0 }}
                    transition={{ duration: 0.72, delay: 0.2, ease: 'easeOut' }}
                    className={`pointer-events-none absolute top-0 rounded-full border-2 ${
                      compact ? 'w-10 h-10' : 'w-11 h-11 sm:w-12 sm:h-12'
                    } ${
                      isMilestoneSlot
                        ? 'border-amber-500 dark:border-amber-300'
                        : 'border-[#16202C] dark:border-[#F4F1EA]'
                    }`}
                  />
                )}

                {/* Physical Stamp Seal Descending & Lifting Off */}
                {isJustStamped && (
                  <motion.div
                    key={`seal-${animCycle}-${slot}`}
                    initial={{ y: -32, scale: 1.35, rotate: -14, opacity: 0 }}
                    animate={{
                      y: [-32, 0, -3, -30],
                      scale: [1.35, 0.96, 1.04, 0.85],
                      rotate: [-14, 0, 0, 10],
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                      duration: 0.75,
                      times: [0, 0.3, 0.55, 1],
                      ease: 'easeOut',
                    }}
                    className="pointer-events-none absolute -top-2 z-20 flex flex-col items-center"
                  >
                    <div className="w-3.5 h-3 rounded-t-md bg-[#394452] dark:bg-[#CBD5E1] shadow-xs" />
                    <div className="w-9 h-2.5 rounded-full bg-[#16202C] dark:bg-[#F4F1EA] border border-white/40 shadow-md" />
                  </motion.div>
                )}

                {/* Floating +1 Label */}
                {isJustStamped && (
                  <motion.span
                    key={`plus1-${animCycle}-${slot}`}
                    initial={{ y: 2, opacity: 0, scale: 0.8 }}
                    animate={{ y: -22, opacity: [0, 1, 1, 0], scale: [0.8, 1.05, 1] }}
                    transition={{ duration: 1.05, delay: 0.24, ease: 'easeOut' }}
                    className={`pointer-events-none absolute -top-1 z-30 font-mono-code text-[11px] font-bold px-1.5 py-0.5 rounded-full shadow-xs ${
                      isMilestoneSlot
                        ? 'bg-amber-500 text-white'
                        : 'bg-[#16202C] text-white dark:bg-[#F4F1EA] dark:text-[#16202C]'
                    }`}
                  >
                    +1
                  </motion.span>
                )}

                <button
                  type="button"
                  onClick={() =>
                    interactive && setSelectedSlot(isSelected ? null : slot)
                  }
                  aria-label={`Stempel ${slot}${mLabel ? ` (${mLabel})` : ''}${isFilled ? ' terisi' : ' kosong'}`}
                  className={`relative flex items-center justify-center rounded-full transition-all duration-200 ${
                    compact ? 'w-10 h-10' : 'w-11 h-11 sm:w-12 sm:h-12'
                  } ${
                    isFilled
                      ? 'bg-[#16202C] dark:bg-[#F4F1EA] text-white dark:text-[#16202C] shadow-md shadow-[#16202C]/25'
                      : 'bg-[#BDC5D0]/55 dark:bg-[#141A23]/70 stamp-slot-recessed text-[#6E7885] dark:text-[#7E8B9B]'
                  } ${
                    interactive
                      ? 'hover:scale-105 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16202C]'
                      : 'cursor-default'
                  } ${
                    isSelected
                      ? 'ring-2 ring-[#16202C] dark:ring-white ring-offset-2 ring-offset-[#D7DCE3] dark:ring-offset-[#26303D]'
                      : ''
                  } ${
                    isJustStamped && isMilestoneSlot
                      ? 'ring-2 ring-amber-400 dark:ring-amber-300'
                      : ''
                  }`}
                >
                  {isFilled ? (
                    isJustStamped ? (
                      <motion.div
                        key={`cup-${animCycle}-${slot}`}
                        initial={{ scale: 0.2, opacity: 0, rotate: -20 }}
                        animate={{ scale: [0.2, 1.24, 1], opacity: 1, rotate: 0 }}
                        transition={{
                          duration: 0.45,
                          delay: 0.18,
                          ease: 'backOut',
                        }}
                      >
                        <CoffeeCupIcon
                          className={compact ? 'w-5 h-5' : 'w-5 h-5 sm:w-6 sm:h-6'}
                        />
                      </motion.div>
                    ) : (
                      <CoffeeCupIcon
                        className={compact ? 'w-5 h-5' : 'w-5 h-5 sm:w-6 sm:h-6'}
                      />
                    )
                  ) : (
                    <span className="text-[11px] font-medium tabular-nums">
                      {slot}
                    </span>
                  )}
                </button>

                <span
                  className={`mt-1.5 text-[9px] font-semibold tracking-[0.06em] h-3 leading-none ${
                    mLabel
                      ? 'text-[#394452] dark:text-[#CBD5E1]'
                      : 'text-transparent select-none'
                  }`}
                >
                  {mLabel || '·'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bottom Row: Holder Name & Serial Code */}
        <div className="relative z-10 pt-2 flex items-center justify-between gap-3">
          <div className="text-[11px] sm:text-xs font-semibold tracking-[0.16em] text-[#16202C] dark:text-[#F4F1EA] uppercase truncate">
            {holderName}
          </div>
          <div className="font-mono-code text-[10px] sm:text-[11px] tracking-[0.06em] text-[#434D59] dark:text-[#A3B1C2] shrink-0">
            {serialCode}
          </div>
        </div>
      </motion.div>

      {/* Interactive stamp detail bar */}
      {interactive && selectedSlot !== null && (
        <div className="mt-2.5 flex items-center justify-between gap-3 rounded-xl bg-white/90 dark:bg-[#161E29] border border-[#E6E2DA] dark:border-white/10 px-3.5 py-2 text-xs text-[#394452] dark:text-[#CBD5E1]">
          <span className="truncate">{getSlotDetails(selectedSlot)}</span>
          <button
            type="button"
            onClick={() => setSelectedSlot(null)}
            className="text-[11px] font-medium text-[#646D78] hover:text-[#16202C] dark:hover:text-white shrink-0 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}
    </div>
  );
};
