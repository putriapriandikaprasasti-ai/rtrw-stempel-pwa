import {
  LandingContent,
  Member,
  MenuCategory,
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
} from '../types';
import { supabase } from './supabase';

export interface LoadedSupabaseData {
  outlets?: OutletInfo[];
  members?: Member[];
  activeStampCardIds: Record<string, string>;
  transactions?: Transaction[];
  staffAccounts?: StaffAccount[];
  menuItems?: MenuItem[];
  rules?: ProgramRules;
  landingContent?: LandingContent;
  uiConfig?: StaffMemberUiConfig;
  waTemplates?: WAMessageTemplate[];
}

interface DbOutletRow {
  id: OutletId;
  code: string;
  name: string;
  short_name: string;
  area: string;
  address: string;
  hours: string;
  phone: string;
  signature_menu: string[] | null;
  image: string | null;
}

interface DbMemberRow {
  id: string;
  name: string;
  first_name: string;
  phone: string;
  email: string | null;
  pin: string;
  card_number: string;
  serial_code: string;
  stamps: number;
  total_cups_all_time: number;
  total_spent_all_time: number;
  completed_cards: number;
  birthday: string | null;
  joined_at: string;
  last_used_at: string;
  last_used_outlet: OutletId;
  membership_expires_at: string;
  membership_status: 'aktif' | 'segera_berakhir' | 'kedaluwarsa';
  favorite_outlet: OutletId;
}

interface DbStampCardRow {
  id: string;
  member_id: string;
  card_number: string;
  serial_code: string;
  stamps_count: number;
  status: 'active' | 'completed';
}

interface DbVoucherRow {
  id: string;
  member_id: string;
  code: string;
  title: string;
  subtitle: string;
  type: 'discount_10' | 'discount_15' | 'free_drink' | 'birthday';
  discount_percent: number | null;
  max_discount_value: number | null;
  status: 'active' | 'used' | 'expired';
  issued_at: string;
  expires_at: string;
  used_at: string | null;
  used_outlet: OutletId | null;
  description: string;
}

interface DbTransactionRow {
  id: string;
  member_id: string;
  member_name: string;
  member_serial: string;
  outlet: OutletId;
  date: string;
  time: string;
  iso_date: string;
  items: string[] | null;
  gross_amount: number;
  discount_amount: number;
  net_amount: number;
  stamp_earned: boolean;
  voucher_used_title: string | null;
  cashier_name: string;
}

interface DbStampHistoryRow {
  id: string;
  member_id: string;
  stamp_card_id: string | null;
  slot: number;
  date: string;
  outlet: OutletId;
  item: string;
}

