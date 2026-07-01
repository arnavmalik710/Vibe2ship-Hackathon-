import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Award, Lock, ShieldAlert, CheckCircle2, MessageSquare, Plus, Check } from "lucide-react";
import { User, Issue } from "../types";
import { formatDistanceToNow } from "date-fns";
import { getIssueImage } from "../utils";

interface ProfileProps {
  currentUser: User | null;
}

export default function Profile({ currentUser }: ProfileProps) {
  const navigate = useNavigate();
  const [userReports, setUserReports] = useState<Issue[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Badge configs
  const badgeConfig = [
    {
      name: "First Voice",
      description: "Report your first civic issue",
      icon: Award,
      color: "text-amber-500 bg-amber-50 border-amber-200"
    },
    {
      name: "Watchdog",
      description: "Report 10 or more civic issues",
      icon: ShieldAlert,
      color: "text-[#dc2626] bg-red-50 border-red-200"
    },
    {
      name: "Community Guardian",
      description: "Perform 10 or more verifications/upvotes",
      icon: CheckCircle2,
      color: "text-[#000080] bg-blue-50 border-blue-200"
    },
    {
      name: "City Champion",
      description: "Get 5 or more of your reported issues resolved",
      icon: CheckCircle2,
      color: "text-green-success bg-green-50 border-green-200"
    }
  ];

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    // Load full user details by refetching leaderboard or user direct to get latest points
    const loadData = async () => {
      try {
        const issuesRes = await fetch("/api/issues");
        const issuesData = await issuesRes.json();
        
        // Filter issues reported by current user
        const filteredReports = issuesData.filter((i: Issue) => i.reportedBy === currentUser.uid);
        setUserReports(filteredReports);

        const usersRes = await fetch("/api/users/leaderboard");
        const usersData = await usersRes.json();
        setAllUsers(usersData);
      } catch (err) {
        console.error("Error loading profile data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  if (!currentUser) return null;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-saffron border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Find latest active profile details from list
  const activeUser = allUsers.find((u) => u.uid === currentUser.uid) || currentUser;

  // Render status badging
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

  return (
    <div id="profile_container" className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header Profile Info card */}
      <div className="bg-white border border-[#e5e7eb] rounded-[8px] p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-saffron/10 border-2 border-saffron flex items-center justify-center text-saffron font-bold text-2xl sm:text-3xl shrink-0">
          {activeUser.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-grow">
          <h2 className="text-[26px] font-bold text-navy-blue leading-tight mb-1">{activeUser.displayName}</h2>
          <p className="text-[14px] text-sec-text mb-4">{activeUser.email}</p>
          
          <div className="flex flex-wrap justify-center sm:justify-start gap-4">
            <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-[6px] px-5 py-2.5">
              <div className="text-[20px] font-bold text-saffron">{activeUser.points}</div>
              <div className="text-[12px] text-sec-text font-medium uppercase mt-0.5">Points Balance</div>
            </div>
            <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-[6px] px-5 py-2.5">
              <div className="text-[20px] font-bold text-navy-blue">{userReports.length}</div>
              <div className="text-[12px] text-sec-text font-medium uppercase mt-0.5">Reports Sent</div>
            </div>
            <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-[6px] px-5 py-2.5">
              <div className="text-[20px] font-bold text-green-success">{activeUser.verificationsCount}</div>
              <div className="text-[12px] text-sec-text font-medium uppercase mt-0.5">Verifications</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Gamified Badges Earned (40%) */}
        <div className="lg:col-span-5 bg-white border border-[#e5e7eb] rounded-[8px] p-6 h-fit">
          <h3 className="text-[18px] font-bold text-body-text mb-4">Badges & Accomplishments</h3>
          <p className="text-[13px] text-sec-text mb-6">Earn points, report issues, and verify reports to unlock special municipal ranks.</p>

          <div className="space-y-4">
            {badgeConfig.map((badge, index) => {
              const isEarned = activeUser.badges.includes(badge.name);
              const BadgeIcon = badge.icon;

              return (
                <div
                  key={index}
                  className={`border rounded-[8px] p-4 flex items-start gap-4 transition-all ${
                    isEarned ? `${badge.color}` : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                  }`}
                >
                  <div className={`p-2.5 rounded-[6px] ${isEarned ? "bg-white" : "bg-slate-200"} shrink-0`}>
                    <BadgeIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between gap-2">
                      <div className={`text-[14px] font-bold ${isEarned ? "text-body-text" : "text-slate-400"}`}>
                        {badge.name}
                      </div>
                      {isEarned ? (
                        <span className="text-[10px] font-bold text-green-success bg-green-50 border border-green-200 px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Unlocked
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-sec-text mt-1 leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: User's reported issues history list (60%) */}
        <div className="lg:col-span-7 bg-white border border-[#e5e7eb] rounded-[8px] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[18px] font-bold text-body-text">My Reports History</h3>
            <Link
              to="/report"
              className="bg-saffron hover:bg-saffron-hover text-white text-[12px] font-semibold px-3 py-1.5 rounded-[4px] flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Log Issue
            </Link>
          </div>

          {userReports.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#e5e7eb] rounded-[6px] bg-[#f8f9fa]">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-[13px] font-bold text-slate-500">No issues reported yet</div>
              <p className="text-[12px] text-sec-text mt-1 max-w-sm mx-auto">Help make your city clean and safe. Upload a photo of a broken light, pothole, or waste clog now!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userReports.map((issue) => (
                <div
                  key={issue.id}
                  onClick={() => navigate(`/issues/${issue.id}`)}
                  className="border border-[#e5e7eb] rounded-[8px] p-4 bg-white hover:border-saffron transition-all cursor-pointer flex gap-4"
                >
                  <img
                    src={getIssueImage(issue)}
                    alt={issue.title}
                    className="w-16 h-16 rounded-[6px] object-cover shrink-0 bg-slate-100 border border-[#e5e7eb]"
                  />
                  <div className="flex-grow min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h4 className="text-[14px] font-bold text-body-text truncate">{issue.title}</h4>
                      {getStatusBadge(issue.status)}
                    </div>
                    <p className="text-[12px] text-sec-text line-clamp-2 leading-relaxed">{issue.description}</p>
                    <div className="flex items-center justify-between mt-2 text-[11px] text-sec-text">
                      <span>{issue.location.address.split(",")[0]}, {issue.location.zone}</span>
                      <span>{formatDistanceToNow(new Date(issue.reportedAt))} ago</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
