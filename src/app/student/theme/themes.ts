// src/app/student/theme/themes.ts
//
// ONE place for every color / surface / state class used on the student side.
// Components never hard-code colors: they read tokens from the active theme.
//
// HOW TO ADD A NEW THEME
//   1. Copy `anushivaDefault` below, rename it, change the classes.
//   2. Add its id to `ThemeId` and register it in `THEMES`.
//   Nothing else needs to change.
//
// HOW TO ADD A NEW TOKEN (when a new page needs a color that doesn't exist yet)
//   1. Add the field to the `Theme` interface.
//   2. Give it a value in BOTH themes below.
//
// TAILWIND NOTE
//   Every class must be written as a complete literal string (never built with
//   template strings like `text-${color}-400`), otherwise Tailwind can't see it.
//   Keep this file inside `src/` so it is covered by Tailwind's `content` globs.
//
// CONVENTION
//   - Tokens named *Border / panel / inset / input hold COLOR classes only.
//     Components add structure (`border`, `rounded-2xl`, padding) themselves.
//   - In AnushivaDefault the values are the ORIGINAL classes the components used,
//     so Dark mode looks exactly as it did before theming.

export type ThemeId = "AnushivaDefault" | "AnushivaLight";

export type SourceTypeKey = "rbi" | "pib" | "economy";
export type PillarKey =
  | "RBI Circulars"
  | "Government Schemes"
  | "Economic Reports"
  | "Banking Regulations";

interface Tag {
  text: string;
  bg: string;
  border: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  mode: "dark" | "light";

  // Page shell
  page: string; // main background + base text
  pageNotes: string; // cream reading surface used by the notes module
  glow: string; // soft background glow color
  selection: string; // text selection colors
  header: string; // sticky top bar (colors only)
  iconButton: string; // small square icon buttons (full state classes)

  // Surfaces
  panel: string; // cards / sidebar blocks
  panelDashed: string; // empty-state surfaces
  inset: string; // inner surfaces (tags, segmented wrappers, explanation boxes)
  input: string; // text inputs
  divider: string; // border color for divider lines

  text: {
    heading: string;
    body: string;
    muted: string;
    mutedHover: string; // muted that brightens on hover
    faint: string;
  };

  accent: {
    text: string;
    textStrong: string;
    soft: string; // chip bg + border
    iconWrap: string; // round icon container bg + border
    solid: string; // primary filled button
    solidHover: string;
    solidGroupHover: string;
    gradient: string; // progress fill
    track: string; // progress track
    marker: string; // list bullets
    spinnerStrong: string;
    spinnerDim: string;
    hoverBorder: string;
    hoverBoth: string; // border + text on hover
    linkHover: string;
    titleHover: string;
    callout: string; // digest callout surface + borders + hover
  };

  amber: {
    text: string;
    hoverText: string;
    icon: string;
    iconWrap: string;
    today: string; // "today" dot
    lockedTitle: string;
    lockedBody: string;
  };

  success: { text: string };

  filter: { selected: string; idle: string };
  segmented: { active: string; idle: string };
  toggle: { on: string; off: string };

  card: { hover: string; read: string; locked: string; groupHoverBody: string };
  bookmark: { on: string; off: string; fill: string };

  calendar: { selected: string; dayHover: string; selectedSub: string };

  quiz: {
    option: string;
    correct: string;
    wrong: string;
    dim: string;
    correctIcon: string;
    wrongIcon: string;
  };

  drawer: { overlay: string; surface: string; header: string };

  source: Record<SourceTypeKey, Tag>;
  pillar: Record<PillarKey, Tag>;

  // Dashboard-only (student/page.tsx)
  dash: {
    barBorder: string;
    barBorderNotes: string;
    tabAssessActive: string;
    tabAssessIdle: string;
    tabNotesActive: string;
    tabNotesIdle: string;
    tabCurrentAffairs: string;
    backToDashboard: string;
    lockOverlay: string;
    lockIcon: string;
    lockBadge: string;
  };

