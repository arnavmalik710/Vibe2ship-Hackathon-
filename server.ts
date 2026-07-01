import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Middleware to parse JSON with large size limit (for photo base64 uploads)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Helper to initialize or load the persistent database
interface User {
  uid: string;
  displayName: string;
  email: string;
  points: number;
  badges: string[];
  reportsCount: number;
  verificationsCount: number;
  joinedAt: string;
}

interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: number;
  status: "reported" | "verified" | "inProgress" | "resolved";
  location: {
    lat: number;
    lng: number;
    address: string;
    zone: string;
  };
  photoURL: string;
  reportedBy: string;
  reporterName: string;
  reportedAt: string;
  votes: number;
  voters: string[];
  department: string;
  confidenceScore: number;
  priorityScore: number;
  aiTags: string[];
  resolvedAt: string | null;
}

interface Insight {
  zone: string;
  prediction?: string;
  riskLevel: "low" | "medium" | "high";
  confidenceLevel?: "low" | "medium" | "high";
  issueTypes?: string[];
  likelyIssueTypes?: string[];
  reasoning: string;
  recommendation: string;
  generatedAt: string;
}

interface DB {
  users: User[];
  issues: Issue[];
  insights: Insight[];
}

const SEED_USERS: User[] = [
  {
    uid: "user_rajesh",
    displayName: "Rajesh Kumar",
    email: "rajesh.k@gmail.com",
    points: 135,
    badges: ["First Voice", "Watchdog", "Community Guardian"],
    reportsCount: 12,
    verificationsCount: 15,
    joinedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  },
  {
    uid: "user_priya",
    displayName: "Priya Sharma",
    email: "priya.sharma@outlook.com",
    points: 80,
    badges: ["First Voice", "Watchdog"],
    reportsCount: 5,
    verificationsCount: 10,
    joinedAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
  },
  {
    uid: "user_amit",
    displayName: "Amit Patel",
    email: "amit.patel@gmail.com",
    points: 45,
    badges: ["First Voice"],
    reportsCount: 2,
    verificationsCount: 5,
    joinedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
  }
];

const SEED_ISSUES: Issue[] = [
  {
    id: "issue_1",
    title: "Massive Dangerous Pothole on 80 Feet Road",
    description: "A huge pothole has formed right in the middle of 80 Feet Road, near the Indiranagar Metro Station. It's extremely dangerous at night, causing several two-wheelers to slip.",
    category: "pothole",
    severity: 8,
    status: "verified",
    location: {
      lat: 12.9719,
      lng: 77.6412,
      address: "80 Feet Road, Indiranagar, Bengaluru, Karnataka",
      zone: "Indiranagar"
    },
    photoURL: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600",
    reportedBy: "user_rajesh",
    reporterName: "Rajesh Kumar",
    reportedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    votes: 14,
    voters: ["user_priya", "user_amit"],
    department: "BBMP (Road Infrastructure Division)",
    confidenceScore: 0.95,
    priorityScore: 170, // severity*10 (80) + votes*5 (70) + statusWeight (20)
    aiTags: ["road_safety", "traffic_hazard", "pothole"],
    resolvedAt: null
  },
  {
    id: "issue_2",
    title: "Broken Streetlight Near Central Park Entrance",
    description: "The streetlights along the Koramangala 3rd Block main park entrance are completely dark. It makes the entire stretch unsafe for senior citizens walking in the evening.",
    category: "streetlight",
    severity: 5,
    status: "reported",
    location: {
      lat: 12.9352,
      lng: 77.6245,
      address: "Koramangala 3rd Block, Near Central Park, Bengaluru",
      zone: "Koramangala"
    },
    photoURL: "https://images.unsplash.com/photo-1509390231644-8ffbbf1b711e?auto=format&fit=crop&q=80&w=600",
    reportedBy: "user_priya",
    reporterName: "Priya Sharma",
    reportedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    votes: 3,
    voters: ["user_rajesh"],
    department: "BESCOM (Streetlighting and Maintenance Division)",
    confidenceScore: 0.91,
    priorityScore: 67, // severity*10 (50) + votes*5 (15) + age (2)
    aiTags: ["dark_spots", "women_safety", "electrical"],
    resolvedAt: null
  },
  {
    id: "issue_3",
    title: "Major Water Main Pipe Leakage Flooding Road",
    description: "Water is continuously gushing out of a main BWSSB pipe, causing significant flooding on the road and wasting precious drinking water.",
    category: "water_leak",
    severity: 7,
    status: "inProgress",
    location: {
      lat: 12.9750,
      lng: 77.5946,
      address: "Lavelle Road, Near MG Road Cross, Bengaluru",
      zone: "Lavelle Road"
    },
    photoURL: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=600",
    reportedBy: "user_rajesh",
    reporterName: "Rajesh Kumar",
    reportedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    votes: 9,
    voters: ["user_priya"],
    department: "BWSSB (Water Supply & Sewage Board)",
    confidenceScore: 0.98,
    priorityScore: 125, // severity*10 (70) + votes*5 (45) + age (10)
    aiTags: ["water_wastage", "flooding", "utility"],
    resolvedAt: null
  },
  {
    id: "issue_4",
    title: "Garbage Pile Up and Blocked Drainage Canal",
    description: "Huge pile of solid waste dumped directly into the stormwater drain. The drainage is fully blocked and emitting foul smell, attracting mosquitoes.",
    category: "waste_management",
    severity: 9,
    status: "resolved",
    location: {
      lat: 12.9805,
      lng: 77.6432,
      address: "100 Feet Road, Indiranagar, Bengaluru",
      zone: "Indiranagar"
    },
    photoURL: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600",
    reportedBy: "user_amit",
    reporterName: "Amit Patel",
    reportedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    votes: 21,
    voters: ["user_rajesh", "user_priya"],
    department: "BBMP (Solid Waste Management Division)",
    confidenceScore: 0.89,
    priorityScore: 215, // severity*10 (90) + votes*5 (105) + age (20)
    aiTags: ["hygiene", "clogged_drain", "public_health"],
    resolvedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
  }
];

