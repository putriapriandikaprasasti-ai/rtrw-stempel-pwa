import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  INITIAL_LANDING_CONTENT,
  INITIAL_MEMBERS,
  INITIAL_RULES,
  INITIAL_STAFF,
  INITIAL_TRANSACTIONS,
  INITIAL_WA_TEMPLATES,
  OUTLETS,
} from './data/mockData';
import {
  AppRoute,
  LandingContent,
  Member,
  OutletId,
  OutletInfo,
  ProgramRules,
  StaffAccount,
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

  // Live prototype state
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [transactions, setTransactions] =
    useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [staffAccounts, setStaffAccounts] =
    useState<StaffAccount[]>(INITIAL_STAFF);
  const [rules, setRules] = useState<ProgramRules>(INITIAL_RULES);
  const [landingContent, setLandingContent] = useState<LandingContent>(
    INITIAL_LANDING_CONTENT
  );
  const [outlets, setOutlets] = useState<OutletInfo[]>(OUTLETS);
  const [waTemplates, setWaTemplates] =
    useState<WAMessageTemplate[]>(INITIAL_WA_TEMPLATES);

  // Active session state
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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const activeMember =
    members.find((m) => m.id === activeMemberId) || members[0];

  const handleLoginMember = (identifier: string, pin: string): boolean => {
    const q = identifier.toLowerCase();
    const found = members.find(
      (m) =>
        (m.phone === identifier ||
          (m.email && m.email.toLowerCase() === q) ||
          m.serialCode.toLowerCase() === q) &&
        m.pin === pin
    );
    if (!found) return false;
    setActiveMemberId(found.id);
    setRoute('member-app');
    showToast(`Selamat datang kembali, ${found.firstName}`);
    return true;
  };

  const handleRegisterMember = (payload: {
    name: string;
    contact: string;
    pin: string;
    birthday?: string;
  }): Member => {
    const firstName = payload.name.split(' ')[0] || payload.name;
    const isEmail = payload.contact.includes('@');
    const codeSuffix = Math.random().toString(16).slice(2, 10).toUpperCase();
    const newMember: Member = {
      id: `mem-${Date.now()}`,
      name: payload.name,
      firstName,
      phone: isEmail ? '081200009999' : payload.contact,
      email: isEmail ? payload.contact : undefined,
      pin: payload.pin,
      cardNumber: '01',
      serialCode: `RTRW-${codeSuffix}`,
      stamps: 0,
      totalCupsAllTime: 0,
      totalSpentAllTime: 0,
      completedCards: 0,
      birthday: payload.birthday,
      joinedAt: '21 Nov 2026',
      lastUsedAt: '21 Nov 2026',
      lastUsedOutlet: 'pemuda',
      membershipExpiresAt: '21 Nov 2027',
      membershipStatus: 'aktif',
      favoriteOutlet: 'pemuda',
      vouchers: [],
      stampDates: [],
    };
    setMembers((prev) => [newMember, ...prev]);
    setActiveMemberId(newMember.id);
    setRoute('member-app');
    showToast(`Akun warga dibuat untuk ${firstName}`);
    return newMember;
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

  const handleRecordTransaction = (payload: {
    memberId: string;
    outlet: OutletId;
    items: string[];
    grossAmount: number;
    voucherId?: string;
    cashierName: string;
  }) => {
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
    const updatedVouchers: Voucher[] = target.vouchers.map((v) =>
      v.id === payload.voucherId
        ? {
            ...v,
            status: 'used',
            usedAt: '21 Nov 2026',
            usedOutlet: payload.outlet,
          }
        : v
    );

    let newCardNumber = target.cardNumber;
    let updatedStampDates = [...target.stampDates];

    if (stampEarned) {
      const incremented = target.stamps + 1;
      if (incremented === 3) {
        newlyIssuedVoucher = rules.milestone3Label;
        updatedVouchers.unshift({
          id: `vcr-${Date.now()}-3`,
          code: `RTRW-D10-${Math.floor(1000 + Math.random() * 9000)}`,
          title: rules.milestone3Label,
          subtitle: 'Hadiah Stempel ke-3',
          type: 'discount_10',
          discountPercent: 10,
          status: 'active',
          issuedAt: '21 Nov 2026',
          expiresAt: '21 Des 2026',
          description: 'Potongan 10% otomatis dari pencapaian stempel ke-3.',
        });
      } else if (incremented === 6) {
        newlyIssuedVoucher = rules.milestone6Label;
        updatedVouchers.unshift({
          id: `vcr-${Date.now()}-6`,
          code: `RTRW-D15-${Math.floor(1000 + Math.random() * 9000)}`,
          title: rules.milestone6Label,
          subtitle: 'Hadiah Stempel ke-6',
          type: 'discount_15',
          discountPercent: 15,
          status: 'active',
          issuedAt: '21 Nov 2026',
          expiresAt: '21 Des 2026',
          description: 'Potongan 15% otomatis dari pencapaian stempel ke-6.',
        });
      } else if (incremented === 10) {
        newlyIssuedVoucher = rules.milestone10Label;
        updatedVouchers.unshift({
          id: `vcr-${Date.now()}-10`,
          code: `RTRW-GRT-${Math.floor(1000 + Math.random() * 9000)}`,
          title: rules.milestone10Label,
          subtitle: 'Hadiah Kartu Penuh (Stempel ke-10)',
          type: 'free_drink',
          maxDiscountValue: 40000,
          status: 'active',
          issuedAt: '21 Nov 2026',
          expiresAt: '21 Des 2026',
          description: 'Gratis 1 minuman favorit pilihanmu di kedua outlet.',
        });
      }

      if (incremented > 10) {
        newStamps = 1;
        newCardNumber = String((Number(target.cardNumber) || 1) + 1).padStart(
          2,
          '0'
        );
        updatedStampDates = [
          {
            slot: 1,
            date: '21 Nov 2026',
            outlet: payload.outlet,
            item: payload.items[0] || 'Menu RTRW',
          },
        ];
      } else {
        newStamps = incremented;
        updatedStampDates.push({
          slot: newStamps,
          date: '21 Nov 2026',
          outlet: payload.outlet,
          item: payload.items[0] || 'Menu RTRW',
        });
      }
    }

    setMembers((prev) =>
      prev.map((m) =>
        m.id === payload.memberId
          ? {
              ...m,
              cardNumber: newCardNumber,
              stamps: newStamps,
              totalCupsAllTime: m.totalCupsAllTime + 1,
              totalSpentAllTime: m.totalSpentAllTime + netAmount,
              completedCards:
                stampEarned && target.stamps + 1 === 10
                  ? m.completedCards + 1
                  : m.completedCards,
              lastUsedAt: '21 Nov 2026',
              lastUsedOutlet: payload.outlet,
              vouchers: updatedVouchers,
              stampDates: updatedStampDates,
            }
          : m
      )
    );

    const newTx: Transaction = {
      id: `TX-20261121-${String(transactions.length + 1).padStart(2, '0')}`,
      memberId: target.id,
      memberName: target.name,
      memberSerial: target.serialCode,
      outlet: payload.outlet,
      date: '21 Nov 2026',
      time: '12:18',
      isoDate: '2026-11-21',
      items: payload.items,
      grossAmount: payload.grossAmount,
      discountAmount,
      netAmount,
      stampEarned,
      voucherUsedTitle: chosenVoucher?.title,
      cashierName: payload.cashierName,
    };
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
        return (
          <MemberAppView
            member={activeMember}
            allMembers={members}
            transactions={transactions}
            rules={rules}
            darkMode={darkMode}
            onToggleDark={() => setDarkMode((d) => !d)}
            onLogout={() => setRoute('landing')}
            lastStampEvent={lastStampEvent}
            onSimulateCashierWithMember={(memberId) => {
              setActiveStaff(
                staffAccounts.find((s) => s.role === 'kasir') ||
                  staffAccounts[0]
              );
              setActiveCashierOutlet('pemuda');
              setCashierPreselectMemberId(memberId);
              setRoute('cashier');
              showToast('Dialihkan ke Kasir POS dengan QR anggota terpilih');
            }}
          />
        );
      case 'auth-staff':
        return (
          <AuthStaffView
            staffAccounts={staffAccounts}
            outlets={outlets}
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
            members={members}
            initialSelectedMemberId={cashierPreselectMemberId}
            rules={rules}
            darkMode={darkMode}
            onToggleDark={() => setDarkMode((d) => !d)}
            onLogout={() => {
              setCashierPreselectMemberId(null);
              setRoute('auth-staff');
            }}
            onViewMemberCard={(memberId) => {
              setActiveMemberId(memberId);
              setRoute('member-app');
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
            outlets={outlets}
            waTemplates={waTemplates}
            darkMode={darkMode}
            onToggleDark={() => setDarkMode((d) => !d)}
            onLogout={() => setRoute('auth-staff')}
            onUpdateRules={(next) => {
              setRules(next);
              showToast('Aturan program diperbarui');
            }}
            onUpdateLandingContent={(next) => {
              setLandingContent(next);
              showToast('Konten & foto Beranda diperbarui');
            }}
            onUpdateOutlets={(next) => {
              setOutlets(next);
            }}
            onToggleWaTemplate={(id) => {
              setWaTemplates((prev) =>
                prev.map((t) =>
                  t.id === id ? { ...t, enabled: !t.enabled } : t
                )
              );
            }}
            onSendTestWa={(tpl) => {
              showToast(`Uji kirim WhatsApp "${tpl.title}" ke nomor demo berhasil`);
            }}
            onToggleStaffActive={(id) => {
              setStaffAccounts((prev) =>
                prev.map((s) =>
                  s.id === id ? { ...s, active: !s.active } : s
                )
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
                password: '••••••',
                active: true,
                transactionsToday: 0,
                lastActive: 'Baru dibuat',
              };
              setStaffAccounts((prev) => [...prev, newStaff]);
              showToast(`Akun kasir ${payload.name} ditambahkan`);
            }}
            onExtendMembership={(memberId) => {
              setMembers((prev) =>
                prev.map((m) =>
                  m.id === memberId
                    ? {
                        ...m,
                        membershipExpiresAt: '21 Nov 2027',
                        membershipStatus: 'aktif',
                      }
                    : m
                )
              );
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
