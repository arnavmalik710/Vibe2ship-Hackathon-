import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User } from "../types";
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../lib/firebase";

interface AuthProps {
  onLoginSuccess: (user: User) => void;
}

export function Login({ onLoginSuccess }: AuthProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required.");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      // 1. Authenticate with Firebase Auth
      let firebaseUser;
      try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        firebaseUser = result.user;
      } catch (fbErr: any) {
        if (fbErr.code === "auth/operation-not-allowed" || fbErr.message?.includes("operation-not-allowed")) {
          console.warn("Firebase Email/Password Auth is disabled. Falling back to local backend login.");
        } else if (
          fbErr.code === "auth/user-not-found" ||
          fbErr.code === "auth/invalid-credential" ||
          fbErr.message?.includes("user-not-found") ||
          fbErr.message?.includes("invalid-credential")
        ) {
          try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            firebaseUser = result.user;
          } catch (createErr: any) {
            if (createErr.code === "auth/operation-not-allowed" || createErr.message?.includes("operation-not-allowed")) {
              console.warn("Firebase Email/Password Auth is disabled during user registration fallback.");
            } else {
              throw new Error(createErr.message || "Failed to authenticate or create user in Firebase.");
            }
          }
        } else {
          throw fbErr;
        }
      }

      // 2. Sync with Express Backend DB
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed on backend.");
      }
      onLoginSuccess(data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      // 1. Authenticate with Google via Firebase Popup
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      if (!firebaseUser.email) {
        throw new Error("Could not retrieve email from Google Account.");
      }

      // 2. Synchronize user with our Express backend (Sign Up if new, or Log In if existing)
      const signupRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: firebaseUser.displayName || firebaseUser.email.split("@")[0] || "Citizen Watchdog",
          email: firebaseUser.email,
          password: "google-oauth-managed-password"
        })
      });

      let data;
      if (signupRes.ok) {
        data = await signupRes.json();
      } else {
        // If they already exist, try to log in
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: firebaseUser.email })
        });
        if (!loginRes.ok) {
          const loginData = await loginRes.json();
          throw new Error(loginData.error || "Failed to log in on backend after Google authentication.");
        }
        data = await loginRes.json();
      }

      onLoginSuccess(data.user);
      navigate("/");
    } catch (err: any) {
      console.error("Google sign in error:", err);
      setError(err.message || "Failed to authenticate with Google.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="login_container" className="min-h-[80vh] flex items-center justify-center px-4 bg-white">
      <div className="w-full max-w-[400px] border border-[#e5e7eb] rounded-[8px] p-6 sm:p-8 bg-white">
        <div className="text-center mb-6">
          <div className="text-[24px] font-bold text-navy-blue tracking-tight mb-1">NagarVoice</div>
          <p
            className="text-[13px] text-sec-text"
            style={{
              fontWeight: "normal",
              textDecorationLine: "none",
              fontStyle: "normal",
              fontFamily: "Courier New",
              textAlign: "center",
            }}
          >
            Give Your City a Voice
          </p>
        </div>

        <h3 className="text-center text-[18px] font-semibold text-body-text mb-6">Sign in to your account</h3>

        {error && (
          <div id="login_error" className="mb-4 p-3 bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-[13px] rounded-[6px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@example.com"
              className="w-full bg-white border border-[#d1d5db] rounded-[6px] px-3 py-2 text-[14px] focus:border-saffron focus:outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border border-[#d1d5db] rounded-[6px] px-3 py-2 text-[14px] focus:border-saffron focus:outline-none transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-saffron hover:bg-saffron-hover disabled:bg-saffron/50 text-white font-semibold py-2.5 px-4 rounded-[6px] text-[14px] transition-colors"
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#e5e7eb]"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-sec-text text-[11px]">or</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          disabled={isLoading}
          className="w-full bg-white hover:bg-slate-50 text-body-text font-medium border border-[#e5e7eb] py-2 px-4 rounded-[6px] text-[14px] flex items-center justify-center gap-2 transition-colors"
        >
          {/* Custom SVG Google icon */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5.04c1.62 0 3.08.56 4.22 1.64l3.15-3.15C17.45 1.68 14.93 1 12 1 7.35 1 3.4 3.65 1.48 7.5l3.86 3C6.26 7.4 8.9 5.04 12 5.04z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.46-1.1 2.7-2.34 3.53l3.63 2.82c2.13-1.97 3.76-4.87 3.76-8.45z"
            />
            <path
              fill="#FBBC05"
              d="M5.34 10.5C5.09 11.27 4.95 12.1 4.95 13s.14 1.73.39 2.5l-3.86 3C.53 16.74 0 14.93 0 13s.53-3.74 1.48-5.5l3.86 3z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.63-2.82c-1.01.68-2.31 1.09-3.96 1.09-3.1 0-5.74-2.36-6.68-5.46l-3.86 3C3.4 20.35 7.35 23 12 23z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-[13px] text-sec-text mt-6">
          Don't have an account?{" "}
          <Link to="/signup" className="text-navy-blue font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export function Signup({ onLoginSuccess }: AuthProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      // 1. Create user in Firebase Auth
      try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
      } catch (createErr: any) {
        if (createErr.code === "auth/operation-not-allowed" || createErr.message?.includes("operation-not-allowed")) {
          console.warn("Firebase Email/Password Auth is disabled. Falling back to local backend registration.");
        } else {
          throw createErr;
        }
      }

      // 2. Register user in backend Express database
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Signup failed on backend database.");
      }
      onLoginSuccess(data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="signup_container" className="min-h-[80vh] flex items-center justify-center px-4 bg-white">
      <div className="w-full max-w-[400px] border border-[#e5e7eb] rounded-[8px] p-6 sm:p-8 bg-white">
        <div className="text-center mb-6">
          <div className="text-[24px] font-bold text-navy-blue tracking-tight mb-1">NagarVoice</div>
          <p className="text-[13px] text-sec-text">Give Your City a Voice</p>
        </div>

        <h3 className="text-center text-[18px] font-semibold text-body-text mb-6">Create your account</h3>

        {error && (
          <div id="signup_error" className="mb-4 p-3 bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-[13px] rounded-[6px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full bg-white border border-[#d1d5db] rounded-[6px] px-3 py-2 text-[14px] focus:border-saffron focus:outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@example.com"
              className="w-full bg-white border border-[#d1d5db] rounded-[6px] px-3 py-2 text-[14px] focus:border-saffron focus:outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border border-[#d1d5db] rounded-[6px] px-3 py-2 text-[14px] focus:border-saffron focus:outline-none transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-saffron hover:bg-saffron-hover disabled:bg-saffron/50 text-white font-semibold py-2.5 px-4 rounded-[6px] text-[14px] transition-colors"
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-[13px] text-sec-text mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-navy-blue font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