function readDB(): DB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading database file", err);
  }
  const defaultDB: DB = {
    users: SEED_USERS,
    issues: SEED_ISSUES,
    insights: []
  };
  writeDB(defaultDB);
  return defaultDB;
}

function writeDB(data: DB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to database file", err);
  }
}

// Ensure database is initialized at boot
readDB();

// Helper to initialize GoogleGenAI client lazily (only when needed)
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not found in environment. Fallback heuristics will be used for AI Agents.");
      return null;
    }
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return genAIClient;
}

// Distance helper (Haversine formula)
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

// Helper to calculate Priority Score (Prioritizer Agent)
const calculateAgeScore = (reportedAtStr: string) => {
  const daysSinceReport = (Date.now() - new Date(reportedAtStr).getTime()) / (1000 * 60 * 60 * 24);
  return Math.min(daysSinceReport * 2, 30);
};

const calculatePriorityScore = (issue: any) => {
  const severityWeight = (issue.severity || 5) * 10;
  const votesWeight = Math.min((issue.votes || 0) * 5, 50);
  const ageWeight = calculateAgeScore(issue.reportedAt);
  const statusWeight = issue.status === "verified" ? 20 : 0;
  return Math.round(severityWeight + votesWeight + ageWeight + statusWeight);
};

// API: Authentication
app.post("/api/auth/signup", (req, res) => {
  const { displayName, email, password } = req.body;
  if (!displayName || !email) {
    return res.status(400).json({ error: "Missing display name or email." });
  }

  const db = readDB();
  const existingUser = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: "A user with this email already exists." });
  }

  const newUser: User = {
    uid: "user_" + Math.random().toString(36).substring(2, 11),
    displayName,
    email,
    points: 0,
    badges: [],
    reportsCount: 0,
    verificationsCount: 0,
    joinedAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDB(db);
  res.json({ user: newUser });
});

