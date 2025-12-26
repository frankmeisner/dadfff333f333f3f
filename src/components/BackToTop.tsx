import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      const shouldBeVisible = window.scrollY > 400;
      if (shouldBeVisible !== isVisible) {
        if (shouldBeVisible) {
          setIsVisible(true);
          setIsAnimating(true);
        } else {
          setIsAnimating(false);
          // Wait for fade-out animation before hiding
          setTimeout(() => setIsVisible(false), 300);
        }
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, [isVisible]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <Button
      onClick={scrollToTop}
      variant="secondary"
      size="icon"
      className={`fixed bottom-6 right-6 z-50 rounded-full shadow-lg hover:scale-110 transition-all duration-300 ${
        isAnimating ? "animate-fade-in opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
      aria-label="Nach oben scrollen"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
};