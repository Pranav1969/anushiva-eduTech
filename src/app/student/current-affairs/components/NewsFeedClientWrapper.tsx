//src\app\student\current-affairs\components\NewsFeedClientWrapper.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Bookmark, 
  Calendar, 
  ExternalLink, 
  Globe, 
  Sparkles, 
  Search,
  BookOpen,
  Building2,
  TrendingUp,
  Loader2,
  Clock,
  CheckCircle2,
  Layers,
  Lock,
  Compass
} from "lucide-react";
import { authManager, StudentSession } from "@/utils/auth";
import PlanUpgradeModal from "../../components/PlanUpgradeModal";

interface NewsCapsule {
  id: string;
  source_type: "rbi" | "pib" | "economy";
  category_tag: string;
  original_date: string;
  source_url: string;
  read_time: string;
  required_plan: "free" | "silver" | "gold" | "premium";
  title: {
    en: string;
    mr: string;
    hi: string;
  };
  summary: {
    en: string;
    mr: string;
    hi: string;
  };
}

interface NewsFeedClientWrapperProps {
  initialFeed: NewsCapsule[];
}

export default function NewsFeedClientWrapper({ initialFeed }: NewsFeedClientWrapperProps) {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null);
  
  // UI State Controls
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "mr" | "hi">("en");
  const [activeFilter, setActiveFilter] = useState<"all" | "rbi" | "pib" | "economy">("all");
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]); 
  const [searchQuery, setSearchQuery] = useState("");

  // Upgrade Modal Tracking
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [selectedRequiredPlan, setSelectedRequiredPlan] = useState("premium");

  useEffect(() => {
  if (initialFeed.length === 0) {
    const interval = setInterval(() => {
      router.refresh(); 
    }, 5000); // Polls every 5 seconds until data is found
    return () => clearInterval(interval);
  }
}, [initialFeed, router]);

  useEffect(() => {
    const session = authManager.getSession();
    if (!session) {
      router.push("/student/login");
    } else {
      setStudent(session);
    }
  }, [router]);

  const checkIsLocked = (requiredPlan: "free" | "silver" | "gold" | "premium") => {
    if (!student) return true;
    
    const studentPlan = (student as any).current_plan || "free";
    const normalizedStudent = studentPlan.toLowerCase() as "free" | "silver" | "gold" | "premium";
    const normalizedRequired = requiredPlan.toLowerCase() as "free" | "silver" | "gold" | "premium";

    const PLAN_HIERARCHY_MAP = { free: 1, silver: 2, gold: 3, premium: 4 };
    const studentWeight = PLAN_HIERARCHY_MAP[normalizedStudent] || 1;
    const requiredWeight = PLAN_HIERARCHY_MAP[normalizedRequired] || 1;

    return studentWeight < requiredWeight;
  };

  const handleToggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedIds(prev => 
      prev.includes(id) ? prev.filter(bId => bId !== id) : [...prev, id]
    );
  };

  const handleCardInteraction = (capsule: NewsCapsule) => {
    const isLocked = checkIsLocked(capsule.required_plan);

    if (isLocked) {
      setSelectedRequiredPlan(capsule.required_plan);
      setIsUpgradeOpen(true);
      return;
    }

    setReadIds(prev => 
      prev.includes(capsule.id) ? prev.filter(rId => rId !== capsule.id) : [...prev, capsule.id]
    );
  };

  const filteredNews = initialFeed.filter(item => {
    const matchesFilter = activeFilter === "all" || item.source_type === activeFilter;
    const currentTitle = (item.title[selectedLanguage] || "").toLowerCase();
    const currentSummary = (item.summary[selectedLanguage] || "").toLowerCase();
    const matchesSearch = currentTitle.includes(searchQuery.toLowerCase()) || currentSummary.includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (!student) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F19] text-[#E2E8F0] font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-400">
      
      {/* GLOBAL TOP NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0B0F19]/80 border-b border-slate-800/60 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push("/student")}
              className="p-2 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 rounded-xl text-slate-400 hover:text-white transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  Focus Feed
                </h1>
                <span className="hidden sm:inline-flex bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">Anushiva AI Engine</span>
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 bg-slate-900/40 px-3 py-1.5 rounded-full border border-slate-800/50">
            <span className="font-medium text-emerald-400">{readIds.length}/{initialFeed.length} Read</span>
            <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-1.5 transition-all duration-300" 
                style={{ width: `${initialFeed.length > 0 ? (readIds.length / initialFeed.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* CORE FRAMEWORK INTERACTIVE SPLIT HUB */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: INTERACTIVE CONTROLS DOCK */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-5 h-fit">
          
          {/* SEARCH SYSTEM MODULE */}
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Search Capsule Index</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Type dynamic keywords..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800/80 text-sm rounded-xl pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          {/* ENGINE SOURCE SEGREGATORS */}
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Knowledge Matrix</label>
            <div className="flex flex-col gap-1.5">
              {[
                { id: "all", label: "All Aggregates", icon: Layers },
                { id: "rbi", label: "Reserve Bank Directives", icon: Building2 },
                { id: "pib", label: "PIB Finance Press", icon: BookOpen },
                { id: "economy", label: "Macro Economic Trends", icon: TrendingUp }
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id as any)}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-xs font-medium border text-left transition-all ${
                      isSelected
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-md shadow-emerald-500/10"
                        : "bg-slate-950/50 text-slate-400 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DYNAMIC MULTILINGUAL ACCORDION BAR */}
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 space-y-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Globe className="w-3.5 h-3.5" />
              <label className="text-xs font-semibold uppercase tracking-wider block">Translation Layer</label>
            </div>
            <div className="grid grid-cols-3 bg-slate-950 p-1 border border-slate-800 rounded-xl shadow-inner">
              {[
                { code: "en", label: "English" },
                { code: "hi", label: "हिंदी" },
                { code: "mr", label: "मराठी" }
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code as "en" | "mr" | "hi")}
                  className={`py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                    selectedLanguage === lang.code 
                      ? "bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/50 font-extrabold" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: READ-OPTIMIZED LIST */}
        <section className="lg:col-span-8 space-y-6">
          {initialFeed.length === 0 ? (
            <div className="border border-dashed border-slate-800/80 rounded-2xl p-16 text-center bg-slate-950/20 max-w-2xl mx-auto flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <Compass className="w-10 h-10 text-emerald-500/50 animate-spin duration-[3000ms]" />
                <Sparkles className="w-4 h-4 text-emerald-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-200">Preparing Exam Capsules</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                  The AI Engine is currently parsing the latest updates from RBI, PIB, and Economic Times. Your study feed will refresh automatically.
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-full text-[10px] text-slate-400">
                <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />
                <span>Synchronizing live database indices...</span>
              </div>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="border border-dashed border-slate-800 rounded-2xl p-16 text-center text-slate-500 text-sm">
              No automated capsules found matching the search criteria.
            </div>
          ) : (
            filteredNews.map((capsule) => {
              const isBookmarked = bookmarkedIds.includes(capsule.id);
              const isRead = readIds.includes(capsule.id);
              const isLocked = checkIsLocked(capsule.required_plan);
              
              return (
                <article 
                  key={capsule.id}
                  onClick={() => handleCardInteraction(capsule)}
                  className={`group relative bg-slate-900/10 border rounded-2xl p-6 md:p-8 hover:bg-slate-900/20 transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                    isLocked ? "border-amber-500/30 bg-amber-500/[0.01]" : isRead ? "border-slate-800/40 opacity-60" : "border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/40 transition-all" />

                  {/* Card Meta Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                        capsule.source_type === "rbi" ? "bg-amber-500/5 text-amber-400 border-amber-500/20" :
                        capsule.source_type === "pib" ? "bg-blue-500/5 text-blue-400 border-blue-500/20" :
                        "bg-purple-500/5 text-purple-400 border-purple-500/20"
                      }`}>
                        {capsule.source_type}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-md border border-slate-800/60">
                        {capsule.category_tag}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{capsule.original_date}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 border-l border-slate-800 pl-3">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{capsule.read_time}</span>
                      </div>
                      
                      {!isLocked && (
                        <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2">
                          <button 
                            onClick={(e) => handleToggleBookmark(capsule.id, e)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isBookmarked 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                                : "bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-emerald-400" : ""}`} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Core High-Yield Content */}
                  <div className="space-y-4 relative">
                    {isLocked ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider mb-1">
                          <Lock className="w-3 h-3" /> Locked content for {capsule.required_plan} subscribers
                        </div>
                        <h2 className="text-base md:text-lg font-bold text-slate-300 blur-[4px] select-none">
                          {capsule.title[selectedLanguage] || "Sample Locked Headline Title Info"}
                        </h2>
                        <p className="text-sm text-slate-500 blur-[6px] select-none leading-relaxed">
                          Placeholder summary of dynamic information and structured regulatory notifications which require an upgraded student tier subscription.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h2 className="text-base md:text-lg font-bold text-slate-100 tracking-tight leading-snug group-hover:text-white transition-colors">
                          {capsule.title[selectedLanguage]}
                        </h2>
                        
                        <p className="text-sm text-slate-400 leading-relaxed font-normal whitespace-pre-line select-text">
                          {capsule.summary[selectedLanguage]}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Lower Controls Layer */}
                  <div className="mt-6 pt-4 border-t border-slate-900/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {isLocked ? (
                        <span className="text-amber-400/80 font-semibold text-[11px] uppercase tracking-wider group-hover:text-amber-400 transition-colors">
                          Click card to unlock {capsule.required_plan} &rarr;
                        </span>
                      ) : isRead ? (
                        <span className="flex items-center gap-1 text-emerald-500 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Finished Reading
                        </span>
                      ) : (
                        <span className="text-slate-500 group-hover:text-slate-400 transition-colors">
                          Click card to mark as read
                        </span>
                      )}
                    </div>

                    {!isLocked && (
                      <a 
                        href={capsule.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-emerald-400 uppercase tracking-wider transition-colors"
                      >
                        Verify Apex Circular <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>

      </div>

      <PlanUpgradeModal 
        isOpen={isUpgradeOpen} 
        onClose={() => setIsUpgradeOpen(false)} 
        requiredPlan={selectedRequiredPlan} 
      />
    </main>
  );
}