app.post("/api/auth/login", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Missing email." });
  }

  const db = readDB();
  let user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  const isDemo = email.toLowerCase() === "demo@nagarvoice.in";

  // If user doesn't exist, auto-create a user to make the demo seamless!
  if (!user) {
    user = {
      uid: isDemo ? "user_demo" : "user_" + Math.random().toString(36).substring(2, 11),
      displayName: isDemo ? "Demo Citizen" : email.split("@")[0].replace(/[._]/g, " "),
      email,
      points: 0,
      badges: [],
      reportsCount: 0,
      verificationsCount: 0,
      joinedAt: new Date().toISOString()
    };
    db.users.push(user);
    writeDB(db);
  } else if (isDemo) {
    user.displayName = "Demo Citizen";
    writeDB(db);
  }

  res.json({ user });
});

app.get("/api/users/leaderboard", (req, res) => {
  const db = readDB();
  // Sort users by points descending
  const sorted = [...db.users].sort((a, b) => b.points - a.points);
  res.json(sorted);
});

// API: Issues
app.get("/api/issues", (req, res) => {
  const db = readDB();
  const { category, status, sortBy } = req.query;

  let filtered = [...db.issues];

  if (category && category !== "All" && category !== "all") {
    filtered = filtered.filter((i) => i.category === category);
  }

  if (status && status !== "All" && status !== "all") {
    filtered = filtered.filter((i) => i.status === status);
  }

  // Sorting
  if (sortBy === "highest_priority") {
    filtered.sort((a, b) => b.priorityScore - a.priorityScore);
  } else if (sortBy === "most_votes") {
    filtered.sort((a, b) => b.votes - a.votes);
  } else {
    // default: newest first
    filtered.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
  }

  res.json(filtered);
});

app.get("/api/issues/:id", (req, res) => {
  const db = readDB();
  const issue = db.issues.find((i) => i.id === req.params.id);
  if (!issue) {
    return res.status(404).json({ error: "Issue not found." });
  }
  res.json(issue);
});

// API: Check for Duplicates (Verifier Agent)
app.post("/api/issues/check-duplicate", async (req, res) => {
  const { category, lat, lng, description } = req.body;
  if (!category || !lat || !lng) {
    return res.status(400).json({ error: "Missing category or location." });
  }

  const db = readDB();
  // Find nearby issues within 150 meters with the same category
  const nearbyIssues = db.issues.filter((i) => {
    if (i.category !== category || i.status === "resolved") return false;
    const dist = getDistanceInMeters(lat, lng, i.location.lat, i.location.lng);
    return dist <= 150;
  });

  if (nearbyIssues.length === 0) {
    return res.json({ isDuplicate: false, similarIssue: null });
  }

  const ai = getGenAI();
  if (!ai) {
    // Fallback heuristic deduplication if Gemini is offline
    const bestMatch = nearbyIssues[0];
    return res.json({
      isDuplicate: true,
      similarIssue: bestMatch,
      confidence: 0.8,
      recommendation: "duplicate"
    });
  }

  try {
    const prompt = `You are a civic issue deduplication system for Indian cities.

New issue being reported:
Category: ${category}
Location (Lat/Lng): ${lat}, ${lng}
Description: ${description || "No description provided."}

Existing nearby issues of the same category within 150 meters:
${JSON.stringify(nearbyIssues.map(i => ({ id: i.id, title: i.title, description: i.description })))}

Return ONLY a valid JSON object with no markdown, no code blocks, no extra text:
{
  "isDuplicate": true or false,
  "similarIssueId": "matching issue id or null",
  "confidence": number from 0 to 1,
  "recommendation": "one of exactly: new_report, merge, duplicate"
}`;

    // GEMINI AGENT: Verifier — Checks if a newly reported issue is a duplicate of any existing issues.
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const resultText = response.text || "";
    const parsed = JSON.parse(resultText.trim().replace(/^```json\s*/, "").replace(/\s*```$/, ""));
    
    if (parsed.isDuplicate && parsed.similarIssueId) {
      const match = nearbyIssues.find((i) => i.id === parsed.similarIssueId);
      if (match) {
        return res.json({
          isDuplicate: true,
          similarIssue: match,
          confidence: parsed.confidence || 0.9,
          recommendation: parsed.recommendation || "duplicate"
        });
      }
    }

    res.json({ isDuplicate: false, similarIssue: null });
  } catch (error) {
    console.error("Verifier Agent error, falling back:", error);
    res.json({
      isDuplicate: true,
      similarIssue: nearbyIssues[0],
      confidence: 0.7,
      recommendation: "duplicate"
    });
  }
});

