import React, { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import L from "leaflet";
import { MapPin, ThumbsUp, AlertTriangle, Sparkles, Award, User, CheckCircle2, ChevronLeft, ArrowRight, Check } from "lucide-react";
import { Issue, User as UserType } from "../types";
import { formatDistanceToNow } from "date-fns";
import { getIssueImage } from "../utils";
import toast from "react-hot-toast";

interface IssueDetailProps {
  currentUser: UserType | null;
  onRefreshUser: () => void;
}

export default function IssueDetail({ currentUser, onRefreshUser }: IssueDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const fetchIssueDetail = () => {
    setIsLoading(true);
    fetch(`/api/issues/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Issue not found");
        return res.json();
      })
      .then((data) => {
        setIssue(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Issue details could not be found.");
        navigate("/");
      });
  };

  // Fetch issue details on mount
  useEffect(() => {
    fetchIssueDetail();
  }, [id]);

  // Render Leaflet Coordinate Map
  useEffect(() => {
    if (isLoading || !issue || !mapContainerRef.current) return;

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const { lat, lng } = issue.location;
      const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView([lat, lng], 15);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png").addTo(map);

      // Simple circular colored marker
      const markerColor = {
        reported: "#FF9933",
        verified: "#000080",
        inProgress: "#e3a008",
        resolved: "#138808"
      }[issue.status] || "#FF9933";

      L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: markerColor,
        color: "#ffffff",
        weight: 2,
        fillOpacity: 1.0
      }).addTo(map);

      mapInstanceRef.current = map;
    }, 150);

    return () => clearTimeout(timer);
  }, [issue, isLoading]);

  if (isLoading || !issue) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-saffron border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle Verify & Upvote (Gamification action)
  const handleVote = async () => {
    if (!currentUser) {
      toast.error("Please login to verify or upvote issues.");
      navigate("/login");
      return;
    }

    if (issue.voters.includes(currentUser.uid)) {
      toast.error("You have already verified and upvoted this issue.");
      return;
    }

    setIsVoting(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.uid })
      });

      if (!res.ok) throw new Error("Could not process upvote.");

      const updatedIssue = await res.json();
      setIssue(updatedIssue);
      onRefreshUser(); // Sync top navbar scores
      toast.success("Thank you! Your verification has been recorded (+5 pts).");
    } catch (err: any) {
      toast.error(err.message || "Failed to record verification.");
    } finally {
      setIsVoting(false);
    }
  };

  // Simulates Municipal Admin resolution workflows (demo controller)
  const handleSimulateStatus = async (newStatus: "verified" | "inProgress" | "resolved") => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error("Status update failed.");

      const updatedIssue = await res.json();
      setIssue(updatedIssue);
      onRefreshUser(); // Sync user points if resolved
      toast.success(`Workflow simulator successfully updated status to: ${newStatus}!`);
    } catch (err: any) {
      toast.error(err.message || "Could not update status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

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
      <span className={`text-[12px] font-bold uppercase px-3.5 py-1 rounded-full border ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getSeverityLabel = (sev: number) => {
    if (sev >= 7) return <span className="bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] text-[11px] font-bold px-2.5 py-1 rounded">HIGH SEVERITY</span>;
    if (sev >= 4) return <span className="bg-amber-50 text-[#d97706] border border-[#fde68a] text-[11px] font-bold px-2.5 py-1 rounded">MEDIUM SEVERITY</span>;
    return <span className="bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] text-[11px] font-bold px-2.5 py-1 rounded">LOW SEVERITY</span>;
  };

  const alreadyVoted = currentUser ? issue.voters.includes(currentUser.uid) : false;

  return (
    <div id="issue_detail_container" className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Back button link */}
      <Link to="/issues" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-navy-blue hover:text-saffron mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to Civic Ledger
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column - Complete issue details (65%) */}
        <div className="lg:col-span-8 bg-white border border-[#e5e7eb] rounded-[8px] p-6 sm:p-8">
          
          {/* Headline Metadata Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#f3f4f6] pb-5">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {getSeverityLabel(issue.severity)}
                <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded uppercase">
                  {issue.category.replace("_", " ")}
                </span>
              </div>
              <h1 className="text-[28px] font-bold text-navy-blue leading-tight mb-2">{issue.title}</h1>
              <p className="text-[12px] text-sec-text flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-saffron" />
                {issue.reporterName === "Anonymous Citizen" ? (
                  <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-gray-200">
                    Anonymous Report
                  </span>
                ) : (
                  <span>Reported by <strong>{issue.reporterName}</strong></span>
                )}
                <span>• {formatDistanceToNow(new Date(issue.reportedAt))} ago</span>
              </p>
            </div>
            <div className="shrink-0">
              {getStatusBadge(issue.status)}
            </div>
          </div>

          {/* Large image banner */}
          <div className="h-[300px] sm:h-[400px] w-full rounded-[8px] overflow-hidden border border-[#e5e7eb] mb-6 bg-slate-100">
            <img src={getIssueImage(issue)} alt={issue.title} className="w-full h-full object-cover" />
          </div>

          {/* Description & AI Details Grid */}
          <div className="space-y-6">
            <div>
              <h3 className="text-[18px] font-bold text-body-text mb-2">Description</h3>
              <p className="text-[15px] text-[#374151] leading-relaxed whitespace-pre-line">{issue.description}</p>
            </div>

            {/* AI Diagnostics details card */}
            <div className="bg-slate-50 border border-[#e5e7eb] p-5 rounded-[6px] grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] font-bold text-saffron uppercase block mb-1">Assigned Department</span>
                <span className="text-[14px] font-semibold text-body-text">{issue.department}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-saffron uppercase block mb-1">AI Confidence Score</span>
                <span className="text-[14px] font-semibold text-body-text">{Math.round(issue.confidenceScore * 100)}% Match</span>
              </div>
              {issue.aiTags.length > 0 && (
                <div className="md:col-span-2 border-t border-[#e5e7eb] pt-3 mt-1">
                  <span className="text-[11px] font-bold text-sec-text uppercase block mb-1.5">AI Image Diagnostics Signals</span>
                  <div className="flex flex-wrap gap-1.5">
                    {issue.aiTags.map((tag, idx) => (
                      <span key={idx} className="bg-white text-slate-700 border border-[#e5e7eb] text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Citizens Verification / Upvotes list */}
            <div className="border-t border-[#f3f4f6] pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-bold text-body-text">Citizen Verification Ledger</h3>
                <span className="text-[13px] text-sec-text font-medium">{issue.votes} verified upvotes</span>
              </div>

              {/* Verify & Upvote gamified button */}
              <button
                onClick={handleVote}
                disabled={alreadyVoted || isVoting}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 text-[14px] font-semibold py-3 px-6 rounded-[6px] transition-all border ${
                  alreadyVoted
                    ? "bg-[#f0fdf4] text-green-success border-[#bbf7d0] cursor-not-allowed"
                    : "bg-saffron text-white border-saffron hover:bg-saffron-hover"
                }`}
              >
                {alreadyVoted ? (
                  <>
                    <Check className="w-5 h-5 text-green-success" />
                    You Have Verified This Issue (+5 pts Earned)
                  </>
                ) : (
                  <>
                    <ThumbsUp className="w-5 h-5" />
                    {isVoting ? "Verifying..." : "Verify & Upvote Report"}
                  </>
                )}
              </button>

              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <span className="text-[11px] font-bold text-sec-text uppercase mr-1">Verified By:</span>
                {issue.voters.length === 0 ? (
                  <span className="text-[12px] text-sec-text italic">Be the first to verify this issue!</span>
                ) : (
                  <div className="flex -space-x-2 overflow-hidden">
                    {issue.voters.map((voter, idx) => (
                      <div
                        key={idx}
                        title={`Verified Citizen: ${voter.substring(0, 8)}`}
                        className="inline-block h-7 w-7 rounded-full bg-slate-200 ring-2 ring-white text-[11px] font-bold text-slate-600 flex items-center justify-center border border-slate-300"
                      >
                        {voter.charAt(0).toUpperCase()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Location Map and Demo Simulator (35%) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-[88px]">
          
          {/* Location details Map Card */}
          <div className="bg-white border border-[#e5e7eb] rounded-[8px] p-6">
            <h3 className="text-[18px] font-semibold text-body-text mb-2">Location Coordinates</h3>
            <p className="text-[13px] text-sec-text flex items-start gap-1.5 mb-4">
              <MapPin className="w-4 h-4 text-saffron shrink-0 mt-0.5" />
              <span>{issue.location.address}</span>
            </p>

            <div className="h-[200px] w-full rounded-[6px] overflow-hidden border border-[#e5e7eb] relative mb-3 bg-slate-100">
              <div ref={mapContainerRef} className="w-full h-full" />
            </div>

            <div className="text-[11px] text-sec-text flex items-center justify-between">
              <span>Latitude: {issue.location.lat.toFixed(4)}</span>
              <span>Longitude: {issue.location.lng.toFixed(4)}</span>
            </div>
          </div>

          {/* Workflow Status update simulator (Indian Municipal Works) */}
          <div className="bg-[#fcfcff] border border-blue-100 rounded-[8px] p-6">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-navy-blue" />
              <h3 className="text-[16px] font-bold text-navy-blue">Municipal Admin Simulator</h3>
            </div>
            <p className="text-[12px] text-sec-text mb-4 leading-relaxed">
              In production, government officers use our department dashboard to verify and progress issues. Simulate that workflow here:
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => handleSimulateStatus("verified")}
                disabled={issue.status === "verified" || isUpdatingStatus}
                className={`w-full flex items-center justify-between text-[13px] font-medium p-3 rounded-[6px] border transition-all ${
                  issue.status === "verified"
                    ? "bg-blue-50/50 text-navy-blue border-blue-200"
                    : "bg-white text-body-text border-[#d1d5db] hover:border-navy-blue"
                }`}
              >
                <span>Move to <strong>Verified</strong></span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleSimulateStatus("inProgress")}
                disabled={issue.status === "inProgress" || isUpdatingStatus}
                className={`w-full flex items-center justify-between text-[13px] font-medium p-3 rounded-[6px] border transition-all ${
                  issue.status === "inProgress"
                    ? "bg-amber-50/50 text-[#d97706] border-amber-200"
                    : "bg-white text-body-text border-[#d1d5db] hover:border-navy-blue"
                }`}
              >
                <span>Move to <strong>In Progress</strong></span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleSimulateStatus("resolved")}
                disabled={issue.status === "resolved" || isUpdatingStatus}
                className={`w-full flex items-center justify-between text-[13px] font-medium p-3 rounded-[6px] border transition-all ${
                  issue.status === "resolved"
                    ? "bg-green-50/50 text-green-success border-green-200"
                    : "bg-white text-body-text border-[#d1d5db] hover:border-navy-blue"
                }`}
              >
                <span>Mark as <strong>Resolved</strong></span>
                <Check className="w-4 h-4" />
              </button>
            </div>

            {issue.status === "resolved" && (
              <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-[6px] text-[11px] text-[#166534] leading-relaxed">
                🎉 This issue is resolved! The original reporter and all verification upvoters have been awarded their points bonus.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
