import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  INITIAL_LANDING_CONTENT,
  INITIAL_MEMBERS,
  INITIAL_MENU_ITEMS,
  INITIAL_RULES,
  INITIAL_STAFF,
  INITIAL_TRANSACTIONS,
  INITIAL_UI_CONFIG,
  INITIAL_WA_TEMPLATES,
  OUTLETS,
} from './data/mockData';
import {
  addDays,
  addYears,
  formatIsoDate,
  formatShortDateId,
  formatTimeHm,
} from './lib/dateUtils';
import { supabase } from './lib/supabase';
import {
  findMemberForResetInSupabase,
  findStaffForResetInSupabase,
  insertMemberAndCardInSupabase,
  issueVoucherInSupabase,
  loadInitialDataFromSupabase,
  normalizePhoneVariants,
  recordTransactionInSupabase,
  syncLandingContentInSupabase,
  syncMemberExpiryInSupabase,
  syncMemberLiveStateFromSupabase,
  syncMenuItemsInSupabase,
  syncOutletsInSupabase,
  syncRulesInSupabase,
  syncUiConfigInSupabase,
  syncWaTemplateInSupabase,
  updateMemberPinInSupabase,
  updateStaffPasswordInSupabase,
  upsertStaffInSupabase,
} from './lib/supabaseDb';
import {
  AppRoute,
  LandingContent,
  Member,
  MenuItem,
  OutletId,
  OutletInfo,
  ProgramRules,
  StaffAccount,
  StaffMemberUiConfig,
  StampHistoryEntry,
  Transaction,
  Voucher,
  WAMessageTemplate,
} from './types';
import { AdminDashboardView } from './views/AdminDashboardView';
import { AuthMemberView, MemberResetCandidate } from './views/AuthMemberView';
import { AuthStaffView, StaffResetCandidate } from './views/AuthStaffView';
import { CashierView } from './views/CashierView';
import { LandingView } from './views/LandingView';
import { MemberAppView, StampEventPayload } from './views/MemberAppView';

function maskContactValue(value: string, type: 'phone' | 'email'): string {
  if (type === 'email') {
    const [local, domain] = value.split('@');
    if (!domain) return `${value.slice(0, 2)}•••`;
    const visible = local.slice(0, 2);
    return `${visible}••••@${domain}`;
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 5) return `${digits.slice(0, 2)}•••`;
  return `${digits.slice(0, 4)}••••${digits.slice(-3)}`;
}

const MEMBER_SESSION_ID_KEY = 'rtrw_active_member_id';
const MEMBER_SESSION_SNAPSHOT_KEY = 'rtrw_active_member_snapshot';