  // Dashboard components (PerformanceOverview, RecentAssignedTests, TestCard,
  // SectionTabs, SectionTestBrowser, StatsCards)
  ui: {
    // text helpers
    textStrong: string;
    textTitle: string;
    dividerSoft: string;
    cyanText: string;
    indigoText: string;
    roseText: string;

    // performance overview
    fillBlue: string;
    ringBlue: string;
    ringCyan: string;
    statCard: string;
    softCard: string;
    insightCard: string;
    indigoIconBox: string;
    positiveRow: string;
    positiveBadge: string;
    negativeRow: string;
    negativeBadge: string;

    // test cards (pipeline + grid)
    premiumCard: string;
    pipelineCard: string;
    testCard: string;
    premiumStrip: string;
    normalStrip: string;
    chipBlue: string;
    chipCyan: string;
    chipAmber: string;
    chipAmberIcon: string;
    badgeRed: string;
    badgeAmber: string;
    badgeGreen: string;
    titlePremium: string;
    titleNormal: string;
    linkPremium: string;
    linkNormal: string;
    iconBoxPremium: string;
    iconBoxNormal: string;
    clockLabel: string;
    clockValue: string;
    btnGhost: string;
    btnPremium: string;
    btnPrimary: string;

    // section browser
    segWrap: string;
    segIdle: string;
    nextUpBanner: string;
    nextUpLabel: string;
    chapterWrap: string;
    chapterHover: string;
    numDone: string;
    numIdle: string;

    // section tabs
    tabActive: string;
    tabIdle: string;
    tabIconIdle: string;
    tabCountIdle: string;

    // stats cards
    statSolid: string;
    iconBlue: string;
    iconEmerald: string;
    iconAmber: string;
    iconPurple: string;
  };
}