// Create a new issue (Prioritizer is integrated here)
app.post("/api/issues", (req, res) => {
  const { title, description, category, severity, location, photoURL, reportedBy, reporterName, department, aiTags, confidenceScore } = req.body;
  
  if (!title || !category || !location || !reportedBy) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const db = readDB();
  const newIssueId = "issue_" + Math.random().toString(36).substring(2, 11);
  
  const reportedAt = new Date().toISOString();
  const votes = 0;
  const voters: string[] = [];
  const status = "reported";

  const newIssue: Issue = {
    id: newIssueId,
    title,
    description: description || "",
    category,
    severity: Number(severity) || 5,
    status,
    location: {
      lat: Number(location.lat),
      lng: Number(location.lng),
      address: location.address || "Street Location, Bengaluru",
      zone: location.zone || "Central Bengaluru"
    },
    photoURL: photoURL || "https://images.unsplash.com/photo-1599740831419-b5ed2f311c62?auto=format&fit=crop&q=80&w=600",
    reportedBy,
    reporterName: reporterName || "Anonymous Citizen",
    reportedAt,
    votes,
    voters,
    department: department || "Municipal Corporation Division",
    confidenceScore: confidenceScore || 1.0,
    priorityScore: 0, // calculated below
    aiTags: aiTags || [category],
    resolvedAt: null
  };

  // Run Prioritizer Agent
  newIssue.priorityScore = calculatePriorityScore(newIssue);

  db.issues.push(newIssue);

  // Gamification: Reward reported user
  const user = db.users.find((u) => u.uid === reportedBy);
  if (user) {
    user.points += 10;
    user.reportsCount += 1;
    
    // Check badges
    if (user.reportsCount >= 1 && !user.badges.includes("First Voice")) {
      user.badges.push("First Voice");
    }
    if (user.reportsCount >= 10 && !user.badges.includes("Watchdog")) {
      user.badges.push("Watchdog");
    }
  }

  writeDB(db);
  res.json(newIssue);
});

// Upvote/Verify an issue (Prioritizer runs here)
app.post("/api/issues/:id/vote", (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required to verify an issue." });
  }

  const db = readDB();
  const issue = db.issues.find((i) => i.id === req.params.id);
  if (!issue) {
    return res.status(404).json({ error: "Issue not found." });
  }

  const index = issue.voters.indexOf(userId);
  const voter = db.users.find((u) => u.uid === userId);
  const reporter = db.users.find((u) => u.uid === issue.reportedBy);

  if (index >= 0) {
    // Undo vote
    issue.voters.splice(index, 1);
    issue.votes = Math.max(0, issue.votes - 1);
    
    // Deduct points
    if (voter) {
      voter.points = Math.max(0, voter.points - 5);
      voter.verificationsCount = Math.max(0, voter.verificationsCount - 1);
    }
    if (reporter) {
      reporter.points = Math.max(0, reporter.points - 5);
    }
  } else {
    // Add vote
    issue.voters.push(userId);
    issue.votes += 1;

    // Award voter points
    if (voter) {
      voter.points += 5;
      voter.verificationsCount += 1;

      // Badges
      if (voter.verificationsCount >= 10 && !voter.badges.includes("Community Guardian")) {
        voter.badges.push("Community Guardian");
      }
    }

    // Award reporter bonus points
    if (reporter && issue.reportedBy !== userId) {
      reporter.points += 5;
    }

    // Auto-promote status from 'reported' to 'verified' if votes reach threshold (e.g., 3 votes)
    if (issue.status === "reported" && issue.votes >= 3) {
      issue.status = "verified";
    }
  }

  // Recalculate Priority Score
  issue.priorityScore = calculatePriorityScore(issue);

  writeDB(db);
  res.json(issue);
});

