import React, { useEffect, useState } from "react";
import { Award, Trophy, Star, ShieldAlert } from "lucide-react";
import { User } from "../types";

export default function Leaderboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/leaderboard")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error loading leaderboard:", err);
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

  return (
    <div id="leaderboard_container" className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-[32px] font-bold text-navy-blue tracking-tight mb-2">Community Champions</h1>
        <p className="text-[14px] text-sec-text">Top citizens reporting issues, verifying, and earning points this week.</p>
      </div>

      {/* Podium highlight top 3 */}
      {users.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 items-end">
          {/* Rank 2 */}
          <div className="bg-slate-50 border border-[#e5e7eb] rounded-[8px] p-5 text-center flex flex-col items-center order-2 sm:order-1 relative">
            <div className="absolute top-3 left-3 text-[12px] font-bold text-slate-500">#2 Rank</div>
            <div className="w-12 h-12 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 text-lg mb-3 mt-2">
              {users[1].displayName.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-[15px] font-bold text-body-text">{users[1].displayName}</h3>
            <div className="text-[14px] text-slate-600 font-semibold mt-1">{users[1].points} pts</div>
            <p className="text-[11px] text-sec-text mt-1">{users[1].badges.length} badges earned</p>
          </div>

          {/* Rank 1 */}
          <div className="bg-amber-50 border-2 border-saffron rounded-[8px] p-6 text-center flex flex-col items-center order-1 sm:order-2 relative shadow-sm scale-105">
            <div className="absolute top-3 left-3 text-[12px] font-bold text-saffron flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> #1 Rank
            </div>
            <div className="w-14 h-14 rounded-full bg-saffron/20 border-2 border-saffron flex items-center justify-center font-bold text-saffron text-xl mb-3 mt-2">
              {users[0].displayName.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-[17px] font-bold text-body-text">{users[0].displayName}</h3>
            <div className="text-[16px] text-saffron font-bold mt-1">{users[0].points} pts</div>
            <p className="text-[11px] text-amber-800 font-semibold mt-1">{users[0].badges.length} badges earned</p>
          </div>

          {/* Rank 3 */}
          <div className="bg-slate-50 border border-[#e5e7eb] rounded-[8px] p-5 text-center flex flex-col items-center order-3 relative">
            <div className="absolute top-3 left-3 text-[12px] font-bold text-amber-700">#3 Rank</div>
            <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center font-bold text-amber-800 text-lg mb-3 mt-2">
              {users[2].displayName.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-[15px] font-bold text-body-text">{users[2].displayName}</h3>
            <div className="text-[14px] text-amber-900 font-semibold mt-1">{users[2].points} pts</div>
            <p className="text-[11px] text-sec-text mt-1">{users[2].badges.length} badges earned</p>
          </div>
        </div>
      )}

      {/* Main List view */}
      <div className="border border-[#e5e7eb] rounded-[8px] overflow-hidden bg-white">
        <div className="grid grid-cols-12 bg-slate-50 border-b border-[#e5e7eb] py-3 px-4 text-[12px] font-bold text-sec-text uppercase">
          <div className="col-span-2 text-center">Rank</div>
          <div className="col-span-5">Citizen</div>
          <div className="col-span-3 text-center">Badges</div>
          <div className="col-span-2 text-right">Points</div>
        </div>

        <div className="divide-y divide-[#e5e7eb]">
          {users.map((user, index) => {
            const rank = index + 1;
            
            // Custom rankings border styles according to spec
            let rankBorderClass = "";
            if (rank === 1) rankBorderClass = "border-l-[4px] border-l-saffron";
            else if (rank === 2) rankBorderClass = "border-l-[4px] border-l-[#9ca3af]";
            else if (rank === 3) rankBorderClass = "border-l-[4px] border-l-[#d97706]";

            const isEven = rank % 2 === 0;
            const bgClass = isEven ? "bg-[#f8f9fa]" : "bg-white";

            return (
              <div
                key={user.uid}
                className={`grid grid-cols-12 items-center py-4 px-4 text-[14px] ${rankBorderClass} ${bgClass}`}
              >
                {/* Rank number */}
                <div className="col-span-2 text-center font-bold text-body-text">
                  {rank === 1 ? (
                    <span className="inline-flex w-6 h-6 items-center justify-center bg-saffron text-white rounded-full text-xs">1</span>
                  ) : rank === 2 ? (
                    <span className="inline-flex w-6 h-6 items-center justify-center bg-slate-400 text-white rounded-full text-xs">2</span>
                  ) : rank === 3 ? (
                    <span className="inline-flex w-6 h-6 items-center justify-center bg-amber-700 text-white rounded-full text-xs">3</span>
                  ) : (
                    rank
                  )}
                </div>

                {/* Name */}
                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-sec-text text-sm">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-body-text leading-tight">{user.displayName}</div>
                    <div className="text-[11px] text-sec-text mt-0.5">{user.reportsCount} issues logged</div>
                  </div>
                </div>

                {/* Badges Count */}
                <div className="col-span-3 text-center">
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    <Award className="w-3.5 h-3.5 text-saffron" />
                    {user.badges.length} Earned
                  </span>
                </div>

                {/* Total Points */}
                <div className="col-span-2 text-right font-bold text-navy-blue">
                  {user.points} pts
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