export async function loadInitialDataFromSupabase(): Promise<LoadedSupabaseData | null> {
  if (!supabase) return null;

  const [
    outletsRes,
    membersRes,
    cardsRes,
    vouchersRes,
    txRes,
    historyRes,
    staffRes,
    menuRes,
    rulesRes,
    landingRes,
    uiRes,
    waRes,
  ] = await Promise.all([
    supabase.from('outlets').select('*').order('code', { ascending: true }),
    supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('stamp_cards')
      .select('*')
      .order('issued_at', { ascending: false }),
    supabase
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('stamp_history')
      .select('*')
      .order('slot', { ascending: true }),
    supabase.from('staff_accounts').select('*'),
    supabase
      .from('menu_items')
      .select('*')
      .order('sort_order', { ascending: true }),
    supabase.from('program_rules').select('*').eq('id', 'default').maybeSingle(),
    supabase
      .from('landing_content')
      .select('*')
      .eq('id', 'default')
      .maybeSingle(),
    supabase.from('ui_configs').select('*').eq('id', 'default').maybeSingle(),
    supabase.from('wa_message_templates').select('*'),
  ]);

  if (outletsRes.error) {
    console.error('[Supabase] Gagal memuat tabel outlets:', outletsRes.error);
  }
  if (membersRes.error) {
    console.error('[Supabase] Gagal memuat tabel members:', membersRes.error);
  }
  if (cardsRes.error) {
    console.error('[Supabase] Gagal memuat tabel stamp_cards:', cardsRes.error);
  }
  if (vouchersRes.error) {
    console.error('[Supabase] Gagal memuat tabel vouchers:', vouchersRes.error);
  }
  if (txRes.error) {
    console.error('[Supabase] Gagal memuat tabel transactions:', txRes.error);
  }
  if (historyRes.error) {
    console.error(
      '[Supabase] Gagal memuat tabel stamp_history:',
      historyRes.error
    );
  }

  const activeStampCardIds: Record<string, string> = {};
  const activeCardByMember: Record<string, DbStampCardRow> = {};

  if (!cardsRes.error && cardsRes.data) {
    for (const card of cardsRes.data as DbStampCardRow[]) {
      if (card.status === 'active' && !activeCardByMember[card.member_id]) {
        activeCardByMember[card.member_id] = card;
        activeStampCardIds[card.member_id] = card.id;
      }
    }
  }

  const vouchersByMember: Record<string, Voucher[]> = {};
  if (!vouchersRes.error && vouchersRes.data) {
    for (const v of vouchersRes.data as DbVoucherRow[]) {
      if (!vouchersByMember[v.member_id]) vouchersByMember[v.member_id] = [];
      vouchersByMember[v.member_id].push({
        id: v.id,
        code: v.code,
        title: v.title,
        subtitle: v.subtitle,
        type: v.type,
        discountPercent: v.discount_percent ?? undefined,
        maxDiscountValue:
          v.max_discount_value !== null ? Number(v.max_discount_value) : undefined,
        status: v.status,
        issuedAt: v.issued_at,
        expiresAt: v.expires_at,
        usedAt: v.used_at ?? undefined,
        usedOutlet: v.used_outlet ?? undefined,
        description: v.description,
      });
    }
  }

  const historyByMember: Record<string, StampHistoryEntry[]> = {};
  if (!historyRes.error && historyRes.data) {
    for (const h of historyRes.data as DbStampHistoryRow[]) {
      const activeCard = activeCardByMember[h.member_id];
      if (activeCard && h.stamp_card_id && h.stamp_card_id !== activeCard.id) {
        continue;
      }
      if (!historyByMember[h.member_id]) historyByMember[h.member_id] = [];
      historyByMember[h.member_id].push({
        slot: h.slot,
        date: h.date,
        outlet: h.outlet,
        item: h.item,
      });
    }
  }

  const result: LoadedSupabaseData = {
    activeStampCardIds,
  };

  if (!outletsRes.error && outletsRes.data && outletsRes.data.length > 0) {
    result.outlets = (outletsRes.data as DbOutletRow[]).map((o) => ({
      id: o.id,
      code: o.code,
      name: o.name,
      shortName: o.short_name,
      area: o.area,
      address: o.address,
      hours: o.hours,
      phone: o.phone,
      signatureMenu: o.signature_menu ?? [],
      image: o.image ?? '',
    }));
  }

  if (!membersRes.error && membersRes.data) {
    result.members = (membersRes.data as DbMemberRow[]).map((m) => {
      const activeCard = activeCardByMember[m.id];
      return {
        id: m.id,
        name: m.name,
        firstName: m.first_name,
        phone: m.phone,
        email: m.email ?? undefined,
        pin: m.pin,
        cardNumber: activeCard?.card_number || m.card_number || '01',
        serialCode: activeCard?.serial_code || m.serial_code,
        stamps:
          activeCard !== undefined ? activeCard.stamps_count : m.stamps ?? 0,
        totalCupsAllTime: m.total_cups_all_time ?? 0,
        totalSpentAllTime: Number(m.total_spent_all_time ?? 0),
        completedCards: m.completed_cards ?? 0,
        birthday: m.birthday ?? undefined,
        joinedAt: m.joined_at,
        lastUsedAt: m.last_used_at,
        lastUsedOutlet: m.last_used_outlet,
        membershipExpiresAt: m.membership_expires_at,
        membershipStatus: m.membership_status,
        favoriteOutlet: m.favorite_outlet,
        vouchers: vouchersByMember[m.id] || [],
        stampDates: historyByMember[m.id] || [],
      };
    });
  }

  if (!txRes.error && txRes.data) {
    result.transactions = (txRes.data as DbTransactionRow[]).map((t) => ({
      id: t.id,
      memberId: t.member_id,
      memberName: t.member_name,
      memberSerial: t.member_serial,
      outlet: t.outlet,
      date: t.date,
      time: t.time,
      isoDate: t.iso_date,
      items: t.items ?? [],
      grossAmount: Number(t.gross_amount),
      discountAmount: Number(t.discount_amount),
      netAmount: Number(t.net_amount),
      stampEarned: Boolean(t.stamp_earned),
      voucherUsedTitle: t.voucher_used_title ?? undefined,
      cashierName: t.cashier_name,
    }));
  }

  if (!staffRes.error && staffRes.data && staffRes.data.length > 0) {
    result.staffAccounts = staffRes.data.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      roleLabel: s.role_label,
      outlet: s.outlet,
      username: s.username,
      password: s.password,
      phone: s.phone ?? undefined,
      email: s.email ?? undefined,
      active: Boolean(s.active),
      transactionsToday: s.transactions_today ?? 0,
      lastActive: s.last_active,
    }));
  }

  if (!menuRes.error && menuRes.data && menuRes.data.length > 0) {
    result.menuItems = menuRes.data.map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category as MenuCategory,
      price: Number(m.price),
      outlets: (m.outlets ?? ['pemuda', 'awanncosta']) as OutletId[],
      isQuickMenu: Boolean(m.is_quick_menu),
      active: Boolean(m.active),
      description: m.description ?? undefined,
    }));
  }

  if (!rulesRes.error && rulesRes.data) {
    const r = rulesRes.data;
    result.rules = {
      minSpendForStamp: Number(r.min_spend_for_stamp),
      voucherValidityDays: r.voucher_validity_days,
      milestone3Label: r.milestone_3_label,
      milestone6Label: r.milestone_6_label,
      milestone10Label: r.milestone_10_label,
      birthdayRewardEnabled: Boolean(r.birthday_reward_enabled),
      allowCrossOutlet: Boolean(r.allow_cross_outlet),
      freeDrinkOptions: r.free_drink_options ?? [],
      landingSectionTitle: r.landing_section_title,
      landingProgramIntro: r.landing_program_intro,
      landingMilestone3Desc: r.landing_milestone_3_desc,
      landingMilestone6Desc: r.landing_milestone_6_desc,
      landingMilestone10Desc: r.landing_milestone_10_desc,
    };
  }

  if (!landingRes.error && landingRes.data) {
    const l = landingRes.data;
    result.landingContent = {
      heroKicker: l.hero_kicker,
      heroLine1: l.hero_line_1,
      heroItalicWord: l.hero_italic_word,
      heroLine3: l.hero_line_3,
      heroSubtitle: l.hero_subtitle,
      heroPrimaryCta: l.hero_primary_cta,
      heroSecondaryCta: l.hero_secondary_cta,
      heroCardHolder: l.hero_card_holder,
      heroCardCode: l.hero_card_code,
      heroCardCaption: l.hero_card_caption,
      footerCopyright: l.footer_copyright,
      footerInstallHint: l.footer_install_hint,
    };
  }

  if (!uiRes.error && uiRes.data) {
    const u = uiRes.data;
    result.uiConfig = {
      staffHeaderBadge: u.staff_header_badge,
      staffLoginTitle: u.staff_login_title,
      staffLoginSubtitle: u.staff_login_subtitle,
      staffOutletLabel: u.staff_outlet_label,
      staffLoginButtonText: u.staff_login_button_text,
      cashierHeaderBadge: u.cashier_header_badge,
      cashierStep1Title: u.cashier_step_1_title,
      cashierStep2Title: u.cashier_step_2_title,
      cashierEmptyPrompt: u.cashier_empty_prompt,
      cashierSubmitButtonText: u.cashier_submit_button_text,
      memberHeaderBadge: u.member_header_badge,
      memberGreetingPrefix: u.member_greeting_prefix,
      cardBrandTitle: u.card_brand_title,
      cardSubtitle: u.card_subtitle,
      cardNumberLabel: u.card_number_label,
      memberPosNotice: u.member_pos_notice,
      memberQrCtaText: u.member_qr_cta_text,
      memberProgressSuffix: u.member_progress_suffix,
      memberCardFullText: u.member_card_full_text,
    };
  }

  if (!waRes.error && waRes.data && waRes.data.length > 0) {
    result.waTemplates = waRes.data.map((w) => ({
      id: w.id,
      title: w.title,
      trigger: w.trigger,
      audienceCount: w.audience_count,
      messagePreview: w.message_preview,
      lastSent: w.last_sent,
      enabled: Boolean(w.enabled),
    }));
  }

  return result;
}