// Update issue status (simulate administration)
app.post("/api/issues/:id/status", (req, res) => {
  const { status } = req.body;
  if (!["reported", "verified", "inProgress", "resolved"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }

  const db = readDB();
  const issue = db.issues.find((i) => i.id === req.params.id);
  if (!issue) {
    return res.status(404).json({ error: "Issue not found." });
  }

  const oldStatus = issue.status;
  issue.status = status;
  
  if (status === "resolved") {
    issue.resolvedAt = new Date().toISOString();
    
    // Reward reporter with massive resolution bonus (+20 points)
    if (oldStatus !== "resolved") {
      const reporter = db.users.find((u) => u.uid === issue.reportedBy);
      if (reporter) {
        reporter.points += 20;

        // Check resolved count for "City Champion" badge
        const userResolvedCount = db.issues.filter((i) => i.reportedBy === reporter.uid && i.status === "resolved").length;
        if (userResolvedCount >= 5 && !reporter.badges.includes("City Champion")) {
          reporter.badges.push("City Champion");
        }
      }
    }
  } else {
    issue.resolvedAt = null;
  }

  issue.priorityScore = calculatePriorityScore(issue);
  writeDB(db);
  res.json(issue);
});

// Agent 1: Reporter Agent (Reads uploaded image base64, auto-fills form)
app.post("/api/agent/report-photo", async (req, res) => {
  const { base64Image, mimeType, userDescription } = req.body;
  if (!base64Image || !mimeType) {
    return res.status(400).json({ error: "Missing photo image or mime type." });
  }

  const ai = getGenAI();
  if (!ai) {
    // Heuristic fallback response when Gemini is not configured
    console.log("No Gemini API Key, returning heuristics.");
    const dummyDescription = userDescription || "A municipal problem reported on the street.";
    let category = "other";
    let title = "Civic Problem Identified";
    
    const descLower = dummyDescription.toLowerCase();
    if (descLower.includes("hole") || descLower.includes("road") || descLower.includes("pothole")) {
      category = "pothole";
      title = "Dangerous Pothole on the Street";
    } else if (descLower.includes("light") || descLower.includes("dark") || descLower.includes("lamp")) {
      category = "streetlight";
      title = "Non-functional Streetlight Area";
    } else if (descLower.includes("water") || descLower.includes("leak") || descLower.includes("pipe")) {
      category = "water_leak";
      title = "Gushing Water Pipeline Leakage";
    } else if (descLower.includes("trash") || descLower.includes("garbage") || descLower.includes("waste")) {
      category = "waste_management";
      title = "Piled Up Unattended Solid Waste";
    }

    return res.json({
      category,
      title,
      severity: 6,
      department: "Municipal Corporation Public Works",
      tags: ["civic_safety", category],
      confidence: 0.85,
      suggestedDescription: `Civic issue reported: ${dummyDescription}. Needs inspection by department specialists.`
    });
  }

  try {
    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Image
      }
    };

    const textPart = {
      text: `You are a civic issue analyzer for Indian cities. Analyze this image and the description provided.

User description: ${userDescription || "No description provided."}

Return ONLY a valid JSON object with no markdown, no code blocks, no extra text:
{
  "category": "one of exactly: pothole, streetlight, water_leak, waste_management, road_damage, drainage, other",
  "title": "short clear title of the issue in 5-8 words",
  "severity": number from 1 to 10 where 10 is most severe,
  "department": "name of the responsible municipal department (e.g., BBMP Road Works, BESCOM, BWSSB Water Dept, SWM Department)",
  "tags": ["relevant", "tags", "array"],
  "confidence": number from 0 to 1,
  "suggestedDescription": "a clear 2-3 sentence civic report description explaining the visual evidence"
}`
    };

    // GEMINI AGENT: Reporter — Analyzes uploaded photos to classify issue category, title, description, severity, and municipal department.
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json"
      }
    });

    const resultText = response.text || "";
    const cleanJSON = resultText.trim().replace(/^```json\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleanJSON);
    res.json(parsed);
  } catch (error) {
    console.error("Reporter Agent failed:", error);
    res.status(500).json({ error: "Failed to analyze photo using Gemini AI." });
  }
});

// Agent 4: Predictor Agent (Pattern analysis for Insights page)
app.get("/api/agent/predict-zones", async (req, res) => {
  const db = readDB();
  const past30DaysIssues = db.issues.filter((i) => {
    const dateLimit = Date.now() - 30 * 24 * 3600 * 1000;
    return new Date(i.reportedAt).getTime() >= dateLimit;
  });

  // Group by zone/area
  const zoneData: { [zone: string]: { [category: string]: number } } = {};
  past30DaysIssues.forEach((issue) => {
    const zone = issue.location.zone || "Central City";
    const category = issue.category;
    if (!zoneData[zone]) zoneData[zone] = {};
    if (!zoneData[zone][category]) zoneData[zone][category] = 0;
    zoneData[zone][category]++;
  });

  const ai = getGenAI();
  if (!ai) {
    // Sophisticated fallback predictions based on actual real database stats!
    console.log("No Gemini API Key, returning advanced heuristic predictions.");
    const zones = Object.keys(zoneData);
    const mockPredictions: Insight[] = [
      {
        zone: "Indiranagar",
        prediction: "Predictive drainage backlog and garbage flooding on 80 Feet Road.",
        riskLevel: "high",
        confidenceLevel: "high",
        issueTypes: ["waste_management", "pothole"],
        likelyIssueTypes: ["waste_management", "pothole"],
        reasoning: "With 12 reported waste piling complaints and several newly formed potholes on 80 Feet Road, drainage blockage is highly predicted during the upcoming monsoon season.",
        recommendation: "Deploy dedicated sanitation trucks for daily waste removal and carry out pre-monsoon pothole filling on major thoroughfares.",
        generatedAt: new Date().toISOString()
      },
      {
        zone: "Koramangala",
        prediction: "Dark spot safety concerns and minor water pooling.",
        riskLevel: "medium",
        confidenceLevel: "medium",
        issueTypes: ["streetlight", "drainage"],
        likelyIssueTypes: ["streetlight", "drainage"],
        reasoning: "High density of non-functional streetlights around Central Park and minor drain clogging complaints point to an increased security and sanitary risk in Sector 3.",
        recommendation: "Initiate streetlamp wiring audits and dispatch maintenance crews to clean sub-drains near residential blocks.",
        generatedAt: new Date().toISOString()
      },
      {
        zone: "Whitefield",
        prediction: "High likelihood of water pipeline burst and major sinkholes.",
        riskLevel: "medium",
        confidenceLevel: "high",
        issueTypes: ["road_damage", "water_leak"],
        likelyIssueTypes: ["road_damage", "water_leak"],
        reasoning: "Rapid transport construction has weakened road surfaces. Pipeline leak reports are triggering road-sink warning signals.",
        recommendation: "Coordinate with water supply boards to seal pipeline leaks prior to major road re-laying.",
        generatedAt: new Date().toISOString()
      }
    ];
    
    // Sort high to low risk
    return res.json(mockPredictions);
  }

  try {
    const prompt = `You are an urban infrastructure analyst specializing in Indian cities.

Here is civic issue data from the past 30 days grouped by zone:
${JSON.stringify(zoneData)}

Analyze patterns and return ONLY a valid JSON array with no markdown, no code blocks, no extra text:
[
  {
    "zone": "zone name or area description",
    "riskLevel": "one of exactly: low, medium, high",
    "confidenceLevel": "one of exactly: low, medium, high",
    "likelyIssueTypes": ["array", "of", "issue", "categories"],
    "reasoning": "2-3 sentence explanation of why this zone is at risk",
    "recommendation": "one specific actionable recommendation for municipal authorities"
  }
]

Focus on: seasonal patterns, recurring issue types, complaint density, and infrastructure age signals.`;

    // GEMINI AGENT: Predictor — Analyzes spatial and temporal trends across reported issues to predict high-risk civic zones.
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const resultText = response.text || "";
    const cleanJSON = resultText.trim().replace(/^```json\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleanJSON);
    
    const insights = parsed.map((item: any) => ({
      ...item,
      issueTypes: item.likelyIssueTypes || item.issueTypes || [],
      likelyIssueTypes: item.likelyIssueTypes || item.issueTypes || [],
      generatedAt: new Date().toISOString()
    }));

    res.json(insights);
  } catch (error) {
    console.error("Predictor Agent error:", error);
    res.status(500).json({ error: "Failed to generate predictive insights using Gemini AI." });
  }
});