/* ------------------------------------------------------------------ */
/*  AnushivaDefault  (the current dark-navy + blue theme)              */
/* ------------------------------------------------------------------ */
const anushivaDefault: Theme = {
  id: "AnushivaDefault",
  name: "Anushiva Default",
  mode: "dark",

  page: "bg-[#0F172A] text-[#F8FAFC]",
  pageNotes: "bg-[#FDFBF7]",
  glow: "bg-[#312E81]/15",
  selection: "selection:bg-blue-500/30 selection:text-blue-100",
  header: "border-slate-800 bg-[#0F172A]/90",
  iconButton:
    "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-100",

  panel: "border-slate-800 bg-slate-900/60 backdrop-blur-sm",
  panelDashed: "border-slate-700 bg-slate-900/40",
  inset: "border-slate-800 bg-slate-950/50",
  input:
    "border-slate-800 bg-slate-950/50 text-slate-100 placeholder-slate-500 focus:border-blue-500/50 focus:ring-blue-500/30",
  divider: "border-slate-800",

  text: {
    heading: "text-slate-100",
    body: "text-slate-300",
    muted: "text-slate-400",
    mutedHover: "text-slate-400 hover:text-slate-100",
    faint: "text-slate-500",
  },

  accent: {
    text: "text-blue-400",
    textStrong: "text-blue-300",
    soft: "border-blue-500/25 bg-blue-500/10",
    iconWrap: "border-blue-500/30 bg-blue-500/10",
    solid: "bg-blue-600 text-white",
    solidHover: "hover:bg-blue-500",
    solidGroupHover: "group-hover:bg-blue-500",
    gradient: "bg-gradient-to-r from-blue-500 to-indigo-500",
    track: "bg-slate-800",
    marker: "marker:text-blue-400/70",
    spinnerStrong: "text-[#2563EB]",
    spinnerDim: "text-blue-400/50",
    hoverBorder: "hover:border-blue-500/40",
    hoverBoth: "hover:border-blue-500/40 hover:text-blue-400",
    linkHover: "hover:text-blue-400",
    titleHover: "group-hover:text-blue-300",
    callout:
      "border-blue-500/25 bg-slate-900/60 backdrop-blur-sm hover:border-blue-500/50 hover:shadow-[0_4px_24px_-8px_rgba(37,99,235,0.35)]",
  },

  amber: {
    text: "text-amber-400",
    hoverText: "group-hover:text-amber-300",
    icon: "text-amber-400",
    iconWrap: "border-amber-500/30 bg-amber-500/10",
    today: "bg-amber-400",
    lockedTitle: "text-slate-300",
    lockedBody: "text-slate-500",
  },

  success: { text: "text-emerald-400" },

  filter: {
    selected: "border-blue-500/50 bg-blue-500/15 text-blue-300",
    idle: "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200",
  },
  segmented: {
    active: "bg-blue-500/20 text-blue-300 shadow-sm",
    idle: "text-slate-500 hover:text-slate-300",
  },
  toggle: { on: "bg-blue-600", off: "bg-slate-700" },

  card: {
    hover:
      "border-slate-800 bg-slate-900/60 hover:border-blue-500/40 hover:shadow-[0_4px_24px_-8px_rgba(37,99,235,0.3)]",
    read: "border-slate-800 bg-slate-900/40 opacity-70",
    locked: "border-amber-500/30 bg-slate-900/60",
    groupHoverBody: "group-hover:text-slate-300",
  },
  bookmark: {
    on: "border-blue-500/40 bg-blue-500/15 text-blue-400",
    off: "border-slate-800 bg-slate-950/50 text-slate-500 hover:text-blue-400",
    fill: "fill-blue-400",
  },

  calendar: {
    selected: "bg-blue-600 shadow-lg shadow-blue-900/40",
    dayHover: "hover:bg-slate-800/60",
    selectedSub: "text-white/70",
  },

  quiz: {
    option:
      "border-slate-800 bg-slate-950/40 text-slate-200 hover:border-blue-500/40 hover:bg-slate-900",
    correct: "border-emerald-500/40 bg-emerald-500/10 text-slate-100",
    wrong: "border-red-500/40 bg-red-500/10 text-slate-100",
    dim: "border-slate-800 bg-slate-900/30 text-slate-500",
    correctIcon: "text-emerald-400",
    wrongIcon: "text-red-400",
  },

  drawer: {
    overlay: "bg-black/60",
    surface: "border-slate-800 bg-[#0F172A] text-[#F8FAFC]",
    header: "border-slate-800 bg-[#0F172A]/95",
  },

  source: {
    rbi: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    pib: { text: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/25" },
    economy: { text: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/25" },
  },
  pillar: {
    "RBI Circulars": { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    "Government Schemes": { text: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/25" },
    "Economic Reports": { text: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/25" },
    "Banking Regulations": { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  },

  dash: {
    barBorder: "border-slate-800",
    barBorderNotes: "border-stone-200",
    tabAssessActive: "border-blue-500 text-blue-400",
    tabAssessIdle: "border-transparent text-slate-400 hover:text-slate-200",
    tabNotesActive: "border-amber-700 text-amber-800",
    tabNotesIdle: "border-transparent text-slate-400 hover:text-slate-500",
    tabCurrentAffairs: "border-transparent text-slate-400 hover:text-emerald-400",
    backToDashboard: "text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80",
    lockOverlay: "bg-slate-950/80 border-amber-500/30 hover:bg-slate-950/70",
    lockIcon: "bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-black/60",
    lockBadge: "text-amber-400 bg-slate-900 border-slate-800",
  },

  ui: {
    textStrong: "text-white",
    textTitle: "text-slate-200",
    dividerSoft: "border-slate-800/60",
    cyanText: "text-[#22D3EE]",
    indigoText: "text-indigo-400",
    roseText: "text-rose-400",

    fillBlue: "bg-blue-500",
    ringBlue: "border-slate-800 border-t-blue-500 text-blue-400",
    ringCyan: "border-slate-800 border-t-cyan-400 text-cyan-400",
    statCard: "bg-gradient-to-br from-[#1E293B] to-[#111827] border-slate-800 shadow-xl",
    softCard: "bg-gradient-to-br from-[#1E293B]/60 to-[#0F172A] border-slate-800/80",
    insightCard:
      "bg-gradient-to-br from-[#1E293B] via-[#1E1B4B]/40 to-[#0F172A] border-slate-800/70 shadow-lg",
    indigoIconBox: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    positiveRow: "bg-emerald-950/20 border-emerald-900/30",
    positiveBadge: "text-emerald-400 bg-emerald-950 border-emerald-800/40",
    negativeRow: "bg-rose-950/20 border-rose-900/30",
    negativeBadge: "text-rose-400 bg-rose-950 border-rose-800/40",

    premiumCard:
      "bg-gradient-to-br from-[#1E1B4B]/90 via-[#0F172A] to-[#111827] border-indigo-500/30 hover:border-indigo-400/50 shadow-indigo-950/40",
    pipelineCard:
      "bg-gradient-to-br from-[#1E293B] to-[#131C2E] border-slate-800/80 hover:border-slate-700/80 shadow-black/20",
    testCard: "bg-[#1E293B]/80 border-slate-800/80 hover:border-slate-700 shadow-black/20",
    premiumStrip: "bg-gradient-to-r from-amber-400 via-indigo-500 to-violet-500",
    normalStrip: "bg-gradient-to-r from-[#2563EB] via-[#8B5CF6] to-[#22D3EE]",
    chipBlue: "text-blue-400 bg-blue-950/60 border-blue-900/40",
    chipCyan: "text-cyan-400 bg-cyan-950/60 border-cyan-900/40",
    chipAmber: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    chipAmberIcon: "text-amber-400 fill-amber-400/20",
    badgeRed: "text-red-400 bg-red-950/40 border-red-900/40",
    badgeAmber: "text-amber-400 bg-amber-950/40 border-amber-900/40",
    badgeGreen: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    titlePremium: "text-indigo-100 group-hover:text-white",
    titleNormal: "text-white group-hover:text-[#22D3EE]",
    linkPremium: "text-amber-400 hover:text-amber-300",
    linkNormal: "text-[#22D3EE] hover:text-white",
    iconBoxPremium: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 group-hover:text-amber-400",
    iconBoxNormal: "bg-slate-900 border-slate-800 text-[#2563EB] group-hover:text-[#22D3EE]",
    clockLabel: "text-[#CBD5E1]/40",
    clockValue: "text-[#CBD5E1]/80 bg-slate-900 border-slate-800",
    btnGhost: "bg-slate-900 hover:bg-slate-950 border-slate-800 text-[#CBD5E1] hover:text-white",
    btnPremium:
      "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-950",
    btnPrimary:
      "bg-gradient-to-r from-[#2563EB] to-[#312E81] hover:from-[#3b82f6] hover:to-[#2563EB] shadow-blue-950",

    segWrap: "bg-slate-900/70 border-slate-800",
    segIdle: "text-slate-400 hover:text-white",
    nextUpBanner: "bg-indigo-950/40 border-indigo-500/30",
    nextUpLabel: "text-indigo-300",
    chapterWrap: "bg-[#1E293B]/50 border-slate-800",
    chapterHover: "hover:bg-slate-800/40",
    numDone: "bg-emerald-500/15 text-emerald-400",
    numIdle: "bg-indigo-500/15 text-indigo-300",

    tabActive:
      "bg-gradient-to-r from-[#312E81] to-[#2563EB] border-[#2563EB]/50 text-white shadow-lg shadow-[#2563EB]/20 scale-[1.01]",
    tabIdle:
      "bg-[#1E293B]/70 backdrop-blur-sm border-slate-800 text-[#CBD5E1] hover:text-white hover:border-slate-700 hover:bg-[#1E293B]",
    tabIconIdle: "text-[#CBD5E1]",
    tabCountIdle: "bg-slate-900 text-[#CBD5E1]",

    statSolid: "bg-[#1E293B] border-slate-800/80",
    iconBlue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    iconEmerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    iconAmber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    iconPurple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
};

/* ------------------------------------------------------------------ */
/*  AnushivaLight  (clean white + soft slate, same blue accent)        */
/* ------------------------------------------------------------------ */
const anushivaLight: Theme = {
  id: "AnushivaLight",
  name: "Anushiva Light",
  mode: "light",

  page: "bg-[#F4F6FA] text-slate-900",
  pageNotes: "bg-[#FDFBF7]",
  glow: "bg-[#6366F1]/10",
  selection: "selection:bg-blue-200 selection:text-blue-900",
  header: "border-slate-200 bg-[#F4F6FA]/90",
  iconButton:
    "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900",

  panel: "border-slate-200 bg-white shadow-sm",
  panelDashed: "border-slate-300 bg-white/70",
  inset: "border-slate-200 bg-slate-50",
  input:
    "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500/50 focus:ring-blue-500/20",
  divider: "border-slate-200",

  text: {
    heading: "text-slate-900",
    body: "text-slate-700",
    muted: "text-slate-500",
    mutedHover: "text-slate-500 hover:text-slate-900",
    faint: "text-slate-400",
  },

  accent: {
    text: "text-blue-600",
    textStrong: "text-blue-700",
    soft: "border-blue-200 bg-blue-50",
    iconWrap: "border-blue-200 bg-blue-100",
    solid: "bg-blue-600 text-white",
    solidHover: "hover:bg-blue-700",
    solidGroupHover: "group-hover:bg-blue-700",
    gradient: "bg-gradient-to-r from-blue-500 to-indigo-500",
    track: "bg-slate-200",
    marker: "marker:text-blue-500/70",
    spinnerStrong: "text-blue-600",
    spinnerDim: "text-blue-500/50",
    hoverBorder: "hover:border-blue-400",
    hoverBoth: "hover:border-blue-400 hover:text-blue-600",
    linkHover: "hover:text-blue-600",
    titleHover: "group-hover:text-blue-700",
    callout:
      "border-blue-300 bg-white shadow-sm hover:border-blue-500 hover:shadow-[0_4px_24px_-8px_rgba(37,99,235,0.3)]",
  },

  amber: {
    text: "text-amber-600",
    hoverText: "group-hover:text-amber-700",
    icon: "text-amber-500",
    iconWrap: "border-amber-300 bg-amber-50",
    today: "bg-amber-500",
    lockedTitle: "text-slate-600",
    lockedBody: "text-slate-400",
  },

  success: { text: "text-emerald-600" },

  filter: {
    selected: "border-blue-300 bg-blue-50 text-blue-700",
    idle: "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-800",
  },
  segmented: {
    active: "bg-white text-blue-700 shadow-sm",
    idle: "text-slate-500 hover:text-slate-800",
  },
  toggle: { on: "bg-blue-600", off: "bg-slate-300" },

  card: {
    hover:
      "border-slate-200 bg-white shadow-sm hover:border-blue-400 hover:shadow-[0_4px_24px_-8px_rgba(37,99,235,0.25)]",
    read: "border-slate-200 bg-white/70 opacity-70",
    locked: "border-amber-300 bg-white",
    groupHoverBody: "group-hover:text-slate-700",
  },
  bookmark: {
    on: "border-blue-300 bg-blue-50 text-blue-600",
    off: "border-slate-200 bg-slate-50 text-slate-400 hover:text-blue-600",
    fill: "fill-blue-600",
  },

  calendar: {
    selected: "bg-blue-600 shadow-lg shadow-blue-300/50",
    dayHover: "hover:bg-slate-100",
    selectedSub: "text-white/70",
  },

  quiz: {
    option:
      "border-slate-200 bg-slate-50 text-slate-800 hover:border-blue-400 hover:bg-white",
    correct: "border-emerald-400 bg-emerald-50 text-slate-900",
    wrong: "border-red-300 bg-red-50 text-slate-900",
    dim: "border-slate-200 bg-white text-slate-400",
    correctIcon: "text-emerald-600",
    wrongIcon: "text-red-500",
  },

  drawer: {
    overlay: "bg-slate-900/30",
    surface: "border-slate-200 bg-[#F4F6FA] text-slate-900",
    header: "border-slate-200 bg-[#F4F6FA]/95",
  },

  source: {
    rbi: { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-300" },
    pib: { text: "text-sky-700", bg: "bg-sky-50", border: "border-sky-300" },
    economy: { text: "text-violet-700", bg: "bg-violet-50", border: "border-violet-300" },
  },
  pillar: {
    "RBI Circulars": { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-300" },
    "Government Schemes": { text: "text-sky-700", bg: "bg-sky-50", border: "border-sky-300" },
    "Economic Reports": { text: "text-violet-700", bg: "bg-violet-50", border: "border-violet-300" },
    "Banking Regulations": { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-300" },
  },

  dash: {
    barBorder: "border-slate-200",
    barBorderNotes: "border-stone-200",
    tabAssessActive: "border-blue-600 text-blue-700",
    tabAssessIdle: "border-transparent text-slate-500 hover:text-slate-800",
    tabNotesActive: "border-amber-700 text-amber-800",
    tabNotesIdle: "border-transparent text-slate-500 hover:text-slate-700",
    tabCurrentAffairs: "border-transparent text-slate-500 hover:text-emerald-600",
    backToDashboard: "text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80",
    lockOverlay: "bg-white/85 border-amber-300 hover:bg-white/75",
    lockIcon: "bg-amber-50 border-amber-300 text-amber-600 shadow-amber-200/60",
    lockBadge: "text-amber-700 bg-white border-slate-200",
  },

  ui: {
    textStrong: "text-slate-900",
    textTitle: "text-slate-800",
    dividerSoft: "border-slate-200",
    cyanText: "text-cyan-600",
    indigoText: "text-indigo-600",
    roseText: "text-rose-600",

    fillBlue: "bg-blue-500",
    ringBlue: "border-slate-200 border-t-blue-500 text-blue-600",
    ringCyan: "border-slate-200 border-t-cyan-500 text-cyan-600",
    statCard: "bg-white border-slate-200 shadow-sm",
    softCard: "bg-white border-slate-200 shadow-sm",
    insightCard: "bg-gradient-to-br from-indigo-50 via-white to-slate-50 border-indigo-200 shadow-sm",
    indigoIconBox: "bg-indigo-50 border-indigo-200 text-indigo-600",
    positiveRow: "bg-emerald-50 border-emerald-200",
    positiveBadge: "text-emerald-700 bg-emerald-100 border-emerald-300",
    negativeRow: "bg-rose-50 border-rose-200",
    negativeBadge: "text-rose-700 bg-rose-100 border-rose-300",

    premiumCard:
      "bg-gradient-to-br from-indigo-50 via-white to-violet-50 border-indigo-300 hover:border-indigo-400 shadow-indigo-200/60",
    pipelineCard: "bg-white border-slate-200 hover:border-slate-300 shadow-slate-200/70",
    testCard: "bg-white border-slate-200 hover:border-slate-300 shadow-slate-200/70",
    premiumStrip: "bg-gradient-to-r from-amber-400 via-indigo-500 to-violet-500",
    normalStrip: "bg-gradient-to-r from-[#2563EB] via-[#8B5CF6] to-[#22D3EE]",
    chipBlue: "text-blue-700 bg-blue-50 border-blue-200",
    chipCyan: "text-cyan-700 bg-cyan-50 border-cyan-200",
    chipAmber: "text-amber-700 bg-amber-50 border-amber-200",
    chipAmberIcon: "text-amber-500 fill-amber-500/20",
    badgeRed: "text-red-700 bg-red-50 border-red-200",
    badgeAmber: "text-amber-700 bg-amber-50 border-amber-200",
    badgeGreen: "bg-emerald-50 text-emerald-700 border-emerald-200",
    titlePremium: "text-indigo-900 group-hover:text-indigo-700",
    titleNormal: "text-slate-900 group-hover:text-blue-600",
    linkPremium: "text-amber-600 hover:text-amber-700",
    linkNormal: "text-blue-600 hover:text-blue-800",
    iconBoxPremium: "bg-indigo-50 border-indigo-200 text-indigo-600 group-hover:text-amber-600",
    iconBoxNormal: "bg-slate-50 border-slate-200 text-blue-600 group-hover:text-cyan-600",
    clockLabel: "text-slate-400",
    clockValue: "text-slate-600 bg-slate-100 border-slate-200",
    btnGhost: "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900",
    btnPremium:
      "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-300",
    btnPrimary:
      "bg-gradient-to-r from-[#2563EB] to-[#312E81] hover:from-[#3b82f6] hover:to-[#2563EB] shadow-blue-300",

    segWrap: "bg-slate-100 border-slate-200",
    segIdle: "text-slate-500 hover:text-slate-900",
    nextUpBanner: "bg-indigo-50 border-indigo-200",
    nextUpLabel: "text-indigo-600",
    chapterWrap: "bg-white border-slate-200 shadow-sm",
    chapterHover: "hover:bg-slate-50",
    numDone: "bg-emerald-100 text-emerald-700",
    numIdle: "bg-indigo-100 text-indigo-700",

    tabActive:
      "bg-gradient-to-r from-[#312E81] to-[#2563EB] border-[#2563EB]/50 text-white shadow-lg shadow-[#2563EB]/20 scale-[1.01]",
    tabIdle:
      "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 shadow-sm",
    tabIconIdle: "text-slate-500",
    tabCountIdle: "bg-slate-100 text-slate-600",

    statSolid: "bg-white border-slate-200 shadow-sm",
    iconBlue: "bg-blue-50 text-blue-600 border-blue-200",
    iconEmerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    iconAmber: "bg-amber-50 text-amber-600 border-amber-200",
    iconPurple: "bg-purple-50 text-purple-600 border-purple-200",
  },
};

/* ------------------------------------------------------------------ */
/*  Registry                                                           */
/* ------------------------------------------------------------------ */
export const THEMES: Record<ThemeId, Theme> = {
  AnushivaDefault: anushivaDefault,
  AnushivaLight: anushivaLight,
};

export const THEME_LIST: Theme[] = [anushivaDefault, anushivaLight];
export const DEFAULT_THEME_ID: ThemeId = "AnushivaDefault";
export const THEME_STORAGE_KEY = "anushiva-theme";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && value in THEMES;
}