export async function insertMemberAndCardInSupabase(member: Member): Promise<{
  ok: boolean;
  cardId?: string;
  error?: string;
}> {
  if (!supabase) {
    console.warn(
      '[Supabase] Client Supabase belum aktif (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi).'
    );
    return {
      ok: false,
      error: 'Konfigurasi Supabase (URL & Anon Key) belum diatur.',
    };
  }

  const { error: memberError } = await supabase.from('members').insert([
    {
      id: member.id,
      name: member.name,
      first_name: member.firstName,
      phone: member.phone,
      email: member.email ?? null,
      pin: member.pin,
      card_number: member.cardNumber,
      serial_code: member.serialCode,
      stamps: member.stamps,
      total_cups_all_time: member.totalCupsAllTime,
      total_spent_all_time: member.totalSpentAllTime,
      completed_cards: member.completedCards,
      birthday: member.birthday ?? null,
      joined_at: member.joinedAt,
      last_used_at: member.lastUsedAt,
      last_used_outlet: member.lastUsedOutlet,
      membership_expires_at: member.membershipExpiresAt,
      membership_status: member.membershipStatus,
      favorite_outlet: member.favoriteOutlet,
    },
  ]);

  if (memberError) {
    console.error('[Supabase] Gagal menyimpan member baru:', memberError);
    return {
      ok: false,
      error:
        memberError.code === '23505'
          ? 'Nomor WhatsApp atau email sudah terdaftar.'
          : memberError.message,
    };
  }

  const { data: cardRow, error: cardError } = await supabase
    .from('stamp_cards')
    .insert([
      {
        member_id: member.id,
        card_number: member.cardNumber,
        serial_code: member.serialCode,
        stamps_count: 0,
        status: 'active',
      },
    ])
    .select('id')
    .single();

  if (cardError) {
    console.error(
      '[Supabase] Gagal membuat kartu stempel awal di stamp_cards:',
      cardError
    );
    return {
      ok: true,
      error: cardError.message,
    };
  }

  return {
    ok: true,
    cardId: cardRow?.id,
  };
}

