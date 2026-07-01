export interface User {
    uid: string;
    displayName: string;
    email: string;
    points: number;
    badges: string[];
    reportsCount: number;
    verificationsCount: number;
    joinedAt: string;
  }
  
  export interface Issue {
    id: string;
    title: string;
    description: string;
    category: string;
    severity: number;
    status: 'reported' | 'verified' | 'inProgress' | 'resolved';
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
  
  export interface Insight {
    zone: string;
    prediction?: string;
    riskLevel: 'low' | 'medium' | 'high';
    confidenceLevel?: 'low' | 'medium' | 'high';
    issueTypes?: string[];
    likelyIssueTypes?: string[];
    reasoning: string;
    recommendation: string;
    generatedAt: string;
  }
  
  export type CategoryType = 'all' | 'pothole' | 'streetlight' | 'water_leak' | 'waste_management' | 'road_damage' | 'drainage' | 'other';
  export type StatusType = 'all' | 'reported' | 'verified' | 'inProgress' | 'resolved';
  