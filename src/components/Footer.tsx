import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Twitter, Linkedin, Send } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { checkRateLimit, recordAttempt, formatRetryTime } from "@/lib/rate-limiter";
import logo from "@/assets/logo-cropped.png";

export const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    } else {
      scrollToTop();
    }
  };

  const handlePageClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    navigate(path);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    // Rate limiting check
    const rateLimitKey = 'newsletter_signup';
    const { allowed, retryAfterMs } = checkRateLimit(rateLimitKey, 'newsletter');
    
    if (!allowed) {
      toast({
        title: "Zu viele Versuche",
        description: `Bitte warten Sie ${formatRetryTime(retryAfterMs)} und versuchen Sie es erneut.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    recordAttempt(rateLimitKey);
    
    try {
      const { error } = await supabase
        .from('newsletter_subscriptions')
        .insert({ email: email.trim().toLowerCase() });
      
      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Bereits angemeldet",
            description: "Diese E-Mail ist bereits für den Newsletter registriert.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Erfolgreich angemeldet!",
          description: "Sie erhalten bald Updates zu Jobs & IT-Trends.",
        });
        setEmail("");
      }
    } catch (error) {
      console.error('Newsletter signup error:', error);
      toast({
        title: "Fehler",
        description: "Die Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-white">
      {/* Main Footer Content - 4 Sections */}
      <div className="container py-12 lg:py-14">
        <div className="grid gap-8 md:gap-10 md:grid-cols-2 lg:grid-cols-4">
          
          {/* Section 1: Logo & Newsletter */}
          <div className="flex flex-col items-start lg:pr-4">
            <a href="/" onClick={handleLogoClick} className="cursor-pointer mb-3">
              <img 
                src={logo} 
                alt="Fritze IT-Systeme Logo" 
                className="h-20 w-auto brightness-0 invert" 
              />
            </a>
            <p className="text-sm text-white/60 leading-relaxed mb-5">
              Ihr Partner für Prozessoptimierung und digitale Transformation seit 2011.
            </p>
            
            {/* Newsletter Signup */}
            <div className="w-full">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5">Newsletter</p>
              <p className="text-xs text-white/50 mb-2.5">Updates zu Jobs & IT-Trends</p>
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ihre E-Mail"
                  className="flex-1 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-md text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Section 2: Leistungen */}
          <div>
            <h4 className="font-semibold mb-4 text-primary text-base">Leistungen</h4>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li className="flex items-center gap-2 hover:text-white transition-colors cursor-default">
                <span className="w-1 h-1 bg-primary rounded-full"></span>
                Prozessoptimierung
              </li>
              <li className="flex items-center gap-2 hover:text-white transition-colors cursor-default">
                <span className="w-1 h-1 bg-primary rounded-full"></span>
                Digitale Transformation
              </li>
              <li className="flex items-center gap-2 hover:text-white transition-colors cursor-default">
                <span className="w-1 h-1 bg-primary rounded-full"></span>
                IT-Beratung
              </li>
              <li className="flex items-center gap-2 hover:text-white transition-colors cursor-default">
                <span className="w-1 h-1 bg-primary rounded-full"></span>
                Workflow-Automatisierung
              </li>
              <li className="flex items-center gap-2 hover:text-white transition-colors cursor-default">
                <span className="w-1 h-1 bg-primary rounded-full"></span>
                Software-Entwicklung
              </li>
            </ul>
          </div>

          {/* Section 3: Kontakt */}
          <div>
            <h4 className="font-semibold mb-4 text-primary text-base">Kontakt</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2.5 text-white/70">
                <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>Willi-Eichler-Straße 26<br />37079 Göttingen</span>
              </div>
              <div className="flex items-center gap-2.5 text-white/70">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <span>info@fritze-it-solutions.de</span>
              </div>
              <div className="flex items-center gap-2.5 text-white/70">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <span>Telefon auf Anfrage</span>
              </div>
              <div className="flex items-center gap-2.5 text-white/70">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span>Mo-Fr: 8:00 - 17:00 Uhr</span>
              </div>
              
              {/* Application Email Block */}
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="bg-primary/10 rounded-md p-2.5 border border-primary/20">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-0.5">Bewerbungen an:</p>
                  <p className="text-sm text-white font-medium">bewerbung@fritze-it.solutions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Links & Socials */}
          <div>
            <h4 className="font-semibold mb-4 text-primary text-base">Links</h4>
            <ul className="space-y-2.5 text-sm text-white/70 mb-6">
              <li>
                <a href="/ueber-uns" onClick={(e) => handlePageClick(e, '/ueber-uns')} className="hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                  <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                  Über uns
                </a>
              </li>
              <li>
                <a href="/impressum" onClick={(e) => handlePageClick(e, '/impressum')} className="hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                  <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                  Impressum
                </a>
              </li>
              <li>
                <a href="/datenschutz" onClick={(e) => handlePageClick(e, '/datenschutz')} className="hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                  <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                  Datenschutz
                </a>
              </li>
            </ul>
            
            {/* Socials */}
            <div>
              <p className="text-xs text-white/40 mb-2 uppercase tracking-wide font-medium">Folgen Sie uns</p>
              <div className="flex gap-2">
                <span 
                  className="w-9 h-9 rounded-md bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-primary/20 transition-all cursor-default border border-white/10"
                  title="Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </span>
                <span 
                  className="w-9 h-9 rounded-md bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-primary/20 transition-all cursor-default border border-white/10"
                  title="LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-white/10" />

      {/* Bottom Bar */}
      <div className="container py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Fritze IT GmbH. Alle Rechte vorbehalten.
          </p>
          <div className="flex gap-4 text-xs text-white/40">
            <a href="/impressum" onClick={(e) => handlePageClick(e, '/impressum')} className="hover:text-white/60 transition-colors cursor-pointer">
              Impressum
            </a>
            <a href="/datenschutz" onClick={(e) => handlePageClick(e, '/datenschutz')} className="hover:text-white/60 transition-colors cursor-pointer">
              Datenschutz
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};