export async function recordTransactionInSupabase(params: {
  tx: Transaction;
  voucherUsedId?: string;
  cashierId?: string;
  updatedMember: Member;
  previousStamps: number;
  activeCardId?: string;
  newlyIssuedVoucher?: Voucher;
  newStampEntry?: StampHistoryEntry;
}): Promise<{ nextActiveCardId?: string }> {
  if (!supabase) {
    console.warn(
      '[Supabase] Client Supabase belum aktif; transaksi hanya tersimpan di sesi saat ini.'
    );
    return { nextActiveCardId: params.activeCardId };
  }

  const {
    tx,
    voucherUsedId,
    cashierId,
    updatedMember,
    previousStamps,
    activeCardId,
    newlyIssuedVoucher,
    newStampEntry,
  } = params;

  // 1. Simpan transaksi ke tabel transactions
  const { error: txError } = await supabase.from('transactions').insert([
    {
      id: tx.id,
      member_id: tx.memberId,
      member_name: tx.memberName,
      member_serial: tx.memberSerial,
      outlet: tx.outlet,
      date: tx.date,
      time: tx.time,
      iso_date: tx.isoDate,
      items: tx.items,
      gross_amount: tx.grossAmount,
      discount_amount: tx.discountAmount,
      net_amount: tx.netAmount,
      stamp_earned: tx.stampEarned,
      voucher_id: voucherUsedId ?? null,
      voucher_used_title: tx.voucherUsedTitle ?? null,
      cashier_id: cashierId ?? null,
      cashier_name: tx.cashierName,
    },
  ]);

  if (txError) {
    console.error('[Supabase] Gagal menyimpan transaksi:', txError);
  }

  // 2. Tandai voucher yang ditukarkan pada tabel vouchers
  if (voucherUsedId) {
    const { error: voucherUseError } = await supabase
      .from('vouchers')
      .update({
        status: 'used',
        used_at: tx.date,
        used_outlet: tx.outlet,
      })
      .eq('id', voucherUsedId);

    if (voucherUseError) {
      console.error(
        '[Supabase] Gagal memperbarui status voucher terpakai:',
        voucherUseError
      );
    }
  }

  // 3. Simpan voucher hadiah baru (jika mencapai stempel ke-3, ke-6, atau ke-10)
  if (newlyIssuedVoucher) {
    const { error: newVoucherError } = await supabase.from('vouchers').insert([
      {
        id: newlyIssuedVoucher.id,
        member_id: updatedMember.id,
        code: newlyIssuedVoucher.code,
        title: newlyIssuedVoucher.title,
        subtitle: newlyIssuedVoucher.subtitle,
        type: newlyIssuedVoucher.type,
        discount_percent: newlyIssuedVoucher.discountPercent ?? null,
        max_discount_value: newlyIssuedVoucher.maxDiscountValue ?? null,
        status: newlyIssuedVoucher.status,
        issued_at: newlyIssuedVoucher.issuedAt,
        expires_at: newlyIssuedVoucher.expiresAt,
        used_at: null,
        used_outlet: null,
        description: newlyIssuedVoucher.description,
      },
    ]);

    if (newVoucherError) {
      console.error(
        '[Supabase] Gagal menyimpan voucher hadiah baru:',
        newVoucherError
      );
    }
  }

  // 4. Sinkronkan ringkasan saldo member ke tabel members lebih dulu agar siap saat event Realtime stamp_cards tiba
  const { error: memberUpdateErr } = await supabase
    .from('members')
    .update({
      card_number: updatedMember.cardNumber,
      stamps: updatedMember.stamps,
      total_cups_all_time: updatedMember.totalCupsAllTime,
      total_spent_all_time: updatedMember.totalSpentAllTime,
      completed_cards: updatedMember.completedCards,
      last_used_at: updatedMember.lastUsedAt,
      last_used_outlet: updatedMember.lastUsedOutlet,
    })
    .eq('id', updatedMember.id);

  if (memberUpdateErr) {
    console.error(
      '[Supabase] Gagal memperbarui data member:',
      memberUpdateErr
    );
  }

  let nextActiveCardId = activeCardId;

  // 5. Perbarui / buat kartu di stamp_cards & catat ke stamp_history
  if (tx.stampEarned && newStampEntry) {
    const wrappedToNewCard = previousStamps + 1 > 10;

    if (wrappedToNewCard) {
      if (activeCardId) {
        const { error: completeCardErr } = await supabase
          .from('stamp_cards')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', activeCardId);

        if (completeCardErr) {
          console.error(
            '[Supabase] Gagal menandai kartu stempel lama selesai:',
            completeCardErr
          );
        }
      }

      const { data: createdCard, error: newCardErr } = await supabase
        .from('stamp_cards')
        .insert([
          {
            member_id: updatedMember.id,
            card_number: updatedMember.cardNumber,
            serial_code: updatedMember.serialCode,
            stamps_count: updatedMember.stamps,
            status: 'active',
          },
        ])
        .select('id')
        .single();

      if (newCardErr) {
        console.error(
          '[Supabase] Gagal membuat kartu stempel baru:',
          newCardErr
        );
      } else if (createdCard?.id) {
        nextActiveCardId = createdCard.id;
      }
    } else if (activeCardId) {
      const { error: updateCardErr } = await supabase
        .from('stamp_cards')
        .update({
          stamps_count: updatedMember.stamps,
        })
        .eq('id', activeCardId);

      if (updateCardErr) {
        console.error(
          '[Supabase] Gagal memperbarui jumlah stempel di stamp_cards:',
          updateCardErr
        );
      }
    } else {
      const { data: createdCard, error: insertCardErr } = await supabase
        .from('stamp_cards')
        .insert([
          {
            member_id: updatedMember.id,
            card_number: updatedMember.cardNumber,
            serial_code: updatedMember.serialCode,
            stamps_count: updatedMember.stamps,
            status: 'active',
          },
        ])
        .select('id')
        .single();

      if (insertCardErr) {
        console.error(
          '[Supabase] Gagal menyisipkan stamp_cards untuk member:',
          insertCardErr
        );
      } else if (createdCard?.id) {
        nextActiveCardId = createdCard.id;
      }
    }

    const { error: historyErr } = await supabase.from('stamp_history').insert([
      {
        member_id: updatedMember.id,
        stamp_card_id: nextActiveCardId ?? null,
        transaction_id: tx.id,
        slot: newStampEntry.slot,
        date: newStampEntry.date,
        outlet: newStampEntry.outlet,
        item: newStampEntry.item,
      },
    ]);

    if (historyErr) {
      console.error(
        '[Supabase] Gagal menyimpan riwayat stempel ke stamp_history:',
        historyErr
      );
    }
  }

  return { nextActiveCardId };
}

