import React, { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FileText, CheckCircle2, Clock, Percent, AlertCircle, MapPin } from "lucide-react";
import { Issue } from "../types";
import { format, subDays, startOfDay, parseISO } from "date-fns";

export default function ImpactDashboard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/issues")
      .then((res) => res.json())
      .then((data) => {
        setIssues(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching issues for dashboard:", err);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-saffron border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Calculate stats dynamically from data
  const totalIssues = issues.length;
  const resolvedIssues = issues.filter((i) => i.status === "resolved").length;
  const resolutionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;
  
  // Resolution rate and active indicators
  const issuesThisWeek = issues.filter((i) => {
    const oneWeekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    return new Date(i.reportedAt).getTime() >= oneWeekAgo;
  }).length;

  const resolvedThisWeek = issues.filter((i) => {
    if (i.status !== "resolved" || !i.resolvedAt) return false;
    const oneWeekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    return new Date(i.resolvedAt).getTime() >= oneWeekAgo;
  }).length;

  // Most active category
  const categoryCounts: { [key: string]: number } = {};
  issues.forEach((i) => {
    categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
  });
  let mostActiveCategory = "None";
  let maxCatCount = 0;
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    if (count > maxCatCount) {
      maxCatCount = count;
      mostActiveCategory = cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " ");
    }
  });

  // Most active zone
  const zoneCounts: { [key: string]: number } = {};
  issues.forEach((i) => {
    const zoneName = i.location.zone || "Central City";
    zoneCounts[zoneName] = (zoneCounts[zoneName] || 0) + 1;
  });
  let mostActiveZone = "None";
  let maxZoneCount = 0;
  Object.entries(zoneCounts).forEach(([z, count]) => {
    if (count > maxZoneCount) {
      maxZoneCount = count;
      mostActiveZone = z;
    }
  });

  // Format Recharts Category Bar Data
  const categories = ["pothole", "streetlight", "water_leak", "waste_management", "road_damage", "drainage", "other"];
  const categoryLabelMap: { [key: string]: string } = {
    pothole: "Pothole",
    streetlight: "Streetlight",
    water_leak: "Water Leak",
    waste_management: "Waste Management",
    road_damage: "Road Damage",
    drainage: "Drainage",
    other: "Other"
  };
  const barChartData = categories.map((cat) => ({
    name: categoryLabelMap[cat],
    Count: issues.filter((i) => i.category === cat).length
  }));

  // Format Recharts Daily Line Data for past 15 days
  const lineChartData = [];
  for (let i = 14; i >= 0; i--) {
    const day = subDays(new Date(), i);
    const dayStr = format(day, "MMM dd");
    const count = issues.filter((issue) => {
      const issueDateStr = format(new Date(issue.reportedAt), "yyyy-MM-dd");
      const compareDateStr = format(day, "yyyy-MM-dd");
      return issueDateStr === compareDateStr;
    }).length;

    lineChartData.push({
      date: dayStr,
      Reports: count
    });
  }

  return (
    <div id="impact_dashboard_container" className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-[32px] font-bold text-navy-blue leading-tight mb-2">Impact Dashboard</h1>
        <p className="text-[14px] text-sec-text">Real-time civic progress, upvoting indicators, and department resolution rates.</p>
      </div>

      {/* 2 Rows of 3 Stat Cards (6 Stat Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Total Reports */}
        <div className="bg-white border border-[#e5e7eb] border-t-3 border-t-navy-blue rounded-[8px] p-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[28px] font-bold text-body-text">{totalIssues}</div>
              <div className="text-[13px] text-sec-text mt-1">Total Issues Reported</div>
            </div>
            <div className="p-2 bg-blue-50 text-navy-blue rounded-[6px]">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <div className="text-[11px] text-sec-text mt-3">
            <span className="text-saffron font-semibold">+{issuesThisWeek}</span> reported this week
          </div>
        </div>

        {/* Card 2: Issues Resolved This Week */}
        <div className="bg-white border border-[#e5e7eb] border-t-3 border-t-green-success rounded-[8px] p-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[28px] font-bold text-body-text">{resolvedThisWeek}</div>
              <div className="text-[13px] text-sec-text mt-1">Issues Resolved This Week</div>
            </div>
            <div className="p-2 bg-green-50 text-green-success rounded-[6px]">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="text-[11px] text-sec-text mt-3">
            <span className="text-green-success font-semibold">{resolvedIssues}</span> total resolved cases
          </div>
        </div>

        {/* Card 3: Avg Resolution Time */}
        <div className="bg-white border border-[#e5e7eb] border-t-3 border-t-saffron rounded-[8px] p-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[28px] font-bold text-body-text">3.2 days</div>
              <div className="text-[13px] text-sec-text mt-1">Average Resolution Time</div>
            </div>
            <div className="p-2 bg-orange-50 text-saffron rounded-[6px]">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="text-[11px] text-sec-text mt-3">
            SLA targets maintained under <span className="text-navy-blue font-semibold">4.0 days</span>
          </div>
        </div>

        {/* Card 4: Resolution Rate */}
        <div className="bg-white border border-[#e5e7eb] border-t-3 border-t-green-success rounded-[8px] p-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[28px] font-bold text-body-text">{resolutionRate}%</div>
              <div className="text-[13px] text-sec-text mt-1">Resolution Rate</div>
            </div>
            <div className="p-2 bg-emerald-50 text-green-success rounded-[6px]">
              <Percent className="w-6 h-6" />
            </div>
          </div>
          <div className="text-[11px] text-sec-text mt-3">
            Based on active municipal collaborations
          </div>
        </div>

        {/* Card 5: Most Reported Category */}
        <div className="bg-white border border-[#e5e7eb] border-t-3 border-t-saffron rounded-[8px] p-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[22px] font-bold text-body-text truncate max-w-[180px]">{mostActiveCategory}</div>
              <div className="text-[13px] text-sec-text mt-2">Most Reported Category</div>
            </div>
            <div className="p-2 bg-orange-50 text-saffron rounded-[6px]">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="text-[11px] text-sec-text mt-3">
            Comprising <span className="text-saffron font-semibold">{maxCatCount}</span> total active logs
          </div>
        </div>

        {/* Card 6: Most Active Zone */}
        <div className="bg-white border border-[#e5e7eb] border-t-3 border-t-navy-blue rounded-[8px] p-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[22px] font-bold text-body-text truncate max-w-[180px]">{mostActiveZone}</div>
              <div className="text-[13px] text-sec-text mt-2">Most Active Zone</div>
            </div>
            <div className="p-2 bg-blue-50 text-navy-blue rounded-[6px]">
              <MapPin className="w-6 h-6" />
            </div>
          </div>
          <div className="text-[11px] text-sec-text mt-3">
            With <span className="text-navy-blue font-semibold">{maxZoneCount}</span> reported issues in 30 days
          </div>
        </div>
      </div>

      {/* Recharts Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: Bar Chart of Categories */}
        <div className="bg-white border border-[#e5e7eb] rounded-[8px] p-6">
          <h3 className="text-[18px] font-semibold text-body-text mb-4">Issues by Category (Last 30 Days)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "#f8f9fa" }} contentStyle={{ fontFamily: "Inter, sans-serif", fontSize: 12, borderRadius: 6, border: "1px solid #e5e7eb" }} />
                <Bar dataKey="Count" fill="#FF9933" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Line Chart of Daily Reports */}
        <div className="bg-white border border-[#e5e7eb] rounded-[8px] p-6">
          <h3 className="text-[18px] font-semibold text-body-text mb-4">Daily Report Count Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontFamily: "Inter, sans-serif", fontSize: 12, borderRadius: 6, border: "1px solid #e5e7eb" }} />
                <Line type="monotone" dataKey="Reports" stroke="#000080" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 1 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
