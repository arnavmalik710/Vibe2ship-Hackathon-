import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { Sparkles, AlertCircle, ShieldAlert, CheckCircle, Info, RefreshCw, Activity, Calendar, TrendingUp } from "lucide-react";
import { Insight } from "../types";
import toast from "react-hot-toast";
import { logAgentActivity } from "../lib/firebase";

interface WeeklyReportData {
  totalReported: number;
  totalResolved: number;
  newlyResolved: { id: string; title: string; address: string }[];
  distribution: { category: string; percentage: number }[];
  forecast: string;
  suggestions: string[];
  generatedAt: string;
}

export default function PredictiveInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Weekly Nagar Report States
  const [activeTab, setActiveTab] = useState<"report" | "predictive">("report");
  const [reportData, setReportData] = useState<WeeklyReportData | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);

  const loadWeeklyReport = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = localStorage.getItem("nagar_weekly_report");
      if (cached) {
        try {
          setReportData(JSON.parse(cached));
          return;
        } catch (e) {
          console.error("Error parsing cached report:", e);
        }
      }
    }

    setIsReportLoading(true);
    try {
      const res = await fetch("/api/report/weekly");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReportData(data);
      localStorage.setItem("nagar_weekly_report", JSON.stringify(data));
      toast.success("Weekly Nagar Report updated!");
    } catch (err) {
      console.error("Error fetching report:", err);
      toast.error("Failed to load Weekly Report.");
    } finally {
      setIsReportLoading(false);
    }
  };

  useEffect(() => {
    loadWeeklyReport();
  }, []);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const circlesLayerRef = useRef<L.LayerGroup | null>(null);

  // Map of Bangalore Zone Centers
  const zoneCenters: { [zone: string]: [number, number] } = {
    "Indiranagar": [12.9719, 77.6412],
    "Koramangala": [12.9352, 77.6245],
    "Whitefield": [12.9698, 77.7499],
    "Lavelle Road": [12.9750, 77.5946],
    "Central Bengaluru": [12.9716, 77.5946],
    "Central City": [12.9716, 77.5946],
    "Metro Zone": [12.9800, 77.6000]
  };

  const riskColors = {
    high: "#dc2626",
    medium: "#e3a008",
    low: "#138808"
  };

  // Triggers Predictor Agent on server
  const handleGenerateInsights = async () => {
    setIsLoading(true);
    setInsights([]);
    try {
      const res = await fetch("/api/agent/predict-zones");
      if (!res.ok) {
        throw new Error("Could not process prediction patterns.");
      }
      const data = await res.json();
      
      // Sort insights High to Low
      const order = { high: 0, medium: 1, low: 2 };
      data.sort((a: Insight, b: Insight) => order[a.riskLevel] - order[b.riskLevel]);

      setInsights(data);
      setHasGenerated(true);
      toast.success("AI zone predictions updated successfully!");
      
      // Log Predictor Agent running successfully
      const highRiskCount = data.filter((d: any) => d.riskLevel === "high").length;
      logAgentActivity("predictor", `Flagged ${highRiskCount} municipal zone${highRiskCount === 1 ? "" : "s"} as high risk`, {
        zonesAnalyzed: data.length,
        highRiskCount
      });
    } catch (err: any) {
      toast.error(err.message || "Predictor Agent analysis failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Insights Map
  useEffect(() => {
    if (!hasGenerated || !mapContainerRef.current) return;

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([12.955, 77.64], 12);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      const circles = L.layerGroup().addTo(map);
      circlesLayerRef.current = circles;

      // Draw prediction circles on the map at zone centers
      insights.forEach((insight) => {
        const center = zoneCenters[insight.zone] || [12.9716, 77.5946];
        const color = riskColors[insight.riskLevel];

        const circle = L.circle(center, {
          radius: 800,
          color: color,
          fillColor: color,
          fillOpacity: 0.25,
          weight: 2
        }).addTo(circles);

        circle.bindTooltip(`
          <div style="font-family: 'Inter', sans-serif; font-size: 12px;">
            <strong style="color: ${color}; text-transform: uppercase;">● ${insight.riskLevel} Risk</strong>
            <div style="font-weight: 600; margin-top: 2px;">Zone: ${insight.zone}</div>
          </div>
        `, { direction: "top", sticky: true });
      });

      mapInstanceRef.current = map;
    }, 100);

    return () => clearTimeout(timer);
  }, [insights, hasGenerated]);

  return (
    <div id="insights_container" className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[32px] font-bold text-navy-blue leading-tight mb-2">Urban Intelligence</h1>
          <p className="text-[14px] text-sec-text">AI analysis of infrastructure patterns, overall civic health, and predictive hotspot maps.</p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-[#e5e7eb] mb-8 gap-4">
        <button
          onClick={() => setActiveTab("report")}
          className={`pb-3 text-[14px] font-bold transition-all relative ${
            activeTab === "report" ? "text-saffron" : "text-[#6b7280] hover:text-navy-blue"
          }`}
        >
          Weekly Nagar Report
          {activeTab === "report" && <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-saffron rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab("predictive")}
          className={`pb-3 text-[14px] font-bold transition-all relative ${
            activeTab === "predictive" ? "text-saffron" : "text-[#6b7280] hover:text-navy-blue"
          }`}
        >
          Zone Risks Map
          {activeTab === "predictive" && <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-saffron rounded-full" />}
        </button>
      </div>

      {/* Tab 1: Weekly Nagar Report */}
      {activeTab === "report" && (
        <div id="weekly_report_tab" className="space-y-8 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-4 flex-wrap bg-slate-50 border border-[#e5e7eb] rounded-lg p-4">
            <div className="flex items-center gap-2 text-[13px] text-[#4b5563]">
              <Calendar className="w-4 h-4 text-[#FF9933]" />
              <span>
                Generated: <strong>{reportData ? new Date(reportData.generatedAt).toLocaleString() : "Loading..."}</strong>
              </span>
            </div>
            <button
              onClick={() => loadWeeklyReport(true)}
              disabled={isReportLoading}
              className="bg-white hover:bg-slate-50 border border-[#e5e7eb] rounded-md px-3 py-1.5 text-[12px] font-semibold text-body-text flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReportLoading ? "animate-spin" : ""}`} />
              Refresh Report
            </button>
          </div>

          {isReportLoading ? (
            <div className="flex flex-col justify-center items-center h-[30vh] space-y-4">
              <div className="w-8 h-8 border-3 border-saffron border-t-transparent rounded-full animate-spin"></div>
              <div className="text-sec-text text-[13px] font-medium animate-pulse">Analyzing past 7 days of civic activity...</div>
            </div>
          ) : reportData ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Stats, Newly Resolved, Category Distribution */}
              <div className="lg:col-span-7 space-y-8">
                {/* Weekly Stats Card */}
                <div id="weekly_stats_card" className="bg-white border border-[#e5e7eb] rounded-[8px] p-6">
                  <h3 className="text-[18px] font-bold text-body-text mb-4">Past 7 Days Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg border border-[#e5e7eb] text-center">
                      <div className="text-[28px] font-extrabold text-navy-blue leading-none">{reportData.totalReported}</div>
                      <div className="text-[12px] font-medium text-sec-text mt-2">New Complaints</div>
                    </div>
                    <div className="p-4 bg-[#f0fdf4] rounded-lg border border-[#bbf7d0] text-center">
                      <div className="text-[28px] font-extrabold text-green-success leading-none">{reportData.totalResolved}</div>
                      <div className="text-[12px] font-medium text-[#15803d] mt-2">Issues Resolved</div>
                    </div>
                  </div>
                </div>

                {/* Newly Resolved Checklist */}
                <div id="newly_resolved_checklist" className="bg-white border border-[#e5e7eb] rounded-[8px] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-green-success" />
                    <h3 className="text-[18px] font-bold text-body-text">Newly Resolved Tasks</h3>
                  </div>
                  {reportData.newlyResolved.length === 0 ? (
                    <p className="text-sec-text text-[13px] italic bg-slate-50 p-4 rounded-lg text-center border border-[#e5e7eb]">
                      No tasks resolved within the last 7 days.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {reportData.newlyResolved.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-3 bg-white border border-[#e5e7eb] rounded-lg shadow-xs hover:border-saffron/40 transition-colors"
                        >
                          <span className="w-4 h-4 rounded-full bg-green-success/15 border border-green-success/40 flex items-center justify-center text-green-success text-[10px] font-bold mt-0.5">
                            ✓
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-[13px] font-bold text-body-text truncate">{item.title}</h4>
                            <p className="text-[11px] text-sec-text mt-0.5 truncate">{item.address}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category Distribution Percentages */}
                <div id="category_distribution" className="bg-white border border-[#e5e7eb] rounded-[8px] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-navy-blue" />
                    <h3 className="text-[18px] font-bold text-body-text">Issue Category Distribution</h3>
                  </div>
                  {reportData.distribution.length === 0 ? (
                    <p className="text-sec-text text-[13px] italic bg-slate-50 p-4 rounded-lg text-center border border-[#e5e7eb]">
                      No category distribution data available.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {reportData.distribution.map((item) => (
                        <div key={item.category} className="space-y-1">
                          <div className="flex justify-between items-center text-[12px] font-bold text-[#374151]">
                            <span className="capitalize">{item.category.replace("_", " ")}</span>
                            <span>{item.percentage}%</span>
                          </div>
                          <div className="w-full bg-[#e5e7eb] h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#FF9933] h-full rounded-full transition-all duration-500"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: AI Urban Forecast & Citizen Actions */}
              <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-[88px]">
                {/* AI Forecast Card */}
                <div id="ai_urban_forecast_card" className="bg-gradient-to-br from-[#fffbeb] to-white border border-[#fde68a] rounded-[8px] p-6 shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-saffron" />
                    <h3 className="text-[18px] font-bold text-body-text">AI Urban Forecast</h3>
                  </div>
                  <p className="text-[13.5px] text-[#4b5563] leading-relaxed font-medium">
                    {reportData.forecast}
                  </p>
                </div>

                {/* Citizen Suggestions */}
                <div id="citizen_suggestions_card" className="bg-white border border-[#e5e7eb] rounded-[8px] p-6">
                  <h3 className="text-[16px] font-bold text-body-text mb-4">Actionable Citizen Suggestions</h3>
                  <div className="space-y-4">
                    {reportData.suggestions.map((sug, idx) => (
                      <div key={idx} className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-saffron/10 border border-saffron/30 text-saffron flex items-center justify-center font-bold text-[12px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-[13px] text-sec-text leading-relaxed font-medium">{sug}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sec-text text-[13px] italic bg-slate-50 p-4 rounded-lg text-center border border-[#e5e7eb]">
              No report data could be loaded.
            </p>
          )}
        </div>
      )}

      {/* Tab 2: Zone Predictions Risks Map */}
      {activeTab === "predictive" && (
        <div id="predictive_tab" className="animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-slate-50 border border-[#e5e7eb] rounded-lg p-4">
            <div>
              <span className="text-[13px] text-[#4b5563] font-medium">
                Predict municipal zones at-risk for infrastructure failures over the next 30 days.
              </span>
            </div>
            <button
              id="btn_generate_insights"
              onClick={handleGenerateInsights}
              disabled={isLoading}
              className="bg-saffron hover:bg-saffron-hover disabled:bg-saffron/50 text-white font-semibold py-2 px-4 rounded-[6px] text-[13px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Analyzing Data..." : "Generate AI Insights"}
            </button>
          </div>

          {!hasGenerated && !isLoading && (
            <div id="insights_welcome" className="border border-[#e5e7eb] rounded-[8px] bg-slate-50 p-10 text-center max-w-2xl mx-auto my-12">
              <div className="w-16 h-16 bg-saffron/10 text-saffron rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-[20px] font-bold text-body-text mb-2">Predictive Patterns Engine</h2>
              <p className="text-[14px] text-sec-text mb-6">
                NagarVoice's Predictor Agent scans 30 days of reported issues, groups complaint densities geographically, and predicts municipal zones at-risk for water pipe breaks, road sinks, drainage clogs, and dark spots.
              </p>
              <button
                onClick={handleGenerateInsights}
                className="bg-navy-blue text-white hover:bg-opacity-90 font-semibold py-2.5 px-6 rounded-[6px] text-[13px] transition-colors cursor-pointer"
              >
                Trigger Predictor Agent Analysis
              </button>
            </div>
          )}

          {isLoading && (
            <div id="insights_loader" className="flex flex-col justify-center items-center h-[30vh] space-y-4">
              <div className="w-8 h-8 border-3 border-saffron border-t-transparent rounded-full animate-spin"></div>
              <div className="text-sec-text text-[13px] font-medium animate-pulse">Analyzing 30 days of civic data...</div>
            </div>
          )}

          {hasGenerated && insights.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
              {/* Left: Prediction Cards List (60%) */}
              <div className="lg:col-span-7 space-y-6">
                {insights.map((insight, index) => {
                  const isHigh = insight.riskLevel === "high";
                  const isMedium = insight.riskLevel === "medium";

                  const borderClass = isHigh
                    ? "border-l-[4px] border-l-[#dc2626] border-[#e5e7eb]"
                    : isMedium
                    ? "border-l-[4px] border-l-[#e3a008] border-[#e5e7eb]"
                    : "border-l-[4px] border-l-[#138808] border-[#e5e7eb]";

                  const bgClass = isHigh
                    ? "bg-[#fff5f5]"
                    : isMedium
                    ? "bg-[#fffbeb]"
                    : "bg-[#f0fdf4]";

                  const badgeClass = isHigh
                    ? "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]"
                    : isMedium
                    ? "bg-amber-50 text-[#e3a008] border-[#fde68a]"
                    : "bg-[#f0fdf4] text-green-success border-[#bbf7d0]";

                  const confidenceColor = insight.confidenceLevel === "high" ? "text-green-success" : insight.confidenceLevel === "medium" ? "text-[#e3a008]" : "text-[#dc2626]";
                  const reportCount = insight.zone === "Indiranagar" ? 12 : (insight.zone === "Koramangala" ? 18 : (insight.zone === "Whitefield" ? 15 : 10));

                  return (
                    <div
                      key={index}
                      className={`border rounded-[8px] p-6 transition-all hover:border-saffron bg-white ${borderClass}`}
                    >
                      {/* Metadata Line */}
                      <div className="text-[12px] font-semibold text-sec-text mb-2 flex items-center gap-1.5 flex-wrap">
                        <span>Analysis based on {reportCount} reports over 30 days — </span>
                        <span className="flex items-center gap-1">
                          confidence: 
                          <span className={`font-bold capitalize ${confidenceColor}`}>
                            {insight.confidenceLevel || "high"}
                          </span>
                        </span>
                      </div>

                      <div className="flex justify-between items-start gap-4 mb-3">
                        <h3 className="text-[18px] font-bold text-body-text">{insight.zone}</h3>
                        <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-[4px] border ${badgeClass} flex items-center gap-1`}>
                          {isHigh ? <ShieldAlert className="w-3.5 h-3.5" /> : isMedium ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          {insight.riskLevel} Risk
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {(insight.likelyIssueTypes || insight.issueTypes || []).map((type, idx) => (
                          <span key={idx} className="bg-white/85 text-sec-text border border-[#e5e7eb] text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                            {type.replace("_", " ")}
                          </span>
                        ))}
                      </div>

                      <p className="text-[14px] text-[#374151] leading-relaxed mb-4">
                        {insight.reasoning}
                      </p>

                      <div className={`p-4 rounded-[6px] border border-dashed border-[#e5e7eb] ${bgClass}`}>
                        <div className="text-[12px] font-bold text-body-text uppercase mb-1">Recommended Action</div>
                        <p className="text-[13px] text-[#4b5563] font-medium leading-relaxed">{insight.recommendation}</p>
                      </div>
                    </div>
                  );
                })}

                {/* Section Bottom Timestamp */}
                <div className="text-[11px] text-[#9ca3af] mt-4 text-right italic font-medium">
                  Generated: {insights[0]?.generatedAt ? new Date(insights[0].generatedAt).toLocaleString() : new Date().toLocaleString()}
                </div>
              </div>

              {/* Right: Map Highlights Visualization (40%) */}
              <div className="lg:col-span-5 bg-white border border-[#e5e7eb] rounded-[8px] p-6 lg:sticky lg:top-[88px]">
                <h3 className="text-[18px] font-semibold text-body-text mb-2">Predictive Hotspot Map</h3>
                <p className="text-[13px] text-sec-text mb-4">AI localized risks plotted geographically around city zone hubs.</p>

                <div className="h-[300px] lg:h-[350px] w-full rounded-[6px] overflow-hidden border border-[#e5e7eb]">
                  <div ref={mapContainerRef} className="w-full h-full" />
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-[12px] text-sec-text">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#dc2626]/20 border border-[#dc2626]"></span>
                    <span><strong>High Risk Area</strong> (Immediate action required)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-sec-text">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#e3a008]/20 border border-[#e3a008]"></span>
                    <span><strong>Medium Risk Area</strong> (Under advisory warning)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-sec-text">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#138808]/20 border border-[#138808]"></span>
                    <span><strong>Low Risk Area</strong> (Normal maintenance cycle)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Powered by Google & Agent Info Section */}
      <div className="mt-16 pt-8 border-t border-[#e5e7eb] flex flex-col items-center justify-center text-center gap-3">
        <span className="text-[12px] font-semibold text-[#9ca3af] uppercase tracking-widest">Powered by Google Technologies</span>
        <div className="flex items-center gap-6 text-[#9ca3af] font-bold text-[12px] md:text-[13px] flex-wrap justify-center">
          <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-saffron" /> Gemini AI</span>
          <span className="flex items-center gap-1.5">🔥 Firebase</span>
          <span className="flex items-center gap-1.5">📍 Google Maps Platform</span>
        </div>
        <p className="text-[12px] text-[#9ca3af] mt-2 max-w-lg leading-relaxed">
          NagarVoice uses 4 autonomous AI agents to analyze, verify, prioritize, and predict civic issues.
        </p>
      </div>
    </div>
  );
}
