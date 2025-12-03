import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

const SplashScreen = ({ onComplete, duration = 3000 }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, duration - 500);

    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary transition-opacity duration-500 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Logo Container with Glowing Ring */}
      <div className="relative mb-8">
        {/* Pulsating Gold Ring */}
        <div className="absolute inset-0 -m-3 rounded-full animate-ring-pulse">
          <div className="w-full h-full rounded-full border-4 border-secondary opacity-60" />
        </div>
        
        {/* Outer Glow Layer */}
        <div className="absolute inset-0 -m-6 rounded-full bg-secondary/20 blur-xl animate-glow-pulse" />
        
        {/* Logo */}
        <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-secondary/80 shadow-2xl">
          <img
            src="/logo.jpg"
            alt="Kinsroot Logo"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* App Name */}
      <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground tracking-wide mb-3 animate-fade-in-up">
        Kinsroot
      </h1>

      {/* Tagline */}
      <p className="text-lg md:text-xl text-secondary font-medium tracking-wider text-center px-6 animate-fade-in-up animation-delay-200">
        Rooted in Heritage. Built for Tomorrow.
      </p>

      {/* Subtle Loading Indicator */}
      <div className="absolute bottom-16 flex gap-1.5">
        <div className="w-2 h-2 rounded-full bg-secondary/60 animate-bounce-dot" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-secondary/60 animate-bounce-dot" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-secondary/60 animate-bounce-dot" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
};

export default SplashScreen;
