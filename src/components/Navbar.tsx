import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, LogOut, Award, Map, BarChart2, BookOpen, Layers, User } from "lucide-react";
import { User as UserType } from "../types";

interface NavbarProps {
  currentUser: UserType | null;
  onLogout: () => void;
}

export default function Navbar({ currentUser, onLogout }: NavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header id="nav_header" className="h-[64px] min-h-[64px] fixed top-0 left-0 right-0 bg-white border-b border-[#e5e7eb] z-50 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-8 shrink-0 min-w-0">
        <Link id="nav_logo" to="/" className="flex items-baseline gap-2 shrink-0">
          <span className="text-[19px] sm:text-[20px] font-bold text-navy-blue tracking-tight shrink-0">NagarVoice</span>
          <span className="hidden md:inline text-[12px] text-sec-text font-normal shrink-0">Give Your City a Voice</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6">
          <Link
            id="nav_link_home"
            to="/"
            className={`text-[14px] font-medium transition-colors ${
              isActive("/") ? "text-saffron" : "text-body-text hover:text-saffron"
            }`}
          >
            Home Map
          </Link>
          <Link
            id="nav_link_issues"
            to="/issues"
            className={`text-[14px] font-medium transition-colors ${
              isActive("/issues") ? "text-saffron" : "text-body-text hover:text-saffron"
            }`}
          >
            All Issues
          </Link>
          <Link
            id="nav_link_dashboard"
            to="/dashboard"
            className={`text-[14px] font-medium transition-colors ${
              isActive("/dashboard") ? "text-saffron" : "text-body-text hover:text-saffron"
            }`}
          >
            Impact Dashboard
          </Link>
          <Link
            id="nav_link_insights"
            to="/insights"
            className={`text-[14px] font-medium transition-colors ${
              isActive("/insights") ? "text-saffron" : "text-body-text hover:text-saffron"
            }`}
          >
            AI Insights
          </Link>
          <Link
            id="nav_link_leaderboard"
            to="/leaderboard"
            className={`text-[14px] font-medium transition-colors ${
              isActive("/leaderboard") ? "text-saffron" : "text-body-text hover:text-saffron"
            }`}
          >
            Leaderboard
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {currentUser ? (
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link
              id="nav_link_profile"
              to="/profile"
              className="flex items-center gap-1.5 hover:opacity-80 shrink-0"
            >
              <div className="w-8 h-8 rounded-full bg-saffron/10 border border-saffron flex items-center justify-center text-saffron font-bold text-sm shrink-0">
                {currentUser.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left shrink-0">
                <div className="text-[13px] font-semibold text-body-text leading-none">{currentUser.displayName}</div>
                <div className="text-[11px] text-saffron font-bold flex items-center gap-1 mt-0.5">
                  <Award className="w-3.5 h-3.5" />
                  {currentUser.points} pts
                </div>
              </div>
            </Link>

            <button
              id="nav_btn_logout"
              onClick={onLogout}
              title="Logout"
              className="p-1.5 text-sec-text hover:text-[#dc2626] transition-colors rounded-md shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>

            <Link
              id="nav_btn_report"
              to="/report"
              className="bg-saffron hover:bg-saffron-hover text-white text-[11px] min-[360px]:text-[12px] sm:text-[13px] font-semibold px-2 min-[360px]:px-3 py-1.5 sm:px-4 sm:py-2 rounded-[6px] transition-colors flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap"
            >
              Report Issue
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 min-[360px]:gap-2 sm:gap-3 shrink-0">
            <Link
              id="nav_btn_login"
              to="/login"
              className="text-navy-blue border border-navy-blue text-[11px] min-[360px]:text-[12px] sm:text-[13px] font-semibold px-2 min-[360px]:px-3.5 py-1.5 sm:py-1.5 rounded-[6px] transition-all hover:bg-[#f0f0ff] shrink-0 whitespace-nowrap"
            >
              Login
            </Link>

            <Link
              id="nav_btn_report_guest"
              to="/report"
              className="bg-saffron hover:bg-saffron-hover text-white text-[11px] min-[360px]:text-[12px] sm:text-[13px] font-semibold px-2 min-[360px]:px-3.5 py-1.5 sm:py-1.5 rounded-[6px] transition-colors shrink-0 whitespace-nowrap"
            >
              Report Issue
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
