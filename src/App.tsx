import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Search, MapPin, ThumbsUp, Sparkles, Filter, List, Award, Plus, Map, Menu, X } from "lucide-react";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, syncToFirestore } from "./lib/firebase";
import { collection, getDocs, query, onSnapshot, orderBy, limit } from "firebase/firestore";

import { User, Issue, CategoryType, StatusType } from "./types";
import { formatDistanceToNow } from "date-fns";
import { getIssueImage, getResolutionTimer } from "./utils";
import Navbar from "./components/Navbar";
import CitizenMap from "./components/CitizenMap";
import { Login, Signup } from "./components/Auth";
import ReportIssue from "./components/ReportIssue";
import IssuesList from "./components/IssuesList";
import IssueDetail from "./components/IssueDetail";
import ImpactDashboard from "./components/ImpactDashboard";
import PredictiveInsights from "./components/PredictiveInsights";
import Leaderboard from "./components/Leaderboard";
import Profile from "./components/Profile";
import toast from "react-hot-toast";

interface AgentLog {
  id: string;
  agent: "verifier" | "reporter" | "prioritizer" | "predictor";
  action: string;
  metadata: any;
  timestamp: string;
}

function TopSaffronBannerWrapper() {
  const location = useLocation();
  const [stats, setStats] = useState({ total: 142, resolved: 98 });

  useEffect(() => {
    if (location.pathname !== "/") return;

    try {
      const q = query(collection(db, "issues"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedIssues: any[] = [];
        snapshot.forEach((doc) => {
          loadedIssues.push(doc.data());
        });
        if (loadedIssues.length > 0) {
          const total = loadedIssues.length;
          const resolved = loadedIssues.filter((i) => i.status === "resolved").length;
          setStats({ total, resolved });
        }
      }, (err) => {
        console.warn("Error listening to issues for banner:", err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore not ready for banner, using defaults:", e);
    }
  }, [location.pathname]);

  if (location.pathname !== "/") return null;

  return (
    <div className="w-full bg-[#FF9933] text-white text-[13px] font-semibold h-[36px] flex items-center justify-center shrink-0 z-50">
      🇮🇳 NagarVoice is live in Bengaluru — {stats.total} issues reported, {stats.resolved} resolved by community action
    </div>
  );
}

function AgentActivityFeed() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const q = query(
        collection(db, "agentLogs"),
        orderBy("timestamp", "desc"),
        limit(5)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedLogs: AgentLog[] = [];
        snapshot.forEach((doc) => {
          loadedLogs.push({ id: doc.id, ...doc.data() } as AgentLog);
        });
        setLogs(loadedLogs);
        setLoading(false);
      }, (err) => {
        console.warn("Error listening to agent activities:", err);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore not ready for agent logs:", e);
      setLoading(false);
    }
  }, []);

  const getAgentStyles = (agent: string) => {
    switch (agent) {
      case "verifier":
        return {
          bg: "bg-blue-50 border-blue-200",
          text: "text-blue-700",
          iconBg: "bg-blue-100 text-blue-600",
          label: "Verifier Agent",
        };
      case "reporter":
        return {
          bg: "bg-amber-50 border-amber-200",
          text: "text-amber-700",
          iconBg: "bg-amber-100 text-amber-600",
          label: "Reporter Agent",
        };
      case "prioritizer":
        return {
          bg: "bg-purple-50 border-purple-200",
          text: "text-purple-700",
          iconBg: "bg-purple-100 text-purple-600",
          label: "Prioritizer Agent",
        };
      case "predictor":
        return {
          bg: "bg-[#fff7ed] border-[#ffedd5]",
          text: "text-[#c2410c]",
          iconBg: "bg-[#ffedd5] text-saffron",
          label: "Predictor Agent",
        };
      default:
        return {
          bg: "bg-slate-50 border-slate-200",
          text: "text-slate-700",
          iconBg: "bg-slate-100 text-slate-600",
          label: "AI Agent",
        };
    }
  };

  return (
    <div className="w-full lg:w-[280px] xl:w-[320px] flex-shrink-0 border-t lg:border-t-0 lg:border-l border-[#e5e7eb] flex flex-col bg-[#fdfdfd] z-10 p-4 shrink-0">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-[#6b7280] uppercase tracking-wider">AI Activity Feed</h3>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[11px] font-medium text-green-600">Live Sync</span>
        </div>
      </div>

      <div className="flex-grow space-y-3 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-2">
            <div className="w-5 h-5 border-2 border-saffron border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[11px] text-[#9ca3af]">Syncing logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-sec-text text-[12px] italic border border-dashed border-[#e5e7eb] rounded-[6px] bg-slate-50">
            Awaiting first autonomous agent action...
          </div>
        ) : (
          logs.map((log) => {
            const styles = getAgentStyles(log.agent);
            const timeStr = log.timestamp
              ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })
              : "just now";

            return (
              <div
                key={log.id}
                className={`p-3 rounded-[6px] border ${styles.bg} transition-all duration-300 hover:shadow-xs`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${styles.iconBg}`}>
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[11px] font-bold text-navy-blue truncate">{styles.label}</span>
                      <span className="text-[9px] text-[#9ca3af] shrink-0 font-medium">{timeStr}</span>
                    </div>
                    <p className="text-[12.5px] text-body-text font-medium leading-relaxed">{log.action}</p>
                    {log.metadata && log.metadata.issueTitle && (
                      <div className="text-[10px] text-sec-text bg-white/60 px-1.5 py-0.5 rounded mt-1 truncate border border-black/5">
                        📍 {log.metadata.issueTitle}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const calculateCityHealthScore = (loadedIssues: any[]) => {
  if (!loadedIssues || loadedIssues.length === 0) return 100;

  const total = loadedIssues.length;
  const resolved = loadedIssues.filter(i => i.status === 'resolved').length;
  const resolutionRate = resolved / total; // 0 to 1

  const avgSeverity = loadedIssues
    .filter(i => i.status !== 'resolved')
    .reduce((sum, i) => sum + (i.severity || 5), 0) / Math.max(1, total - resolved);
  const severityPenalty = (avgSeverity / 10) * 0.3;

  const staleIssues = loadedIssues.filter(i => {
    if (i.status === 'resolved') return false;
    let ms = 0;
    if (i.reportedAt && typeof i.reportedAt.toMillis === "function") {
      ms = i.reportedAt.toMillis();
    } else if (i.reportedAt) {
      ms = new Date(i.reportedAt).getTime();
    } else {
      ms = Date.now();
    }
    const daysOld = (Date.now() - ms) / (1000 * 60 * 60 * 24);
    return daysOld > 7;
  }).length;
  const stalePenalty = Math.min(staleIssues / total, 0.3);

  const verifiedRatio = loadedIssues.filter(i => i.votes > 2).length / total;
  const communityBonus = verifiedRatio * 0.1;

  const score = Math.round(
    (resolutionRate * 0.5 - severityPenalty - stalePenalty + communityBonus) * 100
  );
  return Math.max(0, Math.min(100, score + 50));
};

// Dedicated Home View Component containing the beautiful Map Split-Screen
function HomeView({ currentUser }: { currentUser: User | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryType>("all");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Firestore-derived states
  const [cityHealthScore, setCityHealthScore] = useState<number>(100);
  const [healthStats, setHealthStats] = useState({ total: 0, resolved: 0, avgDays: 0 });
  const [wallOfShame, setWallOfShame] = useState<Issue[]>([]);

  const computeStats = (loadedIssues: any[]) => {
    // Compute score
    const score = calculateCityHealthScore(loadedIssues);
    setCityHealthScore(score);

    // Compute supplementary stats
    const total = loadedIssues.length;
    const resolved = loadedIssues.filter(i => i.status === 'resolved').length;
    const resolvedIssues = loadedIssues.filter(i => i.status === 'resolved');
    const avgDays = resolvedIssues.length > 0 
      ? Math.round(resolvedIssues.reduce((sum, i) => {
          const start = i.reportedAt?.toMillis ? i.reportedAt.toMillis() : new Date(i.reportedAt).getTime();
          const end = i.resolvedAt?.toMillis ? i.resolvedAt.toMillis() : (i.resolvedAt ? new Date(i.resolvedAt).getTime() : start);
          return sum + (end - start) / (1000 * 60 * 60 * 24);
        }, 0) / resolvedIssues.length)
      : 0;

    setHealthStats({ total, resolved, avgDays });

    // Wall of Shame (longest unresolved first, limit 10)
    const unresolved = loadedIssues
      .filter((i) => i.status !== "resolved")
      .sort((a, b) => {
        const aTime = a.reportedAt?.toMillis ? a.reportedAt.toMillis() : new Date(a.reportedAt).getTime();
        const bTime = b.reportedAt?.toMillis ? b.reportedAt.toMillis() : new Date(b.reportedAt).getTime();
        return aTime - bTime;
      })
      .slice(0, 10);

    setWallOfShame(unresolved);
  };

  const loadDataFromFirestore = async (fallbackIssues?: any[]) => {
    try {
      const q = query(collection(db, "issues"));
      const querySnapshot = await getDocs(q);
      const loadedIssues: any[] = [];
      querySnapshot.forEach((doc) => {
        loadedIssues.push({ id: doc.id, ...doc.data() });
      });

      if (loadedIssues.length > 0) {
        computeStats(loadedIssues);
      } else if (fallbackIssues) {
        computeStats(fallbackIssues);
      }
    } catch (err) {
      console.warn("Error loading data from Firestore, falling back to local computation:", err);
      if (fallbackIssues) {
        computeStats(fallbackIssues);
      }
    }
  };

  const fetchIssues = () => {
    setIsLoading(true);
    fetch("/api/issues")
      .then((res) => res.json())
      .then((data) => {
        setIssues(data);
        setIsLoading(false);
        // Sync to Firestore
        fetch("/api/users/leaderboard")
          .then(r => r.json())
          .then(async (users) => {
            await syncToFirestore(data, users);
            loadDataFromFirestore(data);
          })
          .catch(err => {
            console.error("Error syncing with Firestore:", err);
            loadDataFromFirestore(data);
          });
      })
      .catch((err) => {
        console.error("Error loading issues on home:", err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  // Filter issues based on top actions
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.location.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || issue.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "reported": return "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]";
      case "verified": return "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]";
      case "inProgress": return "bg-[#fefce8] text-[#854d0e] border-[#fde68a]";
      case "resolved": return "bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] mt-[64px] flex flex-col bg-white overflow-y-auto">
      
      {/* Feature 1: City Health Score (full width section, white background, bottom border) */}
      <div id="city_health_score_section" className="w-full bg-white border-b border-[#e5e7eb] p-6 shrink-0 flex flex-col items-center justify-center">
        <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Left / Center: Circular Gauge */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="relative w-[140px] h-[140px] flex items-center justify-center">
              <svg className="w-[140px] h-[140px] transform -rotate-90">
                <circle
                  cx="70"
                  cy="70"
                  r="60"
                  className="stroke-slate-100"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="60"
                  className="transition-all duration-500 ease-out"
                  strokeWidth="10"
                  fill="transparent"
                  stroke={cityHealthScore >= 75 ? "#138808" : cityHealthScore >= 50 ? "#e3a008" : "#dc2626"}
                  strokeDasharray={377}
                  strokeDashoffset={377 - (377 * cityHealthScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[36px] font-bold tracking-tight leading-none" style={{ color: cityHealthScore >= 75 ? "#138808" : cityHealthScore >= 50 ? "#e3a008" : "#dc2626" }}>
                  {cityHealthScore}
                </span>
                <span className="text-[14px] text-[#6b7280] leading-none mt-1">/100</span>
              </div>
            </div>
            
            <div className="text-[13px] font-medium text-[#6b7280]">City Health Score</div>
            <div className="text-[12px] font-semibold" style={{ color: cityHealthScore >= 75 ? "#138808" : cityHealthScore >= 50 ? "#e3a008" : "#dc2626" }}>
              {cityHealthScore >= 75 ? "Infrastructure in good condition" : cityHealthScore >= 50 ? "Moderate issues requiring attention" : "Critical — immediate action needed"}
            </div>
          </div>

          {/* Right: Stat pills */}
          <div className="flex flex-row flex-wrap justify-center gap-3">
            <div className="bg-white border border-[#e5e7eb] rounded-[6px] p-3 w-[140px] text-center">
              <div className="text-[18px] font-bold text-[#1a1a1a]">{healthStats.total}</div>
              <div className="text-[11px] text-[#6b7280]">Total Issues</div>
            </div>
            <div className="bg-white border border-[#e5e7eb] rounded-[6px] p-3 w-[140px] text-center">
              <div className="text-[18px] font-bold text-[#1a1a1a]">{healthStats.resolved}</div>
              <div className="text-[11px] text-[#6b7280]">Resolved</div>
            </div>
            <div className="bg-white border border-[#e5e7eb] rounded-[6px] p-3 w-[140px] text-center">
              <div className="text-[18px] font-bold text-[#1a1a1a]">{healthStats.avgDays} days</div>
              <div className="text-[11px] text-[#6b7280]">Avg Resolution</div>
            </div>
          </div>

        </div>
      </div>

      <div id="home_split_view" className="lg:h-[700px] shrink-0 flex flex-col lg:flex-row overflow-hidden bg-white">
      {/* Left Sidebar Panel - Issue Ledger & Filters (40% width) */}
      <div id="home_sidebar_panel" className="w-full lg:w-[400px] xl:w-[450px] flex-shrink-0 border-r border-[#e5e7eb] flex flex-col h-1/2 lg:h-full bg-white z-10">
        
        {/* Sidebar Header Filters */}
        <div className="p-4 border-b border-[#e5e7eb] space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="w-11 h-11 flex items-center justify-center cursor-pointer hover:bg-slate-50 rounded-full transition-colors shrink-0 -ml-2"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5 text-[#6b7280] shrink-0" />
            </button>
            <h2 className="flex-1 min-w-0 text-[16px] md:text-[20px] font-semibold text-[#1a1a1a] overflow-hidden text-ellipsis whitespace-nowrap leading-none">
              Active Ward Issues
            </h2>
            <Link
              to="/report"
              className="bg-saffron hover:bg-saffron-hover text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center gap-1 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Report Issue
            </Link>
          </div>

          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-sec-text absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by keyword or location..."
              className="w-full bg-white border border-[#d1d5db] rounded-[6px] pl-9 pr-4 py-2 text-[13px] focus:border-saffron focus:outline-none transition-colors"
            />
          </div>

          {/* Quick Category filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-hide">
            {(["all", "pothole", "streetlight", "water_leak", "waste_management"] as CategoryType[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all shrink-0 border ${
                  activeCategory === cat
                    ? "bg-saffron text-white border-saffron"
                    : "bg-[#f8f9fa] text-sec-text border-[#e5e7eb] hover:bg-slate-100"
                }`}
              >
                {cat === "all" ? "All" : cat.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Issue List feed */}
        <div className="flex-grow overflow-y-auto divide-y divide-[#e5e7eb]">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="w-6 h-6 border-3 border-saffron border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="p-8 text-center text-sec-text text-[13px]">
              No active issues match filters.
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => setSelectedIssue(issue)}
                className={`p-4 hover:bg-[#fcfcff] cursor-pointer transition-colors ${
                  selectedIssue?.id === issue.id ? "bg-[#f4f7ff] border-l-4 border-l-navy-blue" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={getIssueImage(issue)}
                    alt={issue.title}
                    className="w-14 h-14 rounded-[6px] object-cover shrink-0 bg-slate-100 border border-[#e5e7eb]"
                  />
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusBadgeColor(issue.status)}`}>
                        {issue.status}
                      </span>
                      <span className="text-[10px] text-sec-text">
                        {formatDistanceToNow(new Date(issue.reportedAt))} ago
                      </span>
                    </div>

                    <h3 className="text-[13.5px] font-bold text-body-text truncate">{issue.title}</h3>
                    
                    <p className="text-[12px] text-sec-text line-clamp-1 mt-0.5">{issue.description}</p>

                    {/* Resolution Timer */}
                    <div className="text-[10px] mt-1">
                      {(() => {
                        const timer = getResolutionTimer(issue);
                        return <span className={timer.colorClass}>{timer.text}</span>;
                      })()}
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 text-[10px] text-sec-text">
                      <span className="flex items-center gap-1 min-w-0">
                        <MapPin className="w-3 h-3 text-saffron shrink-0" />
                        <span className="truncate">{issue.location.address.split(",")[0]}, {issue.location.zone}</span>
                      </span>
                      <span className="flex items-center gap-0.5 shrink-0 font-semibold text-navy-blue">
                        <ThumbsUp className="w-3 h-3 text-saffron" />
                        {issue.votes}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Map Screen (60% width) */}
      <div
        id="home_map_panel"
        className="flex-grow h-[calc(50%-16px)] lg:h-[calc(100%-16px)] mt-0 mx-4 mb-4 relative border border-[#e5e7eb] rounded-[8px] overflow-hidden bg-[#f4f3f0]"
      >
        <CitizenMap
          issues={filteredIssues}
          selectedIssue={selectedIssue}
          onSelectIssue={(issue) => setSelectedIssue(issue)}
        />

        {/* Sliding Details Popup Overlay when marker selected */}
        {selectedIssue && (
          <div
            id="map_detail_overlay"
            className="absolute bottom-6 left-6 right-6 lg:left-6 lg:right-auto lg:w-[380px] bg-white border border-[#e5e7eb] rounded-[8px] p-4 shadow-lg z-40 animate-in fade-in slide-in-from-bottom-5 duration-300"
          >
            <div className="flex gap-3">
              <img
                src={getIssueImage(selectedIssue)}
                alt={selectedIssue.title}
                className="w-16 h-16 rounded-[6px] object-cover border border-[#e5e7eb] bg-slate-100"
              />
              <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusBadgeColor(selectedIssue.status)}`}>
                    {selectedIssue.status}
                  </span>
                  <button
                    onClick={() => setSelectedIssue(null)}
                    className="text-sec-text hover:text-body-text font-bold text-sm"
                  >
                    ×
                  </button>
                </div>
                <h4 className="text-[14px] font-bold text-body-text truncate">{selectedIssue.title}</h4>
                <p className="text-[11px] text-sec-text mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-saffron" />
                  <span className="truncate">{selectedIssue.location.address}</span>
                </p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#f3f4f6] flex items-center justify-between">
              <span className="text-[11px] text-sec-text font-semibold flex items-center gap-1">
                <ThumbsUp className="w-3.5 h-3.5 text-saffron" /> {selectedIssue.votes} upvotes
              </span>
              <button
                onClick={() => navigate(`/issues/${selectedIssue.id}`)}
                className="bg-navy-blue text-white hover:bg-opacity-90 text-[11px] font-semibold px-3.5 py-1.5 rounded-[4px] transition-colors"
              >
                View Full Details
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Agent Activity Feed (Right on desktop, below map on mobile) */}
      <AgentActivityFeed />
    </div>

      {/* Feature 2: Wall of Shame */}
      <div id="wall_of_shame_section" className="bg-white border-t border-[#e5e7eb] p-6 lg:p-8 shrink-0 flex justify-center">
        <div className="w-full max-w-5xl">
          <div className="mb-4">
            <h2 className="text-[20px] font-bold text-[#1a1a1a] leading-none">Still Waiting...</h2>
            <p className="text-[13px] text-[#6b7280] mt-1">Issues with no resolution</p>
          </div>

          <div className="flex flex-col gap-2">
            {wallOfShame.length === 0 ? (
              <p className="text-sec-text text-[13px] italic p-4 text-center border border-[#e5e7eb] rounded-lg">
                No active unresolved issues.
              </p>
            ) : (
              wallOfShame.map((issue) => {
                const daysUnresolved = Math.max(
                  0,
                  Math.floor(
                    (Date.now() -
                      (issue.reportedAt?.toMillis
                        ? issue.reportedAt.toMillis()
                        : new Date(issue.reportedAt).getTime())) /
                      (1000 * 60 * 60 * 24)
                  )
                );
                return (
                  <div
                    key={issue.id}
                    onClick={() => {
                      setSelectedIssue(issue);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border border-[#e5e7eb] rounded-[8px] border-l-4 border-l-[#dc2626] cursor-pointer hover:bg-slate-50 transition-colors gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-[15px] font-bold text-[#1a1a1a] leading-tight truncate">
                          {issue.title}
                        </h4>
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]">
                          {issue.category.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#6b7280] flex items-center gap-1 mt-1.5">
                        <MapPin className="w-3.5 h-3.5 text-saffron shrink-0" />
                        <span className="truncate">{issue.location.address}</span>
                      </p>
                      
                      {/* Progress bar and subtle text */}
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 max-w-[200px] bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-[#dc2626] h-full rounded-full" 
                            style={{ width: `${(issue.severity / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-[#9ca3af] italic">
                          Still waiting... (Severity {issue.severity}/10)
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex sm:flex-col items-end justify-between w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                      <div>
                        <span className="text-[28px] font-bold text-[#dc2626] leading-none">
                          {daysUnresolved}
                        </span>
                        <div className="text-[11px] text-[#6b7280] leading-none mt-0.5">days</div>
                      </div>
                      <div className="text-[12px] text-[#6b7280] mt-1 flex items-center gap-1">
                        <span className="text-saffron">▲</span> {issue.votes} verifications
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate("/issues")}
              className="text-[#FF9933] font-semibold text-[14px] hover:underline"
            >
              View All Issues
            </button>
          </div>
        </div>
      </div>
      {menuOpen && (
        <>
          {/* Semi-transparent dark overlay */}
          <div
            className="fixed inset-0 bg-black/40 z-[100] transition-opacity duration-300"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* Slide-in Sidebar Drawer */}
          <div className="fixed top-0 left-0 bottom-0 w-[260px] bg-white z-[110] shadow-2xl flex flex-col justify-between p-6 transition-transform duration-300 transform translate-x-0">
            <div>
              {/* Header with Close Button */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-bold text-navy-blue">NagarVoice</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer transition-colors"
                  style={{ minWidth: '40px', minHeight: '40px' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col">
                {[
                  { label: "Home", path: "/" },
                  { label: "Report an Issue", path: "/report" },
                  { label: "All Issues", path: "/issues" },
                  { label: "Dashboard", path: "/dashboard" },
                  { label: "Insights", path: "/insights" },
                  { label: "Leaderboard", path: "/leaderboard" },
                  { label: "My Profile", path: "/profile" },
                ].map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        navigate(item.path);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left font-medium text-[16px] py-3 border-b border-[#f3f4f6] flex items-center justify-between hover:bg-slate-50 px-2 rounded-md transition-colors cursor-pointer"
                      style={{
                        color: active ? "#FF9933" : "#1a1a1a",
                      }}
                    >
                      <span>{item.label}</span>
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-saffron" />}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* User Profile Info / Sign In at bottom of drawer */}
            <div className="border-t border-[#f3f4f6] pt-4 mt-auto">
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-saffron/10 border border-saffron flex items-center justify-center text-saffron font-bold text-sm shrink-0">
                    {currentUser.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold text-[#1a1a1a] truncate leading-tight">{currentUser.displayName}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{currentUser.email}</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    navigate("/login");
                    setMenuOpen(false);
                  }}
                  className="w-full bg-saffron hover:bg-saffron-hover text-white text-sm font-semibold py-2.5 rounded-[6px] transition-colors cursor-pointer text-center"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[9999]">
      <div className="text-[32px] font-bold text-[#000080] tracking-tight mb-2 font-sans">
        NagarVoice
      </div>
      <div className="text-[14px] text-[#6b7280] font-sans">
        Loading...
      </div>
    </div>
  );
}

function ProtectedRoute({
  children,
  currentUser,
  loading,
}: {
  children: React.ReactNode;
  currentUser: User | null;
  loading: boolean;
}) {
  if (loading) {
    return <LoadingScreen />;
  }
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PublicRoute({
  children,
  currentUser,
  loading,
}: {
  children: React.ReactNode;
  currentUser: User | null;
  loading: boolean;
}) {
  if (loading) {
    return <LoadingScreen />;
  }
  if (currentUser) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const demoAttempted = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        sessionStorage.removeItem("explicit_logout");
        try {
          // Sync with our backend to get or auto-create their database profile
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: firebaseUser.email }),
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentUser(data.user);
          } else {
            console.error("Backend login failed for firebase user.");
            setCurrentUser(null);
          }
        } catch (err) {
          console.error("Error syncing auth with backend:", err);
          setCurrentUser(null);
        }
        setLoading(false);
      } else {
        if (sessionStorage.getItem("explicit_logout") === "true") {
          setCurrentUser(null);
          setLoading(false);
        } else {
          if (demoAttempted.current) {
            setCurrentUser(null);
            setLoading(false);
            return;
          }
          demoAttempted.current = true;
          try {
            await signInWithEmailAndPassword(auth, "demo@nagarvoice.in", "NagarVoice2026");
          } catch (error) {
            console.warn("Demo login failed, trying registration...", error);
            try {
              await createUserWithEmailAndPassword(auth, "demo@nagarvoice.in", "NagarVoice2026");
            } catch (regError) {
              console.error("Demo registration also failed:", regError);
              // Fallback: If Firebase Auth fails (e.g. Email/Password is disabled),
              // directly log the user in locally on the backend as the demo user!
              try {
                const res = await fetch("/api/auth/login", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: "demo@nagarvoice.in" }),
                });
                if (res.ok) {
                  const data = await res.json();
                  setCurrentUser(data.user);
                  console.log("Logged in locally as demo user (Firebase Auth bypassed).");
                } else {
                  setCurrentUser(null);
                }
              } catch (localErr) {
                console.error("Local fallback login also failed:", localErr);
                setCurrentUser(null);
              }
              setLoading(false);
            }
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync points and badges of logged in user
  const handleRefreshUser = () => {
    if (!currentUser) return;
    fetch("/api/users/leaderboard")
      .then((res) => res.json())
      .then((users: User[]) => {
        const found = users.find((u) => u.uid === currentUser.uid);
        if (found) {
          setCurrentUser(found);
        }
      })
      .catch((err) => console.error("Error refreshing profile stats:", err));
  };

  const handleLogout = async () => {
    try {
      sessionStorage.setItem("explicit_logout", "true");
      await auth.signOut();
      setCurrentUser(null);
      toast.success("Logged out successfully.");
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Failed to log out.");
    }
  };

  // --- Feature 4: Gemini AI Civic Assistant (Chat Interface) ---
  interface ChatMessage {
    role: "user" | "model";
    text: string;
  }

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "model", text: "Namaste! I am your NagarAI Civic Assistant. How can I help you with city infrastructure, ward complaints, or civic tasks today?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    const newMessages = [...chatMessages, { role: "user" as const, text: userMsg }];
    setChatMessages(newMessages);
    setIsSendingChat(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: chatMessages
        })
      });
      const data = await res.json();
      if (data.text) {
        setChatMessages([...newMessages, { role: "model" as const, text: data.text }]);
      } else {
        setChatMessages([...newMessages, { role: "model" as const, text: "I apologize, but I am unable to connect to my brain right now." }]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages([...newMessages, { role: "model" as const, text: "Connection error. Please verify the Gemini API setup." }]);
    } finally {
      setIsSendingChat(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setChatOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <BrowserRouter>
      <div id="nagarvoice_app_container" className="min-h-screen bg-white text-body-text flex flex-col font-sans">
        {/* Saffron banner at the very top of the home page */}
        <TopSaffronBannerWrapper />

        {/* Navigation Navbar */}
        <Navbar currentUser={currentUser} onLogout={handleLogout} />

        {/* Router Screens Content */}
        <main className="flex-grow">
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute currentUser={currentUser} loading={loading}>
                  <HomeView currentUser={currentUser} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/issues"
              element={
                <ProtectedRoute currentUser={currentUser} loading={loading}>
                  <IssuesList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/issues/:id"
              element={
                <ProtectedRoute currentUser={currentUser} loading={loading}>
                  <IssueDetail currentUser={currentUser} onRefreshUser={handleRefreshUser} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report"
              element={
                <ProtectedRoute currentUser={currentUser} loading={loading}>
                  <ReportIssue currentUser={currentUser} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute currentUser={currentUser} loading={loading}>
                  <ImpactDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/insights"
              element={
                <ProtectedRoute currentUser={currentUser} loading={loading}>
                  <PredictiveInsights />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute currentUser={currentUser} loading={loading}>
                  <Leaderboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute currentUser={currentUser} loading={loading}>
                  <Profile currentUser={currentUser} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute currentUser={currentUser} loading={loading}>
                  <Login onLoginSuccess={(u) => setCurrentUser(u)} />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute currentUser={currentUser} loading={loading}>
                  <Signup onLoginSuccess={(u) => setCurrentUser(u)} />
                </PublicRoute>
              }
            />
          </Routes>
        </main>

        {/* Global Footer Line */}
        <footer className="w-full bg-slate-50 border-t border-[#e5e7eb] py-4 text-center shrink-0">
          <p className="text-[12px] text-[#9ca3af] font-medium px-4">
            NagarVoice uses 4 autonomous AI agents to analyze, verify, prioritize, and predict civic issues.
          </p>
        </footer>

        {/* Feature 4: Gemini AI Civic Assistant (Chat Interface) */}
        {currentUser && (
          <button
            id="fab_chat_assistant"
            onClick={() => setChatOpen(!chatOpen)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-[#FF9933] hover:bg-[#e68a2e] text-white rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 z-50 animate-bounce"
            title="NagarAI Civic Assistant"
          >
            <Sparkles className="w-6 h-6" />
          </button>
        )}

        {chatOpen && currentUser && (
          <div
            id="chat_assistant_panel"
            className="fixed inset-y-0 right-0 w-full sm:w-[380px] bg-white shadow-2xl flex flex-col z-[100] border-l border-[#e5e7eb] animate-in slide-in-from-right duration-300"
          >
            {/* Header */}
            <div id="chat_header" className="bg-[#000080] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FF9933]" />
                <span className="font-bold text-[16px]">NagarAI Assistant</span>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center font-bold text-lg cursor-pointer text-white"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div id="chat_messages_log" className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8f9fa]">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
                >
                  <div
                    className={`rounded-[12px] p-3 text-[13px] leading-relaxed shadow-xs ${
                      msg.role === "user"
                        ? "bg-[#FF9933] text-white rounded-tr-none"
                        : "bg-white text-[#1a1a1a] border border-[#e5e7eb] rounded-tl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isSendingChat && (
                <div className="flex items-center gap-1.5 text-sec-text text-[11px] italic mr-auto pl-1">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce delay-75">●</span>
                  <span className="animate-bounce delay-150">●</span>
                  <span>NagarAI is thinking...</span>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-[#e5e7eb] flex gap-2 bg-white shrink-0">
              <input
                id="chat_input_field"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about active issues, ward health..."
                className="flex-1 border border-[#e5e7eb] rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#FF9933]"
              />
              <button
                id="btn_send_chat"
                type="submit"
                disabled={!chatInput.trim() || isSendingChat}
                className="bg-[#FF9933] hover:bg-[#e68a2e] text-white px-3.5 py-2 rounded-[6px] font-bold text-[12px] disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* Global react-hot-toast notifications */}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              fontFamily: "Inter, sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              background: "#ffffff",
              color: "#1a1a1a"
            }
          }}
        />
      </div>
    </BrowserRouter>
  );
}