export interface MemberLiveSnapshot {
  member: Member;
  activeCardId?: string;
  memberTransactions: Transaction[];
  allMembersSummary: Pick<
    Member,
    | 'id'
    | 'cardNumber'
    | 'stamps'
    | 'totalCupsAllTime'
    | 'totalSpentAllTime'
    | 'completedCards'
    | 'lastUsedAt'
    | 'lastUsedOutlet'
  >[];
}

export async function syncMemberLiveStateFromSupabase(
  memberId: string
): Promise<MemberLiveSnapshot | null> {
  if (!supabase || !memberId) return null;

  const [membersRes, cardsRes, vouchersRes, historyRes, txRes] =
    await Promise.all([
      supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('stamp_cards')
        .select('*')
        .eq('member_id', memberId)
        .order('issued_at', { ascending: false }),
      supabase
        .from('vouchers')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false }),
      supabase
        .from('stamp_history')
        .select('*')
        .eq('member_id', memberId)
        .order('slot', { ascending: true }),
      supabase
        .from('transactions')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false }),
    ]);

  if (membersRes.error || !membersRes.data) {
    if (membersRes.error) {
      console.error(
        '[Supabase] Gagal menyinkronkan data member:',
        membersRes.error
      );
    }
    return null;
  }

  const targetRow = (membersRes.data as DbMemberRow[]).find(
    (m) => m.id === memberId
  );
  if (!targetRow) return null;

  const activeCard = !cardsRes.error && cardsRes.data
    ? (cardsRes.data as DbStampCardRow[]).find((c) => c.status === 'active')
    : undefined;

  const vouchers: Voucher[] =
    !vouchersRes.error && vouchersRes.data
      ? (vouchersRes.data as DbVoucherRow[]).map((v) => ({
          id: v.id,
          code: v.code,
          title: v.title,
          subtitle: v.subtitle,
          type: v.type,
          discountPercent: v.discount_percent ?? undefined,
          maxDiscountValue:
            v.max_discount_value !== null
              ? Number(v.max_discount_value)
              : undefined,
          status: v.status,
          issuedAt: v.issued_at,
          expiresAt: v.expires_at,
          usedAt: v.used_at ?? undefined,
          usedOutlet: v.used_outlet ?? undefined,
          description: v.description,
        }))
      : [];

  const stampDates: StampHistoryEntry[] =
    !historyRes.error && historyRes.data
      ? (historyRes.data as DbStampHistoryRow[])
          .filter(
            (h) =>
              !activeCard || !h.stamp_card_id || h.stamp_card_id === activeCard.id
          )
          .map((h) => ({
            slot: h.slot,
            date: h.date,
            outlet: h.outlet,
            item: h.item,
          }))
      : [];

  const memberTransactions: Transaction[] =
    !txRes.error && txRes.data
      ? (txRes.data as DbTransactionRow[]).map((t) => ({
          id: t.id,
          memberId: t.member_id,
          memberName: t.member_name,
          memberSerial: t.member_serial,
          outlet: t.outlet,
          date: t.date,
          time: t.time,
          isoDate: t.iso_date,
          items: t.items ?? [],
          grossAmount: Number(t.gross_amount),
          discountAmount: Number(t.discount_amount),
          netAmount: Number(t.net_amount),
          stampEarned: Boolean(t.stamp_earned),
          voucherUsedTitle: t.voucher_used_title ?? undefined,
          cashierName: t.cashier_name,
        }))
      : [];

  const member: Member = {
    id: targetRow.id,
    name: targetRow.name,
    firstName: targetRow.first_name,
    phone: targetRow.phone,
    email: targetRow.email ?? undefined,
    pin: targetRow.pin,
    cardNumber: activeCard?.card_number || targetRow.card_number || '01',
    serialCode: activeCard?.serial_code || targetRow.serial_code,
    stamps:
      activeCard !== undefined
        ? activeCard.stamps_count
        : targetRow.stamps ?? 0,
    totalCupsAllTime: targetRow.total_cups_all_time ?? 0,
    totalSpentAllTime: Number(targetRow.total_spent_all_time ?? 0),
    completedCards: targetRow.completed_cards ?? 0,
    birthday: targetRow.birthday ?? undefined,
    joinedAt: targetRow.joined_at,
    lastUsedAt: targetRow.last_used_at,
    lastUsedOutlet: targetRow.last_used_outlet,
    membershipExpiresAt: targetRow.membership_expires_at,
    membershipStatus: targetRow.membership_status,
    favoriteOutlet: targetRow.favorite_outlet,
    vouchers,
    stampDates,
  };

  const allMembersSummary = (membersRes.data as DbMemberRow[]).map((m) => ({
    id: m.id,
    cardNumber: m.id === memberId ? member.cardNumber : m.card_number || '01',
    stamps: m.id === memberId ? member.stamps : m.stamps ?? 0,
    totalCupsAllTime: m.total_cups_all_time ?? 0,
    totalSpentAllTime: Number(m.total_spent_all_time ?? 0),
    completedCards: m.completed_cards ?? 0,
    lastUsedAt: m.last_used_at,
    lastUsedOutlet: m.last_used_outlet,
  }));

  return {
    member,
    activeCardId: activeCard?.id,
    memberTransactions,
    allMembersSummary,
  };
}

