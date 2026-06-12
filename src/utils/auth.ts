// src/utils/auth.ts

export interface StudentSession {
  id: string;
  name: string;
  username: string;
  sessionToken: string; // <-- Added to track active multi-device token signatures
  gender?: string;      // Added safely as optional field
  state?: string;       // Added safely as optional field
  district?: string;    // Added safely as optional field
}

export const authManager = {
  setSession: (session: StudentSession) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("active_student_node", JSON.stringify(session));
    }
  },
  getSession: (): StudentSession | null => {
    if (typeof window !== "undefined") {
      const data = localStorage.getItem("active_student_node");
      return data ? JSON.parse(data) : null;
    }
    return null;
  },
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("active_student_node");
    }
  }
};