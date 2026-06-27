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
  Layers
} from "lucide-react";
import { authManager, StudentSession } from "@/utils/auth";

interface NewsCapsule {
  id: string;
  source_type: "rbi" | "pib" | "economy";
  category_tag: string;
  original_date: string;
  source_url: string;
  read_time: string; // Added for student engagement tracking
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

export default function CurrentAffairsDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null);
  
  // UI State Controls
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "mr" | "hi">("en");
  const [activeFilter, setActiveFilter] = useState<"all" | "rbi" | "pib" | "economy">("all");
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]); // Track completed reads
  const [searchQuery, setSearchQuery] = useState("");

  // Upgraded High-Yield Current Affairs Feed
  const [newsFeed] = useState<NewsCapsule[]>([
    {
      id: "news-01",
      source_type: "rbi",
      category_tag: "Monetary Policy",
      original_date: "June 26, 2026",
      read_time: "2 min read",
      source_url: "https://rbi.org.in",
      title: {
        en: "RBI Keeps Repo Rate Unchanged at 6.50% in Bi-Monthly Review",
        mr: "आरबीआयने द्वैमासिक पुनरावलोकनात रेपो रेट ६.५०% वर कायम ठेवला",
        hi: "आरबीआई ने द्विमासिक समीक्षा में रेपो रेट को 6.50% पर अपरिवर्तित रखा"
      },
      summary: {
        en: "The Monetary Policy Committee (MPC) voted unanimously to maintain the repo rate to support growth while ensuring inflation aligns with the target. Standing Deposit Facility (SDF) rate stays at 6.25%, and the Marginal Standing Facility (MSF) rate remains at 6.50%.",
        mr: "चलनविषयक धोरण समितीने (MPC) महागाई लक्ष्याशी सुसंगत राहून वाढीला पाठबळ देण्यासाठी रेपो दर कायम ठेवण्याचा एकमताने निर्णय घेतला. स्टँडिंग डिपॉझिट फॅसिलिटी (SDF) दर ६.२५% आणि मार्जिनल स्टँडिंग फॅसिलिटी (MSF) दर ६.५०% वर कायम आहे.",
        hi: "मौद्रिक नीति समिति (MPC) ने मुद्रास्फीति को लक्ष्य के अनुरूप रखते हुए विकास का समर्थन करने के लिए रेपो दर को बनाए रखने के लिए सर्वसम्मति से मतदान किया। स्टैंडिंग डिपॉजिट फैसिलिटी (SDF) दर 6.25% और मार्जिनल स्टैंडिंग फैसिलिटी (MSF) दर 6.50% पर बनी हुई है।"
      }
    },
    {
      id: "news-02",
      source_type: "pib",
      category_tag: "Government Schemes",
      original_date: "June 25, 2026",
      read_time: "3 min read",
      source_url: "https://pib.gov.in",
      title: {
        en: "Ministry of Finance Approves ₹5,000 Crore Allocation for Rural Banking Digitalization",
        mr: "वित्त मंत्रालयाकडून ग्रामीण बँकिंग डिजिटलकरणासाठी ५,००0 कोटी रुपयांच्या निधीला मंजुरी",
        hi: "वित्त मंत्रालय ने ग्रामीण बैंकिंग डिजिटलीकरण के लिए ₹5,000 करोड़ के आवंटन को मंजूरी दी"
      },
      summary: {
        en: "The Union Government launched a capital infusion program targeting Regional Rural Banks (RRBs). Financial support will prioritize high-speed fiber connectivity, micro-ATM distributions, and advanced cybersecurity framework deployments to boost rural credit delivery.",
        mr: "केंद्र सरकारने प्रादेशिक ग्रामीण बँकांना (RRBs) लक्ष्य करून भांडवल ओतण्याचा कार्यक्रम सुरू केला आहे. ग्रामीण भागात कर्जपुरवठा वाढवण्यासाठी हाय-स्पीड फायबर कनेक्टिव्हिटी, मायक्रो-एटीएम वितरण आणि प्रगत सायबर सुरक्षा फ्रेमवर्क तैनात करण्याला प्राधान्य दिले जाईल.",
        hi: "केंद्र सरकार ने क्षेत्रीय ग्रामीण बैंकों (RRBs) को लक्षित करते हुए एक पूंजी जलसेक कार्यक्रम शुरू किया। ग्रामीण ऋण वितरण को बढ़ावा देने के लिए वित्तीय सहायता में हाई-स्पीड फाइबर कनेक्टिविटी, माइक्रो-एटीएम वितरण और उन्नत साइबर सुरक्षा ढांचे को प्राथमिकता दी जाएगी।"
      }
    },
    {
      id: "news-03",
      source_type: "economy",
      category_tag: "Corporate Banking",
      original_date: "June 24, 2026",
      read_time: "2 min read",
      source_url: "https://economictimes.indiatimes.com",
      title: {
        en: "Major Public Sector Banks Finalize Integration of Cross-Border UPI Nodes with EU Systems",
        mr: "प्रमुख सार्वजनिक क्षेत्रातील बँकांकडून युरोपियन युनियन प्रणालीसह क्रॉस-बॉर्डर UPI नोड्सचे एकत्रीकरण अंतिम",
        hi: "प्रमुख सार्वजनिक क्षेत्र के बैंकों ने यूरोपीय संघ प्रणालियों के साथ क्रॉस-बॉर्डर यूपीआई नोड्स के एकीकरण को अंतिम रूप दिया"
      },
      summary: {
        en: "Three top tier lenders successfully integrated bilateral payment bridges enabling direct, instant remittances between Indian bank accounts and European trade blocks. This step cuts transaction settlement costs down by up to 40% for MSME exporters.",
        mr: "तीन प्रमुख बँकांनी द्विपक्षीय पेमेंट ब्रिज यशस्वीरित्या एकत्रित केले आहेत, ज्यामुळे भारतीय बँक खाती आणि युरोपियन व्यापारी गट यांच्यात थेट, त्वरित पैसे पाठवणे शक्य होईल. या पायरीमुळे MSME निर्यातदारांसाठी व्यवहार सेटलमेंट खर्च ४०% पर्यंत कमी होईल.",
        hi: "तीन शीर्ष स्तर के उधारकर्ताओं ने द्विपक्षीय भुगतान पुलों को सफलतापूर्वक एकीकृत किया जिससे भारतीय बैंक खातों और यूरोपीय व्यापार ब्लॉकों के बीच सीधे, त्वरित प्रेषण सक्षम हो सके। यह कदम MSME निर्यातकों के लिए लेनदेन निपटान लागत को 40% तक कम करता है।"
      }
    }
  ]);

  useEffect(() => {
    const session = authManager.getSession();
    if (!session) {
      router.push("/student/login");
    } else {
      setStudent(session);
    }
  }, [router]);

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedIds(prev => 
      prev.includes(id) ? prev.filter(bId => bId !== id) : [...prev, id]
    );
  };

  const toggleReadStatus = (id: string) => {
    setReadIds(prev => 
      prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
    );
  };

  // Content Filtering Pipeline
  const filteredNews = newsFeed.filter(item => {
    const matchesFilter = activeFilter === "all" || item.source_type === activeFilter;
    const currentTitle = item.title[selectedLanguage].toLowerCase();
    const currentSummary = item.summary[selectedLanguage].toLowerCase();
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

          {/* SYSTEM PROGRESS PROGRESS BAR TRACKER */}
          <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 bg-slate-900/40 px-3 py-1.5 rounded-full border border-slate-800/50">
            <span className="font-medium text-emerald-400">{readIds.length}/{newsFeed.length} Read</span>
            <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-1.5 transition-all duration-300" 
                style={{ width: `${(readIds.length / newsFeed.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* CORE FRAMEWORK INTERACTIVE SPLIT HUB */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: INTERACTIVE CONTROLS DOCK (Sticky on Large Screens) */}
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

          {/* ENGINE SOURCE SOURCE SEGREGATORS */}
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

        {/* RIGHT COLUMN: READ-OPTIMIZED DOCK ARCHITECTURE */}
        <section className="lg:col-span-8 space-y-6">
          {filteredNews.length === 0 ? (
            <div className="border border-dashed border-slate-800 rounded-2xl p-16 text-center text-slate-500 text-sm">
              No automated capsules found matching the customized filters.
            </div>
          ) : (
            filteredNews.map((capsule) => {
              const isBookmarked = bookmarkedIds.includes(capsule.id);
              const isRead = readIds.includes(capsule.id);
              
              return (
                <article 
                  key={capsule.id}
                  onClick={() => toggleReadStatus(capsule.id)}
                  className={`group relative bg-slate-900/10 border rounded-2xl p-6 md:p-8 hover:bg-slate-900/20 transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                    isRead ? "border-slate-800/40 opacity-60" : "border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  {/* Status Indicator Bar */}
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
                      
                      {/* Action Interface Container */}
                      <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2">
                        <button 
                          onClick={(e) => toggleBookmark(capsule.id, e)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            isBookmarked 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                              : "bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-emerald-400" : ""}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* High Yield Typography Core Payload */}
                  <div className="space-y-4">
                    <h2 className="text-base md:text-lg font-bold text-slate-100 tracking-tight leading-snug group-hover:text-white transition-colors">
                      {capsule.title[selectedLanguage]}
                    </h2>
                    
                    <p className="text-sm text-slate-400 leading-relaxed font-normal selection:bg-emerald-500/30">
                      {capsule.summary[selectedLanguage]}
                    </p>
                  </div>

                  {/* Lower Controls Layer */}
                  <div className="mt-6 pt-4 border-t border-slate-900/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {isRead ? (
                        <span className="flex items-center gap-1 text-emerald-500 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Finished Reading
                        </span>
                      ) : (
                        <span className="text-slate-500 group-hover:text-slate-400 transition-colors">
                          Click card to mark as read
                        </span>
                      )}
                    </div>

                    <a 
                      href={capsule.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-emerald-400 uppercase tracking-wider transition-colors"
                    >
                      Verify Apex Circular <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </article>
              );
            })
          )}
        </section>

      </div>
    </main>
  );
}