export async function syncMemberExpiryInSupabase(
  memberId: string,
  membershipExpiresAt: string
) {
  if (!supabase) return;
  const { error } = await supabase
    .from('members')
    .update({
      membership_expires_at: membershipExpiresAt,
      membership_status: 'aktif',
    })
    .eq('id', memberId);
  if (error) console.error('[Supabase] Gagal memperpanjang member:', error);
}

export async function syncRulesInSupabase(rules: ProgramRules) {
  if (!supabase) return;
  const { error } = await supabase.from('program_rules').upsert({
    id: 'default',
    min_spend_for_stamp: rules.minSpendForStamp,
    voucher_validity_days: rules.voucherValidityDays,
    milestone_3_label: rules.milestone3Label,
    milestone_6_label: rules.milestone6Label,
    milestone_10_label: rules.milestone10Label,
    birthday_reward_enabled: rules.birthdayRewardEnabled,
    allow_cross_outlet: rules.allowCrossOutlet,
    free_drink_options: rules.freeDrinkOptions,
    landing_section_title: rules.landingSectionTitle,
    landing_program_intro: rules.landingProgramIntro,
    landing_milestone_3_desc: rules.landingMilestone3Desc,
    landing_milestone_6_desc: rules.landingMilestone6Desc,
    landing_milestone_10_desc: rules.landingMilestone10Desc,
  });
  if (error) console.error('[Supabase] Gagal menyimpan program_rules:', error);
}

