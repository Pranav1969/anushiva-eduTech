// src/utils/auth.ts

export interface StudentSession {
  id: string;
  name: string;
  username: string;
  sessionToken: string; 
  gender?: string;      
  state?: string;       
  district?: string;
  current_plan?: string; 
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