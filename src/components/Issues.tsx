import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, MapPin, ThumbsUp, AlertTriangle, ArrowUpDown, Filter } from "lucide-react";
import { Issue, CategoryType, StatusType } from "../types";
import { formatDistanceToNow } from "date-fns";
import { getIssueImage, getResolutionTimer } from "../utils";

export default function IssuesList() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("all");
  const [selectedStatus, setSelectedStatus] = useState<StatusType>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all"); // 'all', 'high', 'medium', 'low'
  const [sortBy, setSortBy] = useState<string>("latest"); // 'latest', 'votes', 'priority'

  // Categories definitions
  const categories: { id: CategoryType; label: string }[] = [
    { id: "all", label: "All Categories" },
    { id: "pothole", label: "Potholes" },
    { id: "streetlight", label: "Streetlights" },
    { id: "water_leak", label: "Water Leaks" },
    { id: "waste_management", label: "Waste" },
    { id: "road_damage", label: "Road Damage" },
    { id: "drainage", label: "Drainage" },
    { id: "other", label: "Other" }
  ];

  useEffect(() => {
    fetch("/api/issues")
      .then((res) => res.json())
      .then((data) => {
        setIssues(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching issues list:", err);
        setIsLoading(false);
      });
  }, []);

  // Filter & Sort Logic
  const filteredIssues = issues
    .filter((issue) => {
      // Search text query
      const matchesSearch =
        issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.location.address.toLowerCase().includes(searchQuery.toLowerCase());

      // Category
      const matchesCategory = selectedCategory === "all" || issue.category === selectedCategory;

      // Status
      const matchesStatus = selectedStatus === "all" || issue.status === selectedStatus;

      // Severity range
      let matchesSeverity = true;
      if (selectedSeverity === "high") matchesSeverity = issue.severity >= 7;
      else if (selectedSeverity === "medium") matchesSeverity = issue.severity >= 4 && issue.severity <= 6;
      else if (selectedSeverity === "low") matchesSeverity = issue.severity <= 3;

      return matchesSearch && matchesCategory && matchesStatus && matchesSeverity;
    })
    .sort((a, b) => {
      if (sortBy === "votes") {
        return b.votes - a.votes;
      } else if (sortBy === "priority") {
        return b.priorityScore - a.priorityScore;
      } else {
        // latest
        return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
      }
    });

  const getStatusBadge = (status: string) => {
    const badges = {
      reported: "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]",
      verified: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]",
      inProgress: "bg-[#fefce8] text-[#854d0e] border-[#fde68a]",
      resolved: "bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]"
    };
    const labels = {
      reported: "Reported",
      verified: "Verified",
      inProgress: "In Progress",
      resolved: "Resolved"
    };
    return (
      <span className={`text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full border ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getSeverityBadge = (sev: number) => {
    if (sev >= 7) return <span className="bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] text-[10px] font-bold px-2 py-0.5 rounded">HIGH SEVERITY</span>;
    if (sev >= 4) return <span className="bg-amber-50 text-[#d97706] border border-[#fde68a] text-[10px] font-bold px-2 py-0.5 rounded">MEDIUM SEVERITY</span>;
    return <span className="bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] text-[10px] font-bold px-2 py-0.5 rounded">LOW SEVERITY</span>;
  };

  return (
    <div id="issues_list_container" className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-[32px] font-bold text-navy-blue leading-tight mb-2">Civic Ledger</h1>
        <p className="text-[14px] text-sec-text">Verify, filter, and track public issues raised by community members in your neighborhoods.</p>
      </div>

      {/* Main Filter Suite */}
      <div className="bg-white border border-[#e5e7eb] rounded-[8px] p-4 mb-8 space-y-4">
        {/* Top: Search & Sort Row */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch">
          <div className="relative flex-grow">
            <Search className="w-4 h-4 text-sec-text absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keywords, street address, category..."
              className="w-full bg-white border border-[#d1d5db] rounded-[6px] pl-10 pr-4 py-2.5 text-[14px] focus:border-saffron focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 border border-[#d1d5db] rounded-[6px] px-3 py-2 text-[13px] font-medium text-body-text bg-white">
              <ArrowUpDown className="w-4 h-4 text-sec-text" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="focus:outline-none bg-white cursor-pointer"
              >
                <option value="latest">Sort: Latest Reported</option>
                <option value="votes">Sort: Most Upvoted</option>
                <option value="priority">Sort: AI Priority Score</option>
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center gap-2 border border-[#d1d5db] rounded-[6px] px-3 py-2 text-[13px] font-medium text-body-text bg-white">
              <Filter className="w-4 h-4 text-sec-text" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as StatusType)}
                className="focus:outline-none bg-white cursor-pointer"
              >
                <option value="all">Status: All</option>
                <option value="reported">Status: Reported</option>
                <option value="verified">Status: Verified</option>
                <option value="inProgress">Status: In Progress</option>
                <option value="resolved">Status: Resolved</option>
              </select>
            </div>

            {/* Severity Range Dropdown */}
            <div className="flex items-center gap-2 border border-[#d1d5db] rounded-[6px] px-3 py-2 text-[13px] font-medium text-body-text bg-white">
              <AlertTriangle className="w-4 h-4 text-sec-text" />
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="focus:outline-none bg-white cursor-pointer"
              >
                <option value="all">Severity: All</option>
                <option value="high">Severity: High (7-10)</option>
                <option value="medium">Severity: Medium (4-6)</option>
                <option value="low">Severity: Low (1-3)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bottom: Horizontal Category Filter Slider */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-hide border-t border-[#f3f4f6] pt-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-[12px] font-semibold px-4 py-1.5 rounded-full transition-all shrink-0 border ${
                selectedCategory === cat.id
                  ? "bg-saffron text-white border-saffron"
                  : "bg-slate-50 text-sec-text border-[#e5e7eb] hover:bg-slate-100"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Results Listing */}
      {isLoading ? (
        <div className="flex justify-center items-center h-[30vh]">
          <div className="w-8 h-8 border-4 border-saffron border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#e5e7eb] rounded-[8px] bg-slate-50 max-w-lg mx-auto">
          <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-[16px] font-bold text-body-text mb-1">No matching reports found</h3>
          <p className="text-[13px] text-sec-text">Try adjusting your category, status, severity slider, or search queries.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIssues.map((issue) => (
            <div
              key={issue.id}
              onClick={() => navigate(`/issues/${issue.id}`)}
              className="group bg-white border border-[#e5e7eb] rounded-[8px] overflow-hidden hover:border-saffron hover:shadow-sm transition-all cursor-pointer flex flex-col"
            >
              {/* Photo Banner with Priority Score overlay */}
              <div className="h-[200px] w-full relative bg-slate-100">
                <img
                  src={getIssueImage(issue)}
                  alt={issue.title}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm text-white px-2.5 py-1 rounded-[4px] text-[11px] font-bold flex items-center gap-1.5">
                  Priority Score: {Math.round(issue.priorityScore)}
                </div>
                <div className="absolute top-3 right-3">
                  {getStatusBadge(issue.status)}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-grow flex flex-col justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 flex-wrap">
                    {getSeverityBadge(issue.severity)}
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">
                      {issue.category.replace("_", " ")}
                    </span>
                  </div>

                  <h3 className="text-[16px] font-bold text-body-text leading-tight group-hover:text-saffron transition-colors line-clamp-1">
                    {issue.title}
                  </h3>

                  <p className="text-[13px] text-sec-text mt-2 line-clamp-2 leading-relaxed">
                    {issue.description}
                  </p>

                  {/* Resolution Timer */}
                  <div className="mt-3 text-[12px]">
                    {(() => {
                      const timer = getResolutionTimer(issue);
                      return <span className={timer.colorClass}>{timer.text}</span>;
                    })()}
                  </div>
                </div>

                <div className="border-t border-[#f3f4f6] pt-4 mt-4 flex items-center justify-between text-[11px] text-sec-text">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-saffron shrink-0" />
                    <span className="truncate">{issue.location.address.split(",")[0]}, {issue.location.zone}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 font-semibold text-navy-blue">
                    <ThumbsUp className="w-3.5 h-3.5 text-saffron" />
                    {issue.votes} upvotes
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