export async function syncLandingContentInSupabase(content: LandingContent) {
  if (!supabase) return;
  const { error } = await supabase.from('landing_content').upsert({
    id: 'default',
    hero_kicker: content.heroKicker,
    hero_line_1: content.heroLine1,
    hero_italic_word: content.heroItalicWord,
    hero_line_3: content.heroLine3,
    hero_subtitle: content.heroSubtitle,
    hero_primary_cta: content.heroPrimaryCta,
    hero_secondary_cta: content.heroSecondaryCta,
    hero_card_holder: content.heroCardHolder,
    hero_card_code: content.heroCardCode,
    hero_card_caption: content.heroCardCaption,
    footer_copyright: content.footerCopyright,
    footer_install_hint: content.footerInstallHint,
  });
  if (error)
    console.error('[Supabase] Gagal menyimpan landing_content:', error);
}

export async function syncUiConfigInSupabase(ui: StaffMemberUiConfig) {
  if (!supabase) return;
  const { error } = await supabase.from('ui_configs').upsert({
    id: 'default',
    staff_header_badge: ui.staffHeaderBadge,
    staff_login_title: ui.staffLoginTitle,
    staff_login_subtitle: ui.staffLoginSubtitle,
    staff_outlet_label: ui.staffOutletLabel,
    staff_login_button_text: ui.staffLoginButtonText,
    cashier_header_badge: ui.cashierHeaderBadge,
    cashier_step_1_title: ui.cashierStep1Title,
    cashier_step_2_title: ui.cashierStep2Title,
    cashier_empty_prompt: ui.cashierEmptyPrompt,
    cashier_submit_button_text: ui.cashierSubmitButtonText,
    member_header_badge: ui.memberHeaderBadge,
    member_greeting_prefix: ui.memberGreetingPrefix,
    card_brand_title: ui.cardBrandTitle,
    card_subtitle: ui.cardSubtitle,
    card_number_label: ui.cardNumberLabel,
    member_pos_notice: ui.memberPosNotice,
    member_qr_cta_text: ui.memberQrCtaText,
    member_progress_suffix: ui.memberProgressSuffix,
    member_card_full_text: ui.memberCardFullText,
  });
  if (error) console.error('[Supabase] Gagal menyimpan ui_configs:', error);
}

export async function syncOutletsInSupabase(outlets: OutletInfo[]) {
  if (!supabase) return;
  const payload = outlets.map((o) => ({
    id: o.id,
    code: o.code,
    name: o.name,
    short_name: o.shortName,
    area: o.area,
    address: o.address,
    hours: o.hours,
    phone: o.phone,
    signature_menu: o.signatureMenu,
    image: o.image,
  }));
  const { error } = await supabase.from('outlets').upsert(payload);
  if (error) console.error('[Supabase] Gagal menyimpan outlets:', error);
}

export async function syncMenuItemsInSupabase(items: MenuItem[]) {
  if (!supabase) return;
  const payload = items.map((item, idx) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    outlets: item.outlets,
    is_quick_menu: item.isQuickMenu,
    sort_order: idx + 1,
    active: item.active,
    description: item.description ?? null,
  }));
  const { error: upsertErr } = await supabase.from('menu_items').upsert(payload);
  if (upsertErr) {
    console.error('[Supabase] Gagal menyimpan menu_items:', upsertErr);
  }
}

export async function upsertStaffInSupabase(staff: StaffAccount) {
  if (!supabase) return;
  const basePayload = {
    id: staff.id,
    name: staff.name,
    role: staff.role,
    role_label: staff.roleLabel,
    outlet: staff.outlet,
    username: staff.username,
    password: staff.password,
    active: staff.active,
    transactions_today: staff.transactionsToday,
    last_active: staff.lastActive,
  };
  const { error } = await supabase.from('staff_accounts').upsert({
    ...basePayload,
    phone: staff.phone ?? null,
    email: staff.email ?? null,
  });
  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('phone') || msg.includes('email') || msg.includes('schema cache')) {
      const { error: fallbackErr } = await supabase
        .from('staff_accounts')
        .upsert(basePayload);
      if (fallbackErr) {
        console.error('[Supabase] Gagal menyimpan staff_accounts:', fallbackErr);
      }
    } else {
      console.error('[Supabase] Gagal menyimpan staff_accounts:', error);
    }
  }
}

export async function syncWaTemplateInSupabase(tpl: WAMessageTemplate) {
  if (!supabase) return;
  const { error } = await supabase
    .from('wa_message_templates')
    .update({
      enabled: tpl.enabled,
      last_sent: tpl.lastSent,
      audience_count: tpl.audienceCount,
      message_preview: tpl.messagePreview,
    })
    .eq('id', tpl.id);
  if (error)
    console.error('[Supabase] Gagal memperbarui wa_message_templates:', error);
}

