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

// ---------------------------------------------------------------------------
// Notes section (RevisionNotesTree + FocusReader).
// In AnushivaLight these are the ORIGINAL warm classes (unchanged look).
// In AnushivaDefault they give the notes pages the same dark look as the rest.
// ---------------------------------------------------------------------------
export interface NotesAccent {
  text: string;
  bar: string;
  border: string;
  hl: string;
  badge: string;
}

export interface NotesTokens {
  // content style system ({red}..{/red}, [NOTE]..[/NOTE] etc.)
  accents: Record<string, NotesAccent>;
  callouts: Record<string, { box: string; title: string }>;

  // text scale (replaces text-slate-900 ... text-slate-300)
  ink900: string;
  ink800: string;
  ink700: string;
  ink600: string;
  ink500: string;
  ink400: string;
  ink300: string;

  // border colors
  b50: string;
  b100: string;
  b200: string;
  b300: string;
  bStone100: string;
  bStone200: string;

  // normal (non-focus) view surfaces
  bar: string;
  card: string;
  cardBorder: string;
  cardBorderDone: string;
  chapHead: string;
  chapBody: string;
  idxPane: string;
  idxActive: string;
  idxIdle: string;
  pillBtn: string;
  pane: string;
  contentBox: string;
  phaseBox: string;
  emptyCard: string;
  loadCard: string;
  track: string;
  trackStone: string;
  trackStone2: string;
  subjectBadge: Record<"reasoning" | "quant" | "english" | "other", string>;

  // controls
  chipWrap: string;
  chipBtn: string;
  segActive: string;
  segIdle: string;
  tabIdle: string;
  tabIconActive: string;
  tabIconIdle: string;
  exitBtn: string;
  iconBtn: string;
  iconBtnSoft: string;
  closeBtn: string;

  // focus reader
  focusRoot: string;
  focusHeader: string;
  sectionTabIdle: string;
  popover: string;
  popFooter: string;
  kbd: string;
  aiIdle: string;
  navAside: string;
  searchInput: string;
  rowHover: string;
  rowActive: string;
  checkOff: string;
  checkOffPlain: string;
  handleLine: string;
  handleGrip: string;
  article: string;
  navCard: string;
  nextCard: string;
  nextLabel: string;

  // status colors
  doneText: string;
  amberText: string;
  amberStrong: string;
  planChip: string;
  chBadge: string;
  chBadgeDone: string;
  pill: string;
  doneBtn: string;
  undoneBtn: string;
  undoneBtnSoft: string;
  doneIcon: string;
  doneIconFill: string;
  todoIcon: string;
  notice: string;
  testBox: string;
  testBoxSoft: string;
  testLabel: string;

  // content renderer pieces
  collapsibleWrap: string;
  collapsibleBtn: string;
  stepCard: string;
  stepNum: string;
  timelineLine: string;
  timelineDot: string;
  timelineLabel: string;
  checklistBox: string;
  checklistTitle: string;
  colBox: string;
  quoteBox: string;
  exampleBox: string;
  exampleTitle: string;
  questionBox: string;
  questionTitle: string;
  motivationBox: string;
  motivationTitle: string;
  motivationIcon: string;
  motivationText: string;
  mark: string;
  latex: string;
  code: string;
  tableWrap: string;
  tableHead: string;
  th: string;
  tr: string;
  td: string;
  hr: string;
  quoteBlock: string;
  imgWrap: string;
  imgMissing: string;
  bulletPlus: string;
  bulletMinus: string;
  bulletArrow: string;
  bulletStar: string;
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
    logoutButton: string;
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

  // Notes section (RevisionNotesTree + FocusReader)
  notes: NotesTokens;
}

