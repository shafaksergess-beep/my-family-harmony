import { useEffect, useState } from "react";
import { loadRecaptchaScript, executeRecaptcha } from "@/lib/recaptcha";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook for reCAPTCHA v3 integration
 */
export const useRecaptcha = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRecaptchaScript()
      .then(() => {
        setIsLoaded(true);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load reCAPTCHA:", error);
        setIsLoading(false);
        toast({
          title: "Security Error",
          description: "Failed to load security verification. Please refresh the page.",
          variant: "destructive",
        });
      });
  }, [toast]);

  /**
   * Execute reCAPTCHA for a specific action
   * @param action - The action name (e.g., "login", "signup", "invite")
   * @returns The reCAPTCHA token or null if failed
   */
  const getRecaptchaToken = async (action: string): Promise<string | null> => {
    if (!isLoaded) {
      toast({
        title: "Security Error",
        description: "Security verification not ready. Please try again.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const token = await executeRecaptcha(action);
      return token;
    } catch (error) {
      console.error("reCAPTCHA execution failed:", error);
      toast({
        title: "Security Error",
        description: "Security verification failed. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    isLoaded,
    isLoading,
    getRecaptchaToken,
  };
};
