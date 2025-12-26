import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Twitter, Linkedin, Send } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

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
    
    setIsLoading(true);
    // Simulate newsletter signup
    await new Promise(resolve => setTimeout(resolve, 800));
    
    toast({
      title: "Erfolgreich angemeldet!",
      description: "Sie erhalten bald Updates zu Jobs & IT-Trends.",
    });
    
    setEmail("");
    setIsLoading(false);
  };

  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-white">
      {/* Main Footer Content - 3 Sections */}
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-3">
          
          {/* Section 1: Logo (Large) */}
          <div className="flex flex-col items-start">
            <a href="/" onClick={handleLogoClick} className="cursor-pointer mb-4">
              <img 
                src={logo} 
                alt="Fritze IT-Systeme Logo" 
                className="h-24 w-auto dark:brightness-0 dark:invert" 
              />
            </a>
            <p className="text-sm text-white/60 max-w-xs leading-relaxed mb-6">
              Fritze IT GmbH – Ihr Partner für Prozessoptimierung und digitale Transformation seit 2011.
            </p>
            
            {/* Newsletter Signup */}
            <div className="w-full max-w-xs">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Newsletter</p>
              <p className="text-xs text-white/50 mb-3">Updates zu Jobs & IT-Trends erhalten</p>
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

          {/* Section 2: Kontakt (Address, Email, Phone, Hours, Application) */}
          <div>
            <h4 className="font-semibold mb-5 text-primary text-lg">Kontakt</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 text-white/70">
                <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>Willi-Eichler-Straße 26, 37079 Göttingen</span>
              </div>
              <div className="flex items-center gap-3 text-white/70">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <span>info@fritze-it.solutions</span>
              </div>
              <div className="flex items-center gap-3 text-white/70">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <span>Telefon auf Anfrage</span>
              </div>
              <div className="flex items-start gap-3 text-white/70">
                <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p>Mo-Fr: 8:00 - 17:00 Uhr</p>
                  <p>Sa: 9:00 - 12:00 Uhr</p>
                </div>
              </div>
              
              {/* Application Email Block */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Bewerbungen an:</p>
                  <p className="text-sm text-white font-medium">bewerbung@fritze-it.solutions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Links & Socials (Discreet) */}
          <div>
            <h4 className="font-semibold mb-5 text-primary text-lg">Links</h4>
            <ul className="space-y-2 text-sm text-white/70 mb-6">
              <li>
                <a href="/ueber-uns" onClick={(e) => handlePageClick(e, '/ueber-uns')} className="hover:text-white transition-colors cursor-pointer">
                  Über uns
                </a>
              </li>
              <li>
                <a href="/impressum" onClick={(e) => handlePageClick(e, '/impressum')} className="hover:text-white transition-colors cursor-pointer">
                  Impressum
                </a>
              </li>
              <li>
                <a href="/datenschutz" onClick={(e) => handlePageClick(e, '/datenschutz')} className="hover:text-white transition-colors cursor-pointer">
                  Datenschutz
                </a>
              </li>
            </ul>
            
            {/* Discreet Socials */}
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-white/40 mb-3 uppercase tracking-wide">Folgen Sie uns</p>
              <div className="flex gap-2">
                <span 
                  className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center text-white/40 hover:text-white/60 hover:bg-white/10 transition-all cursor-default"
                  title="Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </span>
                <span 
                  className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center text-white/40 hover:text-white/60 hover:bg-white/10 transition-all cursor-default"
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
      <div className="container py-5">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
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