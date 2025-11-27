import { useState, useEffect } from 'react';

const ONBOARDING_COMPLETED_KEY = 'family-together-onboarding-completed';
const ONBOARDING_DISMISSED_KEY = 'family-together-onboarding-dismissed';

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
    const hasDismissedOnboarding = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
    
    if (!hasCompletedOnboarding && !hasDismissedOnboarding) {
      setShowOnboarding(true);
      setIsFirstTime(true);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    setShowOnboarding(false);
  };

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    isFirstTime,
    completeOnboarding,
    dismissOnboarding,
    resetOnboarding,
  };
}