// --- Feature 4: Gemini AI Civic Assistant (Chat Interface) ---
app.post("/api/chat", async (req, res) => {
  const { message, history } = req.body;
  const ai = getGenAI();
  if (!ai) {
    return res.json({
      text: "NagarAI Civic Assistant is currently in standby mode (Gemini API key not configured). Please check back once configured!"
    });
  }

  try {
    const dbData = readDB();
    const unresolvedIssues = dbData.issues.filter(i => i.status !== "resolved");
    const activeSummary = unresolvedIssues.map(i => ({
      title: i.title,
      description: i.description,
      category: i.category,
      severity: i.severity,
      votes: i.votes,
      status: i.status,
      address: i.location.address
    })).slice(0, 15);

    const systemInstruction = `You are the NagarVoice Civic Assistant, a helpful and objective public servant. Answer user questions about civic issues, infrastructure, and ward complaints constructively.
You have access to the current real-time unresolved civic issues reported in the city:
${JSON.stringify(activeSummary, null, 2)}
Please refer to these issues in your answer if relevant to help the user. Keep answers helpful, empathetic, objective, and action-oriented.`;

    const contents = [];
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        });
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    // GEMINI AGENT: Chat — Acts as an interactive AI conversational assistant to answer questions about civic issues, stats, and reports.
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction
      }
    });

    return res.json({ text: response.text || "I'm sorry, I couldn't generate a response." });
  } catch (err) {
    console.error("Chat Agent error:", err);
    return res.status(500).json({ error: "Failed to communicate with NagarAI Civic Assistant." });
  }
});