export function normalizePhoneVariants(raw: string): string[] {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return [];
  const variants = new Set<string>([digits]);
  if (digits.startsWith('0')) {
    variants.add(`62${digits.slice(1)}`);
  } else if (digits.startsWith('62')) {
    variants.add(`0${digits.slice(2)}`);
  } else if (digits.startsWith('8')) {
    variants.add(`0${digits}`);
    variants.add(`62${digits}`);
  }
  return Array.from(variants);
}

export function normalizeWaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

export async function findMemberForResetInSupabase(
  method: 'phone' | 'email',
  contact: string
): Promise<Member | null> {
  if (!supabase) return null;
  const cleaned = contact.trim();
  if (!cleaned) return null;

  let matchedId: string | null = null;
  if (method === 'email') {
    const { data, error } = await supabase
      .from('members')
      .select('id')
      .ilike('email', cleaned)
      .maybeSingle();
    if (error) {
      console.error('[Supabase] Gagal mencari email member:', error);
      return null;
    }
    matchedId = data?.id ?? null;
  } else {
    const variants = normalizePhoneVariants(cleaned);
    for (const candidate of variants) {
      const { data, error } = await supabase
        .from('members')
        .select('id')
        .eq('phone', candidate)
        .maybeSingle();
      if (error) {
        console.error('[Supabase] Gagal mencari no HP member:', error);
        continue;
      }
      if (data?.id) {
        matchedId = data.id;
        break;
      }
    }
  }

  if (!matchedId) return null;
  const snapshot = await syncMemberLiveStateFromSupabase(matchedId);
  return snapshot?.member ?? null;
}

export async function updateMemberPinInSupabase(
  memberId: string,
  newPin: string
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: true };
  const { error } = await supabase
    .from('members')
    .update({ pin: newPin })
    .eq('id', memberId);
  if (error) {
    console.error('[Supabase] Gagal memperbarui PIN member:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function findStaffForResetInSupabase(
  method: 'phone' | 'email',
  contact: string
): Promise<StaffAccount | null> {
  if (!supabase) return null;
  const cleaned = contact.trim();
  if (!cleaned) return null;

  let row: Record<string, unknown> | null = null;
  if (method === 'email') {
    const { data, error } = await supabase
      .from('staff_accounts')
      .select('*')
      .ilike('email', cleaned)
      .maybeSingle();
    if (error) {
      console.error('[Supabase] Gagal mencari email staf:', error);
      return null;
    }
    row = data as Record<string, unknown> | null;
  } else {
    const variants = normalizePhoneVariants(cleaned);
    for (const candidate of variants) {
      const { data, error } = await supabase
        .from('staff_accounts')
        .select('*')
        .eq('phone', candidate)
        .maybeSingle();
      if (error) {
        console.error('[Supabase] Gagal mencari no HP staf:', error);
        continue;
      }
      if (data) {
        row = data as Record<string, unknown>;
        break;
      }
    }
  }

  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.name),
    role: row.role as StaffAccount['role'],
    roleLabel: String(row.role_label),
    outlet: row.outlet as StaffAccount['outlet'],
    username: String(row.username),
    password: String(row.password ?? ''),
    phone: row.phone ? String(row.phone) : undefined,
    email: row.email ? String(row.email) : undefined,
    active: Boolean(row.active),
    transactionsToday: Number(row.transactions_today ?? 0),
    lastActive: String(row.last_active ?? ''),
  };
}

export async function updateStaffPasswordInSupabase(
  staffId: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: true };
  const { error } = await supabase
    .from('staff_accounts')
    .update({ password: newPassword })
    .eq('id', staffId);
  if (error) {
    console.error('[Supabase] Gagal memperbarui kata sandi staf:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function issueVoucherInSupabase(
  memberId: string,
  voucher: Voucher
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: true };
  const { error } = await supabase.from('vouchers').insert([
    {
      id: voucher.id,
      member_id: memberId,
      code: voucher.code,
      title: voucher.title,
      subtitle: voucher.subtitle,
      type: voucher.type,
      discount_percent: voucher.discountPercent ?? null,
      max_discount_value: voucher.maxDiscountValue ?? null,
      status: voucher.status,
      issued_at: voucher.issuedAt,
      expires_at: voucher.expiresAt,
      used_at: voucher.usedAt ?? null,
      used_outlet: voucher.usedOutlet ?? null,
      description: voucher.description,
    },
  ]);
  if (error) {
    console.error('[Supabase] Gagal menerbitkan voucher ke Supabase:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

