readme# NagarVoice

> Give Your City a Voice

NagarVoice is an AI-powered hyperlocal civic issue reporting platform built for Indian communities. Citizens report infrastructure problems, Gemini AI analyzes and prioritizes them, and a live map tracks resolution in real time. The platform predicts where problems will emerge next, shifting civic management from reactive to proactive.

Built for the Vibe2Ship Hackathon 2026.

---

## Live Demo

🌐 [nagarvoice.web.app](https://nagarvoice-377221974271.us-west1.run.app/insights)

Opens directly in demo mode — no sign up required to explore.

---

## What Makes NagarVoice Different

Every other civic app at this hackathon has a report form and a map. NagarVoice has four autonomous AI agents running in the background, a real-time City Health Score, a public accountability board for unresolved issues, and a conversational AI assistant- all visible and working from the moment the app opens.

---

## Features

- **City Health Score** — real-time 0-100 infrastructure index calculated from resolution rates, severity signals, and community verification data
- **AI Photo Analysis** — upload a photo, Gemini Vision classifies the issue, assigns severity, and fills the entire form automatically
- **Live Issue Map** — color-coded pins, heatmap pulse animations on problem hotspots, one-tap location finding
- **Four AI Agents** — Reporter, Verifier, Prioritizer, and Predictor agents running autonomously
- **Predictive Insights** — 30-day pattern analysis forecasting which zones will face infrastructure problems next
- **Wall of Shame** — public accountability board showing the longest unresolved issues with live day counters
- **AI Agent Activity Feed** — real-time log of every agent action visible on the home page
- **Weekly Nagar Report** — Gemini-generated weekly civic intelligence summary
- **Community Verification** — citizens upvote and verify issues, increasing priority scores
- **Gamification** — points and badges for reporting and verifying, with a community leaderboard
- **Anonymous Reporting** — report sensitive issues without public identity disclosure
- **AI Civic Assistant** — conversational Gemini chatbot answering natural language questions about city data
- **Impact Dashboard** — resolution rates, trend charts, zone-level analytics

---

## The Four AI Agents

```
Reporter Agent    — Analyzes uploaded photos with Gemini Vision
                    Classifies issue type, severity, department

Verifier Agent    — Checks new reports against nearby existing issues
                    Prevents duplicates, merges similar reports

Prioritizer Agent — Scores every issue using severity, votes, and age
                    Generates priority queue for authorities

Predictor Agent   — Analyzes 30-day zone history with Gemini
                    Forecasts at-risk areas before problems peak
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Tailwind CSS |
| AI Core | Google Gemini 1.5 Pro (Google AI Studio) |
| Maps | Leaflet.js |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Storage | Firebase Storage |
| Deployment | Firebase Hosting |

---

## Google Technologies Used

- Google AI Studio (core development environment)
- Google Gemini 1.5 Pro API (image analysis, predictions, chat, reports)
- Firebase Authentication
- Firebase Firestore
- Firebase Storage
- Firebase Hosting

---

## Project Structure

```
src/
├── components/
│   ├── Auth.tsx              # Login and signup
│   ├── CitizenMap.tsx        # Live issue map
│   ├── ImpactDashboard.tsx   # Analytics dashboard
│   ├── IssueDetail.tsx       # Single issue view
│   ├── IssuesList.tsx        # All issues with filters
│   ├── Leaderboard.tsx       # Community rankings
│   ├── Navbar.tsx            # Navigation
│   ├── PredictiveInsights.tsx # AI zone predictions
│   ├── Profile.tsx           # User profile
│   └── ReportIssue.tsx       # Issue reporting form
├── lib/
│   └── firebase.ts           # Firebase config
├── App.tsx                   # Root component and routing
├── types.ts                  # TypeScript types
└── utils.ts                  # Helper functions
```

---

## Setup

```bash
git clone https://github.com/yourusername/Vibe2ship-Hackathon-
cd Vibe2ship-Hackathon-
cp .env.example .env
# Fill in your API keys in .env
npm install
npm run dev
```

---

## Environment Variables

```env
VITE_GEMINI_API_KEY=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## Built By

Arnav Malik <3
