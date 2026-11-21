import React, { useEffect, useState } from 'react';
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
  insertMemberAndCardInSupabase,
  loadInitialDataFromSupabase,
  recordTransactionInSupabase,
  syncLandingContentInSupabase,
  syncMemberExpiryInSupabase,
  syncMenuItemsInSupabase,
  syncOutletsInSupabase,
  syncRulesInSupabase,
  syncUiConfigInSupabase,
  syncWaTemplateInSupabase,
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
import { AuthMemberView } from './views/AuthMemberView';
import { AuthStaffView } from './views/AuthStaffView';
import { CashierView } from './views/CashierView';
import { LandingView } from './views/LandingView';
import { MemberAppView, StampEventPayload } from './views/MemberAppView';

export default function App() {
  const [route, setRoute] = useState<AppRoute>('landing');
  const [authMemberMode, setAuthMemberMode] = useState<'masuk' | 'daftar'>(
    'masuk'
  );
  const [darkMode, setDarkMode] = useState(false);

  // State aplikasi yang disinkronkan dengan Supabase
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
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
  const [activeMemberId, setActiveMemberId] = useState<string>('mem-sekar');
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

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

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
          if (
            loaded.members.length > 0 &&
            !loaded.members.some((m) => m.id === activeMemberId)
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
      }
    };

    void initSupabase();

    return () => {
      cancelled = true;
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const activeMember =
    members.find((m) => m.id === activeMemberId) || members[0];

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
    setActiveMemberId(found.id);
    setRoute('member-app');
    showToast(`Selamat datang kembali, ${found.firstName}`);
    return true;
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

    setMembers((prev) => [newMember, ...prev]);
    setActiveMemberId(newMember.id);
    setRoute('member-app');
    showToast(`Akun warga dibuat untuk ${firstName}`);
    return { ok: true, member: newMember };
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
          />
        );
      case 'member-app':
        if (!activeMember) {
          return (
            <AuthMemberView
              initialMode="masuk"
              darkMode={darkMode}
              onToggleDark={() => setDarkMode((d) => !d)}
              onBackLanding={() => setRoute('landing')}
              onLoginMember={handleLoginMember}
              onRegisterMember={handleRegisterMember}
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
            onLogout={() => setRoute('landing')}
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
            onSendTestWa={(tpl) => {
              showToast(`Uji kirim WhatsApp "${tpl.title}" berhasil dikirim`);
            }}
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