function getSavedMemberId(): string | null {
  try {
    const id = window.localStorage.getItem(MEMBER_SESSION_ID_KEY);
    return id && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}

function getSavedMemberSnapshot(): Member | null {
  try {
    const raw = window.localStorage.getItem(MEMBER_SESSION_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Member;
    if (parsed && typeof parsed.id === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveMemberSession(member: Member) {
  try {
    window.localStorage.setItem(MEMBER_SESSION_ID_KEY, member.id);
    window.localStorage.setItem(
      MEMBER_SESSION_SNAPSHOT_KEY,
      JSON.stringify(member)
    );
  } catch {
    // Abaikan jika storage browser dibatasi
  }
}

function clearMemberSession() {
  try {
    window.localStorage.removeItem(MEMBER_SESSION_ID_KEY);
    window.localStorage.removeItem(MEMBER_SESSION_SNAPSHOT_KEY);
  } catch {
    // Abaikan jika storage browser dibatasi
  }
}

interface MemberProgressTracker {
  memberId: string;
  stamps: number;
  cardNumber: string;
  voucherIds: string[];
}

export default function App() {
  const initialSessionRef = useRef<{
    id: string | null;
    snapshot: Member | null;
  } | null>(null);
  if (!initialSessionRef.current) {
    initialSessionRef.current = {
      id: getSavedMemberId(),
      snapshot: getSavedMemberSnapshot(),
    };
  }
  const initialSavedMemberId = initialSessionRef.current.id;
  const initialSavedSnapshot = initialSessionRef.current.snapshot;

  const [route, setRoute] = useState<AppRoute>(() =>
    initialSavedMemberId ? 'member-app' : 'landing'
  );
  const [authMemberMode, setAuthMemberMode] = useState<'masuk' | 'daftar'>(
    'masuk'
  );
  const [darkMode, setDarkMode] = useState(false);

  // State aplikasi yang disinkronkan dengan Supabase
  const [members, setMembers] = useState<Member[]>(() => {
    if (!initialSavedSnapshot) return INITIAL_MEMBERS;
    const exists = INITIAL_MEMBERS.some(
      (m) => m.id === initialSavedSnapshot.id
    );
    if (exists) {
      return INITIAL_MEMBERS.map((m) =>
        m.id === initialSavedSnapshot.id ? initialSavedSnapshot : m
      );
    }
    return [initialSavedSnapshot, ...INITIAL_MEMBERS];
  });
  const [activeStampCardIds, setActiveStampCardIds] = useState<
    Record<string, string>
  >({});
  const [transactions, setTransactions] =
    useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [staffAccounts, setStaffAccounts] =
    useState<StaffAccount[]>(INITIAL_STAFF);
  const [rules, setRules] = useState<ProgramRules>(INITIAL_RULES);
  const [landingContent, setLandingContent] = useState<LandingContent>(
    INITIAL_LANDING_CONTENT
  );
  const [uiConfig, setUiConfig] =
    useState<StaffMemberUiConfig>(INITIAL_UI_CONFIG);
  const [outlets, setOutlets] = useState<OutletInfo[]>(OUTLETS);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [waTemplates, setWaTemplates] =
    useState<WAMessageTemplate[]>(INITIAL_WA_TEMPLATES);

  // Sesi aktif pengguna
  const [activeMemberId, setActiveMemberId] = useState<string>(
    () => initialSavedMemberId || 'mem-sekar'
  );
  const [isRestoringMemberSession, setIsRestoringMemberSession] =
    useState<boolean>(() =>
      Boolean(initialSavedMemberId && !initialSavedSnapshot && supabase)
    );
  const [activeStaff, setActiveStaff] = useState<StaffAccount>(
    INITIAL_STAFF[0]
  );
  const [activeCashierOutlet, setActiveCashierOutlet] =
    useState<OutletId>('pemuda');
  const [cashierPreselectMemberId, setCashierPreselectMemberId] = useState<
    string | null
  >(null);
  const [lastStampEvent, setLastStampEvent] =
    useState<StampEventPayload | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  const activeMemberIdRef = useRef(activeMemberId);
  activeMemberIdRef.current = activeMemberId;
  const routeRef = useRef(route);
  routeRef.current = route;
  const lastKnownMemberProgressRef = useRef<MemberProgressTracker | null>(
    initialSavedSnapshot
      ? {
          memberId: initialSavedSnapshot.id,
          stamps: initialSavedSnapshot.stamps,
          cardNumber: initialSavedSnapshot.cardNumber,
          voucherIds: initialSavedSnapshot.vouchers.map((v) => v.id),
        }
      : null
  );
  const memberSyncInFlightRef = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Ambil data awal dari tabel Supabase saat halaman dimuat
  useEffect(() => {
    let cancelled = false;

    const initSupabase = async () => {
      try {
        const loaded = await loadInitialDataFromSupabase();
        if (!loaded || cancelled) return;

        if (loaded.outlets) setOutlets(loaded.outlets);
        if (loaded.members) {
          setMembers(loaded.members);
          const persistedMemberId = getSavedMemberId();

          if (persistedMemberId) {
            const matchedPersisted = loaded.members.find(
              (m) => m.id === persistedMemberId
            );
            if (matchedPersisted) {
              lastKnownMemberProgressRef.current = {
                memberId: matchedPersisted.id,
                stamps: matchedPersisted.stamps,
                cardNumber: matchedPersisted.cardNumber,
                voucherIds: matchedPersisted.vouchers.map((v) => v.id),
              };
              saveMemberSession(matchedPersisted);
              setActiveMemberId(matchedPersisted.id);
            } else if (loaded.members.length > 0) {
              clearMemberSession();
              setActiveMemberId(loaded.members[0].id);
              if (routeRef.current === 'member-app') {
                setRoute('landing');
              }
            }
          } else if (
            loaded.members.length > 0 &&
            !loaded.members.some((m) => m.id === activeMemberIdRef.current)
          ) {
            setActiveMemberId(loaded.members[0].id);
          }
        }
        setActiveStampCardIds(loaded.activeStampCardIds);
        if (loaded.transactions) setTransactions(loaded.transactions);
        if (loaded.staffAccounts) setStaffAccounts(loaded.staffAccounts);
        if (loaded.menuItems) setMenuItems(loaded.menuItems);
        if (loaded.rules) setRules(loaded.rules);
        if (loaded.landingContent) setLandingContent(loaded.landingContent);
        if (loaded.uiConfig) setUiConfig(loaded.uiConfig);
        if (loaded.waTemplates) setWaTemplates(loaded.waTemplates);
      } catch (err) {
        console.error('[Supabase] Gagal memuat data awal aplikasi:', err);
      } finally {
        if (!cancelled) {
          setIsRestoringMemberSession(false);
        }
      }
    };

    void initSupabase();

    return () => {
      cancelled = true;
    };
  }, []);

  // Sinkronisasi otomatis kartu stempel halaman Anggota (Supabase Realtime + fallback polling & fokus tab)
  useEffect(() => {
    const sb = supabase;
    if (route !== 'member-app' || !activeMemberId || !sb) return;

    let cancelled = false;
    let debounceTimer: number | null = null;

    const runMemberLiveSync = async () => {
      if (cancelled || memberSyncInFlightRef.current) return;
      memberSyncInFlightRef.current = true;
      try {
        const snapshot = await syncMemberLiveStateFromSupabase(activeMemberId);
        if (!snapshot || cancelled || activeMemberIdRef.current !== activeMemberId) {
          return;
        }

        const nextMember = snapshot.member;
        const prevTracker = lastKnownMemberProgressRef.current;

        if (prevTracker && prevTracker.memberId === nextMember.id) {
          const cardRolledOver =
            prevTracker.cardNumber !== nextMember.cardNumber &&
            nextMember.stamps >= 1;
          const wrappedFromFull =
            prevTracker.stamps === 10 &&
            nextMember.stamps >= 1 &&
            nextMember.stamps < prevTracker.stamps;
          const stampIncreased =
            nextMember.stamps > prevTracker.stamps ||
            cardRolledOver ||
            wrappedFromFull;

          lastKnownMemberProgressRef.current = {
            memberId: nextMember.id,
            stamps: nextMember.stamps,
            cardNumber: nextMember.cardNumber,
            voucherIds: nextMember.vouchers.map((v) => v.id),
          };

          if (stampIncreased) {
            const newActiveVoucher = nextMember.vouchers.find(
              (v) =>
                v.status === 'active' &&
                !prevTracker.voucherIds.includes(v.id)
            );
            setLastStampEvent({
              memberId: nextMember.id,
              slot: nextMember.stamps,
              outlet: nextMember.lastUsedOutlet,
              newlyIssuedVoucher: newActiveVoucher?.title,
              timestamp: Date.now(),
            });
            showToast(
              `+1 Stempel masuk! Kartu kini ${nextMember.stamps}/10`
            );
          }
        } else {
          lastKnownMemberProgressRef.current = {
            memberId: nextMember.id,
            stamps: nextMember.stamps,
            cardNumber: nextMember.cardNumber,
            voucherIds: nextMember.vouchers.map((v) => v.id),
          };
        }

        saveMemberSession(nextMember);

        setMembers((prev) => {
          const summaryMap = new Map(
            snapshot.allMembersSummary.map((s) => [s.id, s])
          );
          const hasTarget = prev.some((m) => m.id === nextMember.id);
          const updated = prev.map((m) => {
            if (m.id === nextMember.id) return nextMember;
            const summary = summaryMap.get(m.id);
            return summary ? { ...m, ...summary } : m;
          });
          return hasTarget ? updated : [nextMember, ...updated];
        });

        if (snapshot.activeCardId) {
          setActiveStampCardIds((prev) => ({
            ...prev,
            [nextMember.id]: snapshot.activeCardId!,
          }));
        }

        setTransactions((prev) => {
          const others = prev.filter((t) => t.memberId !== nextMember.id);
          return [...snapshot.memberTransactions, ...others];
        });
      } finally {
        memberSyncInFlightRef.current = false;
      }
    };

    const scheduleSync = (delayMs = 150) => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        void runMemberLiveSync();
      }, delayMs);
    };

    const channel = sb
      .channel(`member-stamp-cards-${activeMemberId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stamp_cards',
          filter: `member_id=eq.${activeMemberId}`,
        },
        () => {
          scheduleSync(150);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vouchers',
          filter: `member_id=eq.${activeMemberId}`,
        },
        () => {
          scheduleSync(200);
        }
      )
      .subscribe();

    // Fallback refresh otomatis tiap 4 detik saat tab aktif
    const pollIntervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void runMemberLiveSync();
      }
    }, 4000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void runMemberLiveSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('online', handleVisibilityOrFocus);

    return () => {
      cancelled = true;
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      window.clearInterval(pollIntervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('online', handleVisibilityOrFocus);
      void sb.removeChannel(channel);
    };
  }, [route, activeMemberId, showToast]);

  // Sinkronisasi otomatis data transaksi, member, & voucher untuk Dasbor Admin
  useEffect(() => {
    const sb = supabase;
    if (route !== 'admin' || !sb) return;

    let cancelled = false;
    let inFlight = false;
    let debounceTimer: number | null = null;

    const refreshAdminOperationalData = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const loaded = await loadInitialDataFromSupabase();
        if (!loaded || cancelled) return;
        if (loaded.members) setMembers(loaded.members);
        if (loaded.transactions) setTransactions(loaded.transactions);
        setActiveStampCardIds(loaded.activeStampCardIds);
      } catch (err) {
        console.error('[Supabase] Gagal menyinkronkan data Dasbor Admin:', err);
      } finally {
        inFlight = false;
      }
    };

    const scheduleRefresh = (delayMs = 200) => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        void refreshAdminOperationalData();
      }, delayMs);
    };

    void refreshAdminOperationalData();

    const adminChannel = sb
      .channel('admin-dashboard-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => scheduleRefresh(200)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members' },
        () => scheduleRefresh(200)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vouchers' },
        () => scheduleRefresh(200)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stamp_cards' },
        () => scheduleRefresh(200)
      )
      .subscribe();

    const pollId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshAdminOperationalData();
      }
    }, 6000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshAdminOperationalData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      cancelled = true;
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      window.clearInterval(pollId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      void sb.removeChannel(adminChannel);
    };
  }, [route]);

  const activeMember = members.find((m) => m.id === activeMemberId) || null;

  const handleLoginMember = async (
    identifier: string,
    pin: string
  ): Promise<boolean> => {
    const q = identifier.toLowerCase();
    let found = members.find(
      (m) =>
        (m.phone === identifier ||
          (m.email && m.email.toLowerCase() === q) ||
          m.serialCode.toLowerCase() === q) &&
        m.pin === pin
    );

    if (!found && supabase) {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .or(`phone.eq.${identifier},email.ilike.${q},serial_code.ilike.${q}`)
        .eq('pin', pin)
        .maybeSingle();

      if (error) {
        console.error('[Supabase] Gagal memeriksa login member:', error);
      } else if (data) {
        const loaded = await loadInitialDataFromSupabase();
        if (loaded?.members) {
          setMembers(loaded.members);
          setActiveStampCardIds(loaded.activeStampCardIds);
          found = loaded.members.find((m) => m.id === data.id);
        }
      }
    }

    if (!found) return false;
    lastKnownMemberProgressRef.current = {
      memberId: found.id,
      stamps: found.stamps,
      cardNumber: found.cardNumber,
      voucherIds: found.vouchers.map((v) => v.id),
    };
    saveMemberSession(found);
    setActiveMemberId(found.id);
    setRoute('member-app');
    showToast(`Selamat datang kembali, ${found.firstName}`);
    return true;
  };

  const handleLookupMemberForReset = async (
    method: 'phone' | 'email',
    contact: string
  ): Promise<{ ok: boolean; candidate?: MemberResetCandidate; error?: string }> => {
    const cleaned = contact.trim();
    let matched: Member | undefined;

    if (method === 'email') {
      const targetEmail = cleaned.toLowerCase();
      matched = members.find(
        (m) => m.email && m.email.toLowerCase() === targetEmail
      );
    } else {
      const variants = new Set(normalizePhoneVariants(cleaned));
      matched = members.find((m) =>
        normalizePhoneVariants(m.phone).some((v) => variants.has(v))
      );
    }

    if (!matched && supabase) {
      const remote = await findMemberForResetInSupabase(method, cleaned);
      if (remote) {
        matched = remote;
        setMembers((prev) =>
          prev.some((m) => m.id === remote.id) ? prev : [remote, ...prev]
        );
      }
    }

    if (!matched) {
      return {
        ok: false,
        error: `Akun warga dengan ${method === 'phone' ? 'nomor HP' : 'email'} tersebut tidak ditemukan.`,
      };
    }

    return {
      ok: true,
      candidate: {
        id: matched.id,
        maskedHint: maskContactValue(
          method === 'email' ? matched.email || cleaned : matched.phone,
          method
        ),
        hasBirthday: Boolean(matched.birthday),
      },
    };
  };

  const handleResetMemberPin = async (payload: {
    memberId: string;
    verificationName: string;
    verificationExtra?: string;
    newPin: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    const target = members.find((m) => m.id === payload.memberId);
    if (!target) {
      return { ok: false, error: 'Data akun warga tidak ditemukan.' };
    }

    const inputName = payload.verificationName.trim().toLowerCase();
    const matchesName =
      target.name.trim().toLowerCase() === inputName ||
      target.firstName.trim().toLowerCase() === inputName;
    if (!matchesName) {
      return {
        ok: false,
        error: 'Nama yang dimasukkan tidak sesuai dengan data pendaftaran.',
      };
    }

    if (payload.verificationExtra) {
      const extraNorm = payload.verificationExtra.trim().toUpperCase();
      if (target.serialCode.toUpperCase() !== extraNorm) {
        return {
          ok: false,
          error: 'Kode Seri Kartu tidak cocok dengan akun ini.',
        };
      }
    }

    if (!/^\d{6}$/.test(payload.newPin)) {
      return { ok: false, error: 'PIN baru harus berupa 6 digit angka.' };
    }

    const dbRes = await updateMemberPinInSupabase(target.id, payload.newPin);
    if (!dbRes.ok) {
      return {
        ok: false,
        error: dbRes.error || 'Gagal menyimpan PIN baru ke database.',
      };
    }

    setMembers((prev) =>
      prev.map((m) =>
        m.id === target.id ? { ...m, pin: payload.newPin } : m
      )
    );
    showToast(`PIN baru untuk ${target.firstName} berhasil disimpan`);
    return { ok: true };
  };

  const handleLookupStaffForReset = async (
    method: 'phone' | 'email',
    contact: string
  ): Promise<{ ok: boolean; candidate?: StaffResetCandidate; error?: string }> => {
    const cleaned = contact.trim();
    let matched: StaffAccount | undefined;

    if (method === 'email') {
      const targetEmail = cleaned.toLowerCase();
      matched = staffAccounts.find(
        (s) => s.email && s.email.toLowerCase() === targetEmail
      );
    } else {
      const variants = new Set(normalizePhoneVariants(cleaned));
      matched = staffAccounts.find(
        (s) =>
          s.phone &&
          normalizePhoneVariants(s.phone).some((v) => variants.has(v))
      );
    }

    if (!matched && supabase) {
      const remote = await findStaffForResetInSupabase(method, cleaned);
      if (remote) {
        matched = remote;
        setStaffAccounts((prev) =>
          prev.some((s) => s.id === remote.id) ? prev : [...prev, remote]
        );
      }
    }

    if (!matched) {
      return {
        ok: false,
        error: `Akun staf dengan ${method === 'email' ? 'email' : 'nomor HP'} tersebut belum terdaftar.`,
      };
    }

    if (!matched.active) {
      return {
        ok: false,
        error: 'Akun staf sedang dinonaktifkan oleh Admin.',
      };
    }

    return {
      ok: true,
      candidate: {
        id: matched.id,
        maskedHint: maskContactValue(
          method === 'email' ? matched.email || cleaned : matched.phone || cleaned,
          method
        ),
        roleLabel: matched.roleLabel,
        role: matched.role,
      },
    };
  };

  const handleResetStaffPassword = async (payload: {
    staffId: string;
    verificationUsername: string;
    verificationOutlet: OutletId | 'all';
    newPassword: string;
  }): Promise<{ ok: boolean; username?: string; error?: string }> => {
    const target = staffAccounts.find((s) => s.id === payload.staffId);
    if (!target) {
      return { ok: false, error: 'Akun staf tidak ditemukan.' };
    }

    if (
      target.username.toLowerCase() !==
      payload.verificationUsername.trim().toLowerCase()
    ) {
      return {
        ok: false,
        error: 'Username staf tidak cocok dengan akun tersebut.',
      };
    }

    if (target.outlet !== payload.verificationOutlet) {
      return {
        ok: false,
        error: 'Outlet bertugas yang dipilih tidak cocok dengan data akun staf.',
      };
    }

    if (payload.newPassword.trim().length < 6) {
      return {
        ok: false,
        error: 'Kata sandi baru minimal terdiri dari 6 karakter.',
      };
    }

    const dbRes = await updateStaffPasswordInSupabase(
      target.id,
      payload.newPassword.trim()
    );
    if (!dbRes.ok) {
      return {
        ok: false,
        error: dbRes.error || 'Gagal menyimpan kata sandi staf baru.',
      };
    }

    setStaffAccounts((prev) =>
      prev.map((s) =>
        s.id === target.id ? { ...s, password: payload.newPassword.trim() } : s
      )
    );
    showToast(`Kata sandi staf ${target.name} berhasil diperbarui`);
    return { ok: true, username: target.username };
  };

  const handleIssueBirthdayVoucher = async (memberId: string) => {
    const target = members.find((m) => m.id === memberId);
    if (!target) return;

    const alreadyHas = target.vouchers.some(
      (v) => v.type === 'birthday' && v.status === 'active'
    );
    if (alreadyHas) {
      showToast(`${target.firstName} sudah memiliki voucher ulang tahun aktif`);
      return;
    }

    const now = new Date();
    const todayDisplay = formatShortDateId(now);
    const expiresDisplay = formatShortDateId(
      addDays(now, rules.voucherValidityDays)
    );
    const newVoucher: Voucher = {
      id: `vcr-bday-${Date.now()}`,
      code: `RTRW-BDAY-${Math.floor(1000 + Math.random() * 9000)}`,
      title: 'Hadiah Ulang Tahun',
      subtitle: 'Gratis 1 Minuman Pilihanmu',
      type: 'birthday',
      maxDiscountValue: 38000,
      status: 'active',
      issuedAt: todayDisplay,
      expiresAt: expiresDisplay,
      description: `Gratis 1 minuman reguler atau iced spesial ulang tahun ${target.firstName}. Berlaku di RTRW Pemuda maupun AWANNCOSTA.`,
    };

    const res = await issueVoucherInSupabase(target.id, newVoucher);
    if (!res.ok) {
      showToast(`Gagal menerbitkan voucher ke database: ${res.error || ''}`);
      return;
    }

    setMembers((prev) =>
      prev.map((m) =>
        m.id === target.id
          ? { ...m, vouchers: [newVoucher, ...m.vouchers] }
          : m
      )
    );
    showToast(`Voucher ulang tahun diterbitkan untuk ${target.firstName}`);
  };

  const handleRegisterMember = async (payload: {
    name: string;
    contact: string;
    pin: string;
    birthday?: string;
  }): Promise<{ ok: boolean; member?: Member; error?: string }> => {
    const now = new Date();
    const todayDisplay = formatShortDateId(now);
    const expiresDisplay = formatShortDateId(addYears(now, 1));
    const firstName = payload.name.split(' ')[0] || payload.name;
    const isEmail = payload.contact.includes('@');
    const codeSuffix = Math.random().toString(16).slice(2, 10).toUpperCase();
    const id = `mem-${Date.now()}`;
    const phone = isEmail
      ? `08${String(Date.now()).slice(-10)}`
      : payload.contact;
    const email = isEmail ? payload.contact : undefined;

    const newMember: Member = {
      id,
      name: payload.name,
      firstName,
      phone,
      email,
      pin: payload.pin,
      cardNumber: '01',
      serialCode: `RTRW-${codeSuffix}`,
      stamps: 0,
      totalCupsAllTime: 0,
      totalSpentAllTime: 0,
      completedCards: 0,
      birthday: payload.birthday,
      joinedAt: todayDisplay,
      lastUsedAt: todayDisplay,
      lastUsedOutlet: 'pemuda',
      membershipExpiresAt: expiresDisplay,
      membershipStatus: 'aktif',
      favoriteOutlet: 'pemuda',
      vouchers: [],
      stampDates: [],
    };

    const insertResult = await insertMemberAndCardInSupabase(newMember);
    if (!insertResult.ok && supabase) {
      return {
        ok: false,
        error:
          insertResult.error ||
          'Gagal mendaftarkan akun ke database. Silakan coba lagi.',
      };
    }

    if (insertResult.cardId) {
      setActiveStampCardIds((prev) => ({
        ...prev,
        [newMember.id]: insertResult.cardId!,
      }));
    }

    lastKnownMemberProgressRef.current = {
      memberId: newMember.id,
      stamps: newMember.stamps,
      cardNumber: newMember.cardNumber,
      voucherIds: [],
    };
    saveMemberSession(newMember);
    setMembers((prev) => [newMember, ...prev]);
    setActiveMemberId(newMember.id);
    setRoute('member-app');
    showToast(`Akun warga dibuat untuk ${firstName}`);
    return { ok: true, member: newMember };
  };

  const handleLogoutMember = () => {
    clearMemberSession();
    lastKnownMemberProgressRef.current = null;
    setLastStampEvent(null);
    setRoute('landing');
    showToast('Anda telah keluar dari kartu stempel');
  };

  const handleLoginStaff = (staff: StaffAccount, selectedOutlet: OutletId) => {
    setActiveStaff(staff);
    setActiveCashierOutlet(selectedOutlet);
    if (staff.role === 'kasir') {
      setRoute('cashier');
      showToast(`Masuk sebagai ${staff.name} (${staff.roleLabel})`);
    } else {
      setRoute('admin');
      showToast(`Masuk sebagai ${staff.name}`);
    }
  };

  const handleRecordTransaction = async (payload: {
    memberId: string;
    outlet: OutletId;
    items: string[];
    grossAmount: number;
    voucherId?: string;
    cashierName: string;
  }) => {
    const now = new Date();
    const todayDisplay = formatShortDateId(now);
    const voucherExpiresDisplay = formatShortDateId(
      addDays(now, rules.voucherValidityDays)
    );
    const isoDate = formatIsoDate(now);
    const timeDisplay = formatTimeHm(now);

    const target = members.find((m) => m.id === payload.memberId)!;
    const chosenVoucher = payload.voucherId
      ? target.vouchers.find((v) => v.id === payload.voucherId)
      : undefined;

    let discountAmount = 0;
    if (chosenVoucher) {
      if (chosenVoucher.discountPercent) {
        discountAmount = Math.round(
          (payload.grossAmount * chosenVoucher.discountPercent) / 100
        );
      } else if (chosenVoucher.maxDiscountValue) {
        discountAmount = Math.min(
          payload.grossAmount,
          chosenVoucher.maxDiscountValue
        );
      }
    }
    const netAmount = Math.max(0, payload.grossAmount - discountAmount);
    const stampEarned =
      !chosenVoucher && payload.grossAmount >= rules.minSpendForStamp;

    let newStamps = target.stamps;
    let newlyIssuedVoucher: string | undefined;
    let newlyCreatedVoucherObj: Voucher | undefined;

    const updatedVouchers: Voucher[] = target.vouchers.map((v) =>
      v.id === payload.voucherId
        ? {
            ...v,
            status: 'used',
            usedAt: todayDisplay,
            usedOutlet: payload.outlet,
          }
        : v
    );

    let newCardNumber = target.cardNumber;
    let updatedStampDates = [...target.stampDates];
    let newStampEntry: StampHistoryEntry | undefined;

    if (stampEarned) {
      const incremented = target.stamps + 1;
      if (incremented === 3) {
        newlyIssuedVoucher = rules.milestone3Label;
        newlyCreatedVoucherObj = {
          id: `vcr-${Date.now()}-3`,
          code: `RTRW-D10-${Math.floor(1000 + Math.random() * 9000)}`,
          title: rules.milestone3Label,
          subtitle: 'Hadiah Stempel ke-3',
          type: 'discount_10',
          discountPercent: 10,
          status: 'active',
          issuedAt: todayDisplay,
          expiresAt: voucherExpiresDisplay,
          description: 'Potongan 10% otomatis dari pencapaian stempel ke-3.',
        };
        updatedVouchers.unshift(newlyCreatedVoucherObj);
      } else if (incremented === 6) {
        newlyIssuedVoucher = rules.milestone6Label;
        newlyCreatedVoucherObj = {
          id: `vcr-${Date.now()}-6`,
          code: `RTRW-D15-${Math.floor(1000 + Math.random() * 9000)}`,
          title: rules.milestone6Label,
          subtitle: 'Hadiah Stempel ke-6',
          type: 'discount_15',
          discountPercent: 15,
          status: 'active',
          issuedAt: todayDisplay,
          expiresAt: voucherExpiresDisplay,
          description: 'Potongan 15% otomatis dari pencapaian stempel ke-6.',
        };
        updatedVouchers.unshift(newlyCreatedVoucherObj);
      } else if (incremented === 10) {
        newlyIssuedVoucher = rules.milestone10Label;
        newlyCreatedVoucherObj = {
          id: `vcr-${Date.now()}-10`,
          code: `RTRW-GRT-${Math.floor(1000 + Math.random() * 9000)}`,
          title: rules.milestone10Label,
          subtitle: 'Hadiah Kartu Penuh (Stempel ke-10)',
          type: 'free_drink',
          maxDiscountValue: 40000,
          status: 'active',
          issuedAt: todayDisplay,
          expiresAt: voucherExpiresDisplay,
          description: 'Gratis 1 minuman favorit pilihanmu di kedua outlet.',
        };
        updatedVouchers.unshift(newlyCreatedVoucherObj);
      }

      if (incremented > 10) {
        newStamps = 1;
        newCardNumber = String((Number(target.cardNumber) || 1) + 1).padStart(
          2,
          '0'
        );
        newStampEntry = {
          slot: 1,
          date: todayDisplay,
          outlet: payload.outlet,
          item: payload.items[0] || 'Menu RTRW',
        };
        updatedStampDates = [newStampEntry];
      } else {
        newStamps = incremented;
        newStampEntry = {
          slot: newStamps,
          date: todayDisplay,
          outlet: payload.outlet,
          item: payload.items[0] || 'Menu RTRW',
        };
        updatedStampDates.push(newStampEntry);
      }
    }

    const updatedMember: Member = {
      ...target,
      cardNumber: newCardNumber,
      stamps: newStamps,
      totalCupsAllTime: target.totalCupsAllTime + 1,
      totalSpentAllTime: target.totalSpentAllTime + netAmount,
      completedCards:
        stampEarned && target.stamps + 1 === 10
          ? target.completedCards + 1
          : target.completedCards,
      lastUsedAt: todayDisplay,
      lastUsedOutlet: payload.outlet,
      vouchers: updatedVouchers,
      stampDates: updatedStampDates,
    };

    const txId = `TX-${isoDate.replace(/-/g, '')}-${String(Date.now()).slice(-6)}`;
    const newTx: Transaction = {
      id: txId,
      memberId: target.id,
      memberName: target.name,
      memberSerial: target.serialCode,
      outlet: payload.outlet,
      date: todayDisplay,
      time: timeDisplay,
      isoDate,
      items: payload.items,
      grossAmount: payload.grossAmount,
      discountAmount,
      netAmount,
      stampEarned,
      voucherUsedTitle: chosenVoucher?.title,
      cashierName: payload.cashierName,
    };

    const { nextActiveCardId } = await recordTransactionInSupabase({
      tx: newTx,
      voucherUsedId: chosenVoucher?.id,
      cashierId: activeStaff?.id,
      updatedMember,
      previousStamps: target.stamps,
      activeCardId: activeStampCardIds[target.id],
      newlyIssuedVoucher: newlyCreatedVoucherObj,
      newStampEntry,
    });

    if (nextActiveCardId) {
      setActiveStampCardIds((prev) => ({
        ...prev,
        [target.id]: nextActiveCardId,
      }));
    }

    if (updatedMember.id === activeMemberIdRef.current && getSavedMemberId() === updatedMember.id) {
      lastKnownMemberProgressRef.current = {
        memberId: updatedMember.id,
        stamps: updatedMember.stamps,
        cardNumber: updatedMember.cardNumber,
        voucherIds: updatedMember.vouchers.map((v) => v.id),
      };
      saveMemberSession(updatedMember);
    }

    setMembers((prev) =>
      prev.map((m) => (m.id === payload.memberId ? updatedMember : m))
    );
    setTransactions((prev) => [newTx, ...prev]);

    if (stampEarned) {
      setLastStampEvent({
        memberId: target.id,
        slot: newStamps,
        outlet: payload.outlet,
        newlyIssuedVoucher,
        timestamp: Date.now(),
      });
    }

    showToast(
      stampEarned
        ? `Stempel ${target.firstName} bertambah (${newStamps}/10)`
        : `Voucher ${chosenVoucher?.title || ''} berhasil digunakan`
    );

    return {
      stampEarned,
      newStamps,
      newlyIssuedVoucher,
      netAmount,
      discountAmount,
    };
  };

  const renderActiveScreen = () => {
    switch (route) {
      case 'landing':
        return (
          <LandingView
            darkMode={darkMode}
            onToggleDark={() => setDarkMode((d) => !d)}
            onGoAuthMember={(mode) => {
              setAuthMemberMode(mode);
              setRoute('auth-member');
            }}
            onGoStaffAuth={() => setRoute('auth-staff')}
            rules={rules}
            landingContent={landingContent}
            uiConfig={uiConfig}
            outlets={outlets}
          />
        );
      case 'auth-member':
        return (
          <AuthMemberView
            initialMode={authMemberMode}
            darkMode={darkMode}
            onToggleDark={() => setDarkMode((d) => !d)}
            onBackLanding={() => setRoute('landing')}
            onLoginMember={handleLoginMember}
            onRegisterMember={handleRegisterMember}
            onLookupMemberForReset={handleLookupMemberForReset}
            onResetMemberPin={handleResetMemberPin}
          />
        );
      case 'member-app':
        if (!activeMember) {
          if (isRestoringMemberSession) {
            return (
              <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4] dark:bg-[#0E1319] text-[#16202C] dark:text-[#F4F1EA] px-6">
                <div className="text-center space-y-2">
                  <p className="font-serif-display text-2xl">RTRW</p>
                  <p className="text-xs text-[#646D78] dark:text-[#94A3B8]">
                    Memuat kartu stempelmu…
                  </p>
                </div>
              </div>
            );
          }
          return (
            <AuthMemberView
              initialMode="masuk"
              darkMode={darkMode}
              onToggleDark={() => setDarkMode((d) => !d)}
              onBackLanding={() => {
                clearMemberSession();
                setRoute('landing');
              }}
              onLoginMember={handleLoginMember}
              onRegisterMember={handleRegisterMember}
              onLookupMemberForReset={handleLookupMemberForReset}
              onResetMemberPin={handleResetMemberPin}
            />
          );
        }
        return (
          <MemberAppView
            member={activeMember}
            allMembers={members}
            transactions={transactions}
            outlets={outlets}
            rules={rules}
            uiConfig={uiConfig}
            darkMode={darkMode}
            onToggleDark={() => setDarkMode((d) => !d)}
            onLogout={handleLogoutMember}
            lastStampEvent={lastStampEvent}
          />
        );
      case 'auth-staff':
        return (
          <AuthStaffView
            staffAccounts={staffAccounts}
            outlets={outlets}
            uiConfig={uiConfig}
            darkMode={darkMode}
            onToggleDark={() => setDarkMode((d) => !d)}
            onBackLanding={() => setRoute('landing')}
            onLoginStaff={handleLoginStaff}
            onLookupStaffForReset={handleLookupStaffForReset}
            onResetStaffPassword={handleResetStaffPassword}
          />
        );
      case 'cashier':
        return (
          <CashierView
            staff={activeStaff}
            activeOutlet={activeCashierOutlet}
            outlets={outlets}
            members={members}
            menuItems={menuItems}
            initialSelectedMemberId={cashierPreselectMemberId}
            rules={rules}
            uiConfig={uiConfig}
            darkMode={darkMode}
            onToggleDark={() => setDarkMode((d) => !d)}
            onLogout={() => {
              setCashierPreselectMemberId(null);
              setRoute('auth-staff');
            }}
            onRecordTransaction={handleRecordTransaction}
          />
        );
      case 'admin':
        return (
          <AdminDashboardView
            staff={activeStaff}
            members={members}
            transactions={transactions}
            staffAccounts={staffAccounts}
            rules={rules}
            landingContent={landingContent}
            uiConfig={uiConfig}
            outlets={outlets}
            menuItems={menuItems}
            waTemplates={waTemplates}
            darkMode={darkMode}
            onToggleDark={() => setDarkMode((d) => !d)}
            onLogout={() => setRoute('auth-staff')}
            onUpdateRules={(next) => {
              setRules(next);
              void syncRulesInSupabase(next);
              showToast('Aturan program diperbarui');
            }}
            onUpdateLandingContent={(next) => {
              setLandingContent(next);
              void syncLandingContentInSupabase(next);
              showToast('Konten & foto Beranda diperbarui');
            }}
            onUpdateUiConfig={(next) => {
              setUiConfig(next);
              void syncUiConfigInSupabase(next);
              showToast('Teks Login Staf, Kasir & Kartu Member diperbarui');
            }}
            onUpdateOutlets={(next) => {
              setOutlets(next);
              void syncOutletsInSupabase(next);
            }}
            onUpdateMenuItems={(next, message) => {
              const nextIds = new Set(next.map((m) => m.id));
              const removedIds = menuItems
                .filter((m) => !nextIds.has(m.id))
                .map((m) => m.id);
              setMenuItems(next);
              void syncMenuItemsInSupabase(next);
              if (removedIds.length > 0 && supabase) {
                void supabase
                  .from('menu_items')
                  .delete()
                  .in('id', removedIds)
                  .then(({ error }) => {
                    if (error) {
                      console.error(
                        '[Supabase] Gagal menghapus menu_items:',
                        error
                      );
                    }
                  });
              }
              if (message) showToast(message);
            }}
            onToggleWaTemplate={(id) => {
              setWaTemplates((prev) =>
                prev.map((t) => {
                  if (t.id !== id) return t;
                  const updated = { ...t, enabled: !t.enabled };
                  void syncWaTemplateInSupabase(updated);
                  return updated;
                })
              );
            }}
            onSendTestWa={(tpl, recipientLabel) => {
              const nowLabel = `${formatShortDateId(new Date())} · Uji kirim${recipientLabel ? ` (${recipientLabel})` : ''}`;
              setWaTemplates((prev) =>
                prev.map((t) => {
                  if (t.id !== tpl.id) return t;
                  const updated = { ...t, lastSent: nowLabel };
                  void syncWaTemplateInSupabase(updated);
                  return updated;
                })
              );
              showToast(
                `Membuka WhatsApp untuk uji kirim "${tpl.title}"${recipientLabel ? ` ke ${recipientLabel}` : ''}`
              );
            }}
            onIssueBirthdayVoucher={handleIssueBirthdayVoucher}
            onToggleStaffActive={(id) => {
              setStaffAccounts((prev) =>
                prev.map((s) => {
                  if (s.id !== id) return s;
                  const updated = { ...s, active: !s.active };
                  void upsertStaffInSupabase(updated);
                  return updated;
                })
              );
            }}
            onAddStaff={(payload) => {
              const newStaff: StaffAccount = {
                id: `stf-${Date.now()}`,
                name: payload.name,
                role: 'kasir',
                roleLabel: `Kasir ${payload.outlet === 'pemuda' ? 'Pemuda' : 'AWANNCOSTA'}`,
                outlet: payload.outlet,
                username: payload.username,
                password: payload.password || '••••••',
                phone: payload.phone,
                email: payload.email,
                active: true,
                transactionsToday: 0,
                lastActive: 'Baru dibuat',
              };
              setStaffAccounts((prev) => [...prev, newStaff]);
              void upsertStaffInSupabase(newStaff);
              showToast(`Akun kasir ${payload.name} ditambahkan`);
            }}
            onUpdateStaff={(id, payload) => {
              setStaffAccounts((prev) =>
                prev.map((s) => {
                  if (s.id !== id) return s;
                  const outletLabel =
                    payload.outlet === 'pemuda'
                      ? 'Pemuda'
                      : payload.outlet === 'awanncosta'
                        ? 'AWANNCOSTA'
                        : 'Pusat';
                  const nextRoleLabel =
                    s.role === 'kasir'
                      ? `Kasir ${outletLabel}`
                      : s.role === 'admin_outlet'
                        ? `Admin ${outletLabel}`
                        : s.roleLabel;
                  const updated: StaffAccount = {
                    ...s,
                    name: payload.name,
                    username: payload.username,
                    outlet: payload.outlet,
                    roleLabel: nextRoleLabel,
                    password: payload.password ? payload.password : s.password,
                    phone: payload.phone,
                    email: payload.email,
                  };
                  void upsertStaffInSupabase(updated);
                  return updated;
                })
              );
              showToast(`Akun staf ${payload.name} diperbarui`);
            }}
            onExtendMembership={(memberId) => {
              const nextExpiry = formatShortDateId(addYears(new Date(), 1));
              setMembers((prev) =>
                prev.map((m) =>
                  m.id === memberId
                    ? {
                        ...m,
                        membershipExpiresAt: nextExpiry,
                        membershipStatus: 'aktif',
                      }
                    : m
                )
              );
              void syncMemberExpiryInSupabase(memberId, nextExpiry);
              showToast('Masa aktif keanggotaan diperpanjang +1 tahun');
            }}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F4] dark:bg-[#0E1319]">
      <div className="@container flex-1 w-full bg-[#FAF8F4] dark:bg-[#0E1319]">
        {renderActiveScreen()}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[90] max-w-sm rounded-xl bg-[#EAF9EE] dark:bg-emerald-950 border border-[#BCE6C7] dark:border-emerald-800 text-[#15622C] dark:text-emerald-200 px-4 py-3 shadow-lg flex items-center gap-2.5 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
