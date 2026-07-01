import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, writeBatch, doc, Timestamp, collection, addDoc } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export { Timestamp };

export async function syncToFirestore(issues: any[], users: any[]) {
  try {
    const batch = writeBatch(db);
    for (const issue of issues) {
      const issueRef = doc(db, "issues", issue.id);
      batch.set(issueRef, {
        ...issue,
        reportedAt: issue.reportedAt ? Timestamp.fromDate(new Date(issue.reportedAt)) : Timestamp.now(),
        resolvedAt: issue.resolvedAt ? Timestamp.fromDate(new Date(issue.resolvedAt)) : null,
      }, { merge: true });
    }
    for (const user of users) {
      const userRef = doc(db, "users", user.uid);
      batch.set(userRef, {
        ...user,
        joinedAt: user.joinedAt ? Timestamp.fromDate(new Date(user.joinedAt)) : Timestamp.now(),
      }, { merge: true });
    }
    await batch.commit();
    console.log("Successfully synced issues & users to Firestore!");
  } catch (err) {
    console.error("Failed to sync to Firestore:", err);
  }
}

export async function logAgentActivity(agent: "reporter" | "verifier" | "prioritizer" | "predictor", action: string, metadata: any = {}) {
  try {
    const logsRef = collection(db, "agentLogs");
    await addDoc(logsRef, {
      agent,
      action,
      timestamp: Timestamp.now(),
      metadata
    });
    console.log(`Agent log recorded: [${agent}] ${action}`);
  } catch (err) {
    console.error("Failed to log agent activity:", err);
  }
}