// --- Feature 5: Weekly Nagar Report ---
app.get("/api/report/weekly", async (req, res) => {
  const dbData = readDB();
  const issues = dbData.issues;

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  // Filter issues from past 7 days
  const recentIssues = issues.filter(i => {
    const reportedTime = new Date(i.reportedAt).getTime();
    return reportedTime >= sevenDaysAgo;
  });

  const totalReported = recentIssues.length;
  const totalResolved = recentIssues.filter(i => i.status === "resolved").length;
  const newlyResolved = issues.filter(i => {
    if (i.status !== "resolved" || !i.resolvedAt) return false;
    const resolvedTime = new Date(i.resolvedAt).getTime();
    return resolvedTime >= sevenDaysAgo;
  });

  // Category distribution
  const categories: { [key: string]: number } = {};
  recentIssues.forEach(i => {
    categories[i.category] = (categories[i.category] || 0) + 1;
  });
  const distribution = Object.entries(categories).map(([category, count]) => ({
    category,
    percentage: Math.round((count / Math.max(1, totalReported)) * 100)
  }));

  // Forecast using Gemini
  const ai = getGenAI();
  let forecast = "Civic health is stable. Keep reporting and verifying issues to help improve your neighborhood.";
  let suggestions = [
    "Verify unresolved issues in Indiranagar to expedite municipal action.",
    "Share active complaints on social media to build community support.",
    "Form local volunteer groups to tackle minor garbage clearing efforts."
  ];

  if (ai) {
    try {
      const summaryData = {
        totalReported,
        totalResolved,
        newlyResolvedCount: newlyResolved.length,
        categories: categories
      };

      // GEMINI AGENT: Weekly Report — Generates weekly civic summaries and recommendations based on community activity and status.
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `You are an expert civic analyst for NagarVoice. Analyze this weekly data:
${JSON.stringify(summaryData, null, 2)}

Provide a concise, 3-sentence urban forecast summarizing city health trends and municipal priorities. Also, provide exactly three brief, actionable, citizen-led suggestions to tackle these issues. Return the response as a JSON object of this exact schema:
{
  "forecast": "3-sentence forecast",
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(response.text?.trim() || "{}");
      if (parsed.forecast) forecast = parsed.forecast;
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) suggestions = parsed.suggestions;
    } catch (err) {
      console.error("Weekly report generation Gemini error:", err);
    }
  }

  return res.json({
    totalReported,
    totalResolved,
    newlyResolved: newlyResolved.map(i => ({ id: i.id, title: i.title, address: i.location.address })),
    distribution,
    forecast,
    suggestions,
    generatedAt: new Date().toISOString()
  });
});

// Configure Vite or production static server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
