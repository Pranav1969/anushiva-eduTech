//src\app\student\login\hooks\useLoginContent.ts
import { useState, useEffect } from "react";
import { loginContentService } from "../services/login-content.service";
import { LoginPageData } from "../types/login.types";

export function useLoginContent() {
  const [content, setContent] = useState<LoginPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      try {
        const data = await loginContentService.fetchPageContent();
        setContent(data);
      } catch (err) {
        console.error("Failed to fetch custom dynamic login matrix:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadContent();
  }, []);

  return { content, isLoading };
}