/* ------------------------------------------------------------------ */
/*  AnushivaDefault  (the current dark-navy + blue theme)              */
/* ------------------------------------------------------------------ */
const anushivaDefault: Theme = {
  id: "AnushivaDefault",
  name: "Anushiva Default",
  mode: "dark",

  page: "bg-[#0F172A] text-[#F8FAFC]",
  pageNotes: "bg-[#0F172A] text-[#F8FAFC]", // notes are dark too in the dark theme
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
    barBorderNotes: "border-slate-800",
    tabAssessActive: "border-blue-500 text-blue-400",
    tabAssessIdle: "border-transparent text-slate-400 hover:text-slate-200",
    tabNotesActive: "border-amber-500 text-amber-400",
    tabNotesIdle: "border-transparent text-slate-400 hover:text-slate-200",
    tabCurrentAffairs: "border-transparent text-slate-400 hover:text-emerald-400",
    backToDashboard: "text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700",
    lockOverlay: "bg-slate-950/80 border-amber-500/30 hover:bg-slate-950/70",
    lockIcon: "bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-black/60",
    lockBadge: "text-amber-400 bg-slate-900 border-slate-800",
    logoutButton:
      "border-slate-800 bg-slate-900 text-slate-400 hover:border-red-900/50 hover:text-red-400 hover:bg-red-950/40",
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

  notes: {
    accents: {
      red:    { text: "text-red-400",     bar: "bg-red-500",     border: "border-red-500/40",     hl: "bg-red-500/20 text-red-100 border-b border-red-500/40",             badge: "bg-red-500/10 text-red-300 border-red-500/30" },
      green:  { text: "text-emerald-400", bar: "bg-emerald-500", border: "border-emerald-500/40", hl: "bg-emerald-500/20 text-emerald-100 border-b border-emerald-500/40", badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
      blue:   { text: "text-blue-400",    bar: "bg-blue-500",    border: "border-blue-500/40",    hl: "bg-blue-500/20 text-blue-100 border-b border-blue-500/40",          badge: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
      purple: { text: "text-purple-400",  bar: "bg-purple-500",  border: "border-purple-500/40",  hl: "bg-purple-500/20 text-purple-100 border-b border-purple-500/40",    badge: "bg-purple-500/10 text-purple-300 border-purple-500/30" },
      orange: { text: "text-orange-400",  bar: "bg-orange-500",  border: "border-orange-500/40",  hl: "bg-orange-500/20 text-orange-100 border-b border-orange-500/40",    badge: "bg-orange-500/10 text-orange-300 border-orange-500/30" },
      pink:   { text: "text-pink-400",    bar: "bg-pink-500",    border: "border-pink-500/40",    hl: "bg-pink-500/20 text-pink-100 border-b border-pink-500/40",          badge: "bg-pink-500/10 text-pink-300 border-pink-500/30" },
      teal:   { text: "text-teal-400",    bar: "bg-teal-500",    border: "border-teal-500/40",    hl: "bg-teal-500/20 text-teal-100 border-b border-teal-500/40",          badge: "bg-teal-500/10 text-teal-300 border-teal-500/30" },
      indigo: { text: "text-indigo-400",  bar: "bg-indigo-500",  border: "border-indigo-500/40",  hl: "bg-indigo-500/20 text-indigo-100 border-b border-indigo-500/40",    badge: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30" },
      amber:  { text: "text-amber-400",   bar: "bg-amber-500",   border: "border-amber-500/40",   hl: "bg-amber-500/20 text-amber-100 border-b border-amber-500/40",       badge: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
      gray:   { text: "text-slate-400",   bar: "bg-slate-500",   border: "border-slate-600",      hl: "bg-slate-700 text-slate-100 border-b border-slate-600",             badge: "bg-slate-800 text-slate-300 border-slate-700" },
    },
    callouts: {
      NOTE:       { box: "bg-slate-800/50 border-slate-700 border-l-slate-400",          title: "text-slate-300" },
      TIP:        { box: "bg-emerald-500/10 border-emerald-500/30 border-l-emerald-500", title: "text-emerald-300" },
      WARNING:    { box: "bg-rose-500/10 border-rose-500/30 border-l-rose-500",          title: "text-rose-300" },
      IMPORTANT:  { box: "bg-orange-500/10 border-orange-500/30 border-l-orange-500",    title: "text-orange-300" },
      FORMULA:    { box: "bg-indigo-500/10 border-indigo-500/30 border-l-indigo-500",    title: "text-indigo-300" },
      TRICK:      { box: "bg-teal-500/10 border-teal-500/30 border-l-teal-500",          title: "text-teal-300" },
      REMEMBER:   { box: "bg-yellow-500/10 border-yellow-500/30 border-l-yellow-500",    title: "text-yellow-300" },
      DEFINITION: { box: "bg-cyan-500/10 border-cyan-500/30 border-l-cyan-500",          title: "text-cyan-300" },
      MNEMONIC:   { box: "bg-fuchsia-500/10 border-fuchsia-500/30 border-l-fuchsia-500", title: "text-fuchsia-300" },
      PYQ:        { box: "bg-slate-800/60 border-slate-600 border-l-slate-300",          title: "text-slate-300" },
      SUMMARY:    { box: "bg-sky-500/10 border-sky-500/30 border-l-sky-500",             title: "text-sky-300" },
      KEYPOINTS:  { box: "bg-blue-500/10 border-blue-500/30 border-l-blue-500",          title: "text-blue-300" },
      SOLUTION:   { box: "bg-green-500/10 border-green-500/30 border-l-green-500",       title: "text-green-300" },
      MISTAKE:    { box: "bg-red-500/10 border-red-500/30 border-l-red-500",             title: "text-red-300" },
      FUN:        { box: "bg-violet-500/10 border-violet-500/30 border-l-violet-500",    title: "text-violet-300" },
    },

    ink900: "text-slate-100",
    ink800: "text-slate-200",
    ink700: "text-slate-300",
    ink600: "text-slate-400",
    ink500: "text-slate-400",
    ink400: "text-slate-500",
    ink300: "text-slate-600",

    b50: "border-slate-800",
    b100: "border-slate-800",
    b200: "border-slate-800",
    b300: "border-slate-700",
    bStone100: "border-slate-800",
    bStone200: "border-slate-800",

    bar: "bg-slate-900/60 border-slate-800",
    card: "bg-slate-900/60",
    cardBorder: "border-slate-800",
    cardBorderDone: "border-emerald-500/40",
    chapHead: "bg-slate-800/30 hover:bg-slate-800/60",
    chapBody: "border-slate-800 bg-slate-900/40",
    idxPane: "bg-slate-950/40 border-slate-800",
    idxActive: "bg-slate-800 border-slate-700 font-bold text-slate-100",
    idxIdle: "border-transparent text-slate-400 hover:bg-slate-800/60",
    pillBtn: "bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700",
    pane: "bg-transparent",
    contentBox: "text-slate-200 bg-slate-950/40 border-slate-800",
    phaseBox: "bg-slate-900/30 border-slate-800",
    emptyCard: "bg-slate-900/60 border-slate-700",
    loadCard: "bg-slate-900/60 border-slate-800",
    track: "bg-slate-800 border-slate-700/60",
    trackStone: "bg-slate-800 border-slate-700/70",
    trackStone2: "bg-slate-800",
    subjectBadge: {
      reasoning: "bg-blue-500/10 text-blue-300 border-blue-500/30",
      quant: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
      english: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
      other: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    },

    chipWrap: "bg-slate-800/60 border-slate-700",
    chipBtn: "text-slate-300 hover:bg-slate-700",
    segActive: "bg-slate-100 text-slate-900 shadow-sm",
    segIdle: "text-slate-400 hover:text-slate-100",
    tabIdle: "bg-transparent text-slate-400 hover:bg-slate-800",
    tabIconActive: "text-amber-600",
    tabIconIdle: "text-slate-500",
    exitBtn: "text-slate-300 hover:text-white bg-slate-800/60 border-slate-700",
    iconBtn: "text-slate-400 hover:bg-slate-800",
    iconBtnSoft: "text-slate-400 hover:bg-slate-800",
    closeBtn: "text-slate-400 hover:bg-slate-800",

    focusRoot: "bg-[#0F172A] text-slate-200",
    focusHeader: "border-slate-800 bg-[#0F172A]/90",
    sectionTabIdle: "text-slate-400 hover:bg-slate-800",
    popover: "border-slate-700 bg-slate-900 shadow-lg text-slate-300",
    popFooter: "border-slate-800 text-slate-500",
    kbd: "border-slate-600 bg-slate-800 text-slate-200",
    aiIdle: "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20",
    navAside: "bg-slate-900 border-slate-800",
    searchInput:
      "bg-slate-800/60 border-slate-700 placeholder-slate-500 focus:border-amber-400 focus:bg-slate-800",
    rowHover: "hover:bg-slate-800/60",
    rowActive: "bg-amber-500/10 border-amber-500",
    checkOff: "bg-slate-800 border-slate-600 hover:border-emerald-400",
    checkOffPlain: "bg-slate-800 border-slate-600",
    handleLine:
      "bg-slate-700 group-hover:w-0.5 group-hover:bg-amber-400 group-focus-visible:w-0.5 group-focus-visible:bg-amber-500",
    handleGrip: "bg-slate-600 group-hover:bg-amber-400 group-focus-visible:bg-amber-500",
    article: "bg-slate-900/60 border-slate-800 shadow-sm text-slate-200",
    navCard: "border-slate-800 bg-slate-900/60 hover:border-slate-700",
    nextCard: "bg-amber-500 text-slate-950 hover:bg-amber-400",
    nextLabel: "text-amber-900",

    doneText: "text-emerald-400",
    amberText: "text-amber-400",
    amberStrong: "text-amber-400",
    planChip: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    chBadge: "text-slate-300 bg-slate-800 border-slate-700",
    chBadgeDone: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    pill: "text-slate-400 bg-slate-800/60 border-slate-700",
    doneBtn: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    undoneBtn:
      "bg-slate-800/60 text-slate-300 border-slate-700 hover:border-emerald-500/50 hover:text-emerald-300",
    undoneBtnSoft: "bg-slate-800/60 text-slate-300 hover:bg-slate-700 border-slate-700",
    doneIcon: "text-emerald-400",
    doneIconFill: "text-emerald-400 fill-emerald-500/20",
    todoIcon: "text-slate-600",
    notice: "text-amber-300 bg-amber-500/10 border-amber-500/30",
    testBox: "border-indigo-500/30 bg-indigo-500/10",
    testBoxSoft: "border-indigo-500/30 bg-indigo-500/10",
    testLabel: "text-indigo-300",

    collapsibleWrap: "border-slate-700 bg-slate-800/50",
    collapsibleBtn: "bg-slate-800 hover:bg-slate-700 text-slate-100",
    stepCard: "border-slate-700 bg-slate-800/60",
    stepNum: "bg-amber-500 text-slate-950",
    timelineLine: "border-amber-500/50",
    timelineDot: "bg-slate-900 border-amber-500",
    timelineLabel: "text-amber-400",
    checklistBox: "border-emerald-500/30 bg-emerald-500/10",
    checklistTitle: "text-emerald-400",
    colBox: "border-slate-700 bg-slate-800/60",
    quoteBox: "border-amber-500 bg-amber-500/10",
    exampleBox: "bg-blue-500/10 border-blue-500/30 text-slate-200",
    exampleTitle: "text-blue-300",
    questionBox: "bg-purple-500/10 border-purple-500/30 text-slate-200",
    questionTitle: "text-purple-300",
    motivationBox: "bg-amber-500/10 border-amber-500/30 text-slate-100",
    motivationTitle: "text-amber-300",
    motivationIcon: "text-amber-400",
    motivationText: "text-amber-100",
    mark: "bg-amber-500/20 text-amber-100 border-amber-500/40",
    latex: "text-slate-100 bg-slate-800/60 border-slate-700/40",
    code: "bg-slate-800 text-slate-100 border-slate-700/60",
    tableWrap: "border-slate-700",
    tableHead: "bg-slate-800 border-slate-700",
    th: "text-slate-200 border-slate-700",
    tr: "border-slate-800 hover:bg-slate-800/40",
    td: "text-slate-200 border-slate-800",
    hr: "border-slate-700",
    quoteBlock: "border-slate-600 text-slate-300 bg-slate-800/40",
    imgWrap: "border-slate-700 bg-slate-800",
    imgMissing: "text-rose-300 bg-rose-500/10 border-rose-500/30",
    bulletPlus: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    bulletMinus: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    bulletArrow: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    bulletStar: "bg-amber-500/15 text-amber-300 border-amber-500/30",
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
    logoutButton:
      "border-slate-200 bg-white text-slate-500 hover:border-red-300 hover:text-red-600 hover:bg-red-50",
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

  // ORIGINAL warm notes classes: the Light notes look is unchanged.
  notes: {
    accents: {
      red:    { text: "text-red-600",     bar: "bg-red-500",     border: "border-red-300",     hl: "bg-red-100 text-red-950 border-b border-red-200",             badge: "bg-red-50 text-red-700 border-red-200" },
      green:  { text: "text-emerald-600", bar: "bg-emerald-500", border: "border-emerald-300", hl: "bg-emerald-100 text-emerald-950 border-b border-emerald-200", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      blue:   { text: "text-blue-600",    bar: "bg-blue-500",    border: "border-blue-300",    hl: "bg-blue-100 text-blue-950 border-b border-blue-200",          badge: "bg-blue-50 text-blue-700 border-blue-200" },
      purple: { text: "text-purple-600",  bar: "bg-purple-500",  border: "border-purple-300",  hl: "bg-purple-100 text-purple-950 border-b border-purple-200",    badge: "bg-purple-50 text-purple-700 border-purple-200" },
      orange: { text: "text-orange-600",  bar: "bg-orange-500",  border: "border-orange-300",  hl: "bg-orange-100 text-orange-950 border-b border-orange-200",    badge: "bg-orange-50 text-orange-700 border-orange-200" },
      pink:   { text: "text-pink-600",    bar: "bg-pink-500",    border: "border-pink-300",    hl: "bg-pink-100 text-pink-950 border-b border-pink-200",          badge: "bg-pink-50 text-pink-700 border-pink-200" },
      teal:   { text: "text-teal-600",    bar: "bg-teal-500",    border: "border-teal-300",    hl: "bg-teal-100 text-teal-950 border-b border-teal-200",          badge: "bg-teal-50 text-teal-700 border-teal-200" },
      indigo: { text: "text-indigo-600",  bar: "bg-indigo-500",  border: "border-indigo-300",  hl: "bg-indigo-100 text-indigo-950 border-b border-indigo-200",    badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
      amber:  { text: "text-amber-600",   bar: "bg-amber-500",   border: "border-amber-300",   hl: "bg-amber-100 text-amber-950 border-b border-amber-200",       badge: "bg-amber-50 text-amber-700 border-amber-200" },
      gray:   { text: "text-slate-500",   bar: "bg-slate-400",   border: "border-slate-300",   hl: "bg-slate-200 text-slate-900 border-b border-slate-300",       badge: "bg-slate-100 text-slate-700 border-slate-200" },
    },
    callouts: {
      NOTE:       { box: "bg-slate-50/70 border-slate-200 border-l-slate-500",           title: "text-slate-600" },
      TIP:        { box: "bg-emerald-50/60 border-emerald-200 border-l-emerald-500",     title: "text-emerald-700" },
      WARNING:    { box: "bg-rose-50/60 border-rose-200 border-l-rose-500",              title: "text-rose-700" },
      IMPORTANT:  { box: "bg-orange-50/60 border-orange-200 border-l-orange-500",        title: "text-orange-700" },
      FORMULA:    { box: "bg-indigo-50/60 border-indigo-200 border-l-indigo-500",        title: "text-indigo-700" },
      TRICK:      { box: "bg-teal-50/60 border-teal-200 border-l-teal-500",              title: "text-teal-700" },
      REMEMBER:   { box: "bg-yellow-50/70 border-yellow-200 border-l-yellow-500",        title: "text-yellow-700" },
      DEFINITION: { box: "bg-cyan-50/60 border-cyan-200 border-l-cyan-500",              title: "text-cyan-700" },
      MNEMONIC:   { box: "bg-fuchsia-50/60 border-fuchsia-200 border-l-fuchsia-500",     title: "text-fuchsia-700" },
      PYQ:        { box: "bg-stone-100/80 border-stone-300 border-l-stone-800",          title: "text-stone-700" },
      SUMMARY:    { box: "bg-sky-50/60 border-sky-200 border-l-sky-500",                 title: "text-sky-700" },
      KEYPOINTS:  { box: "bg-blue-50/60 border-blue-200 border-l-blue-500",              title: "text-blue-700" },
      SOLUTION:   { box: "bg-green-50/60 border-green-200 border-l-green-500",           title: "text-green-700" },
      MISTAKE:    { box: "bg-red-50/60 border-red-200 border-l-red-500",                 title: "text-red-700" },
      FUN:        { box: "bg-violet-50/60 border-violet-200 border-l-violet-500",        title: "text-violet-700" },
    },

    ink900: "text-slate-900",
    ink800: "text-slate-800",
    ink700: "text-slate-700",
    ink600: "text-slate-600",
    ink500: "text-slate-500",
    ink400: "text-slate-400",
    ink300: "text-slate-300",

    b50: "border-slate-50",
    b100: "border-slate-100",
    b200: "border-slate-200",
    b300: "border-slate-300",
    bStone100: "border-stone-100",
    bStone200: "border-stone-200",

    bar: "bg-white border-slate-200 shadow-xs",
    card: "bg-white shadow-xs",
    cardBorder: "border-slate-200",
    cardBorderDone: "border-emerald-200",
    chapHead: "bg-slate-50/40 hover:bg-slate-50",
    chapBody: "border-slate-100 bg-white",
    idxPane: "bg-stone-50/40 border-slate-100",
    idxActive: "bg-white border-slate-200 shadow-2xs font-bold text-slate-900",
    idxIdle: "border-transparent text-slate-600 hover:bg-slate-100",
    pillBtn: "bg-white border-slate-200 shadow-xs text-slate-600 hover:text-stone-900 hover:bg-slate-50",
    pane: "bg-white",
    contentBox: "text-slate-800 bg-stone-50/30 border-stone-100/60",
    phaseBox: "bg-[#f8fafc]/50 border-slate-100",
    emptyCard: "bg-white border-slate-300 shadow-xs",
    loadCard: "bg-white border-slate-200 shadow-xs",
    track: "bg-slate-100 border-slate-200/60",
    trackStone: "bg-stone-100 border-stone-200/70",
    trackStone2: "bg-stone-100",
    subjectBadge: {
      reasoning: "bg-blue-100 text-blue-800 border-blue-200",
      quant: "bg-indigo-100 text-indigo-800 border-indigo-200",
      english: "bg-emerald-100 text-emerald-800 border-emerald-200",
      other: "bg-amber-100 text-amber-900 border-amber-200",
    },

    chipWrap: "bg-stone-50 border-stone-200",
    chipBtn: "text-slate-600 hover:bg-white",
    segActive: "bg-stone-950 text-white shadow-sm",
    segIdle: "text-slate-500 hover:text-stone-900",
    tabIdle: "bg-white text-slate-600 hover:bg-slate-50",
    tabIconActive: "text-amber-400",
    tabIconIdle: "text-slate-400",
    exitBtn: "text-stone-600 hover:text-stone-900 bg-stone-50 border-stone-200",
    iconBtn: "text-stone-600 hover:bg-stone-100",
    iconBtnSoft: "text-stone-500 hover:bg-stone-100",
    closeBtn: "text-slate-500 hover:bg-stone-100",

    focusRoot: "bg-[#FBF9F4] text-slate-800",
    focusHeader: "border-stone-200 bg-white/90",
    sectionTabIdle: "text-slate-600 hover:bg-stone-100",
    popover: "border-stone-200 bg-white shadow-lg text-slate-600",
    popFooter: "border-stone-100 text-slate-400",
    kbd: "border-slate-300 bg-slate-50 text-slate-800",
    aiIdle: "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100",
    navAside: "bg-white border-stone-200",
    searchInput:
      "bg-stone-50 border-stone-200 focus:border-amber-400 focus:bg-white",
    rowHover: "hover:bg-stone-50",
    rowActive: "bg-amber-50 border-amber-500",
    checkOff: "bg-white border-slate-300 hover:border-emerald-400",
    checkOffPlain: "bg-white border-slate-300",
    handleLine:
      "bg-stone-200 group-hover:w-0.5 group-hover:bg-amber-400 group-focus-visible:w-0.5 group-focus-visible:bg-amber-500",
    handleGrip: "bg-stone-300 group-hover:bg-amber-400 group-focus-visible:bg-amber-500",
    article: "bg-white border-stone-200 shadow-sm text-slate-800",
    navCard: "border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm",
    nextCard: "bg-stone-950 text-white hover:bg-stone-800",
    nextLabel: "text-amber-400",

    doneText: "text-emerald-600",
    amberText: "text-amber-600",
    amberStrong: "text-amber-700",
    planChip: "bg-amber-500/10 border-amber-500/20 text-amber-600",
    chBadge: "text-slate-700 bg-white border-slate-200",
    chBadgeDone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    pill: "text-slate-500 bg-white border-stone-200",
    doneBtn: "bg-emerald-50 text-emerald-700 border-emerald-200",
    undoneBtn:
      "bg-white text-slate-600 border-stone-200 hover:border-emerald-300 hover:text-emerald-700",
    undoneBtnSoft: "bg-white text-slate-600 hover:bg-slate-50 border-slate-200",
    doneIcon: "text-emerald-600",
    doneIconFill: "text-emerald-600 fill-emerald-100",
    todoIcon: "text-slate-300",
    notice: "text-amber-700 bg-amber-50 border-amber-200",
    testBox: "border-indigo-100 bg-indigo-50/40",
    testBoxSoft: "border-indigo-100 bg-indigo-50/30",
    testLabel: "text-indigo-600",

    collapsibleWrap: "border-slate-200 bg-white",
    collapsibleBtn: "bg-slate-50 hover:bg-slate-100 text-slate-800",
    stepCard: "border-slate-200 bg-white shadow-3xs",
    stepNum: "bg-stone-950 text-amber-400",
    timelineLine: "border-amber-300",
    timelineDot: "bg-white border-amber-500",
    timelineLabel: "text-amber-700",
    checklistBox: "border-emerald-100 bg-emerald-50/30",
    checklistTitle: "text-emerald-700",
    colBox: "border-slate-200 bg-white",
    quoteBox: "border-amber-400 bg-amber-50/30",
    exampleBox: "bg-blue-50/40 border-blue-100/60 text-slate-800",
    exampleTitle: "text-blue-700",
    questionBox: "bg-purple-50/40 border-purple-100/60 text-slate-800",
    questionTitle: "text-purple-700",
    motivationBox: "bg-amber-50/60 border-amber-200/70 text-slate-900 shadow-3xs",
    motivationTitle: "text-amber-800",
    motivationIcon: "text-amber-600",
    motivationText: "text-amber-950",
    mark: "bg-amber-100 text-amber-950 border-amber-200",
    latex: "text-slate-900 bg-slate-50/60 border-slate-200/40",
    code: "bg-slate-100 text-slate-900 border-slate-200/60",
    tableWrap: "border-slate-200 shadow-3xs",
    tableHead: "bg-slate-50 border-slate-200",
    th: "text-slate-700 border-slate-200",
    tr: "border-slate-150 hover:bg-slate-50/50",
    td: "text-slate-800 border-slate-150",
    hr: "border-slate-200/80",
    quoteBlock: "border-slate-300 text-slate-700 bg-slate-50/40",
    imgWrap: "border-slate-200 bg-white",
    imgMissing: "text-rose-500 bg-rose-50 border-rose-100",
    bulletPlus: "bg-emerald-100 text-emerald-700 border-emerald-200",
    bulletMinus: "bg-rose-100 text-rose-700 border-rose-200",
    bulletArrow: "bg-blue-100 text-blue-700 border-blue-200",
    bulletStar: "bg-amber-100 text-amber-700 border-amber-200",
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