import { Mail, Phone, MapPin, Clock, Briefcase, Shield, Cloud, Code, Headphones, Users, Twitter, Linkedin, Server, Lock, Cog } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export const Footer = () => {
  return (
    <footer className="bg-foreground text-primary-foreground">
      {/* Main Footer Content */}
      <div className="container py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Logo & Description */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <img src={logo} alt="Fritze IT-Systeme Logo" className="h-12 w-auto brightness-0 invert" />
            </Link>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Fritze IT GmbH – Ihr Partner für Prozessoptimierung und digitale Transformation seit 2011.
            </p>
            <div className="mt-6 space-y-2 text-sm text-primary-foreground/60">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-foreground/40" />
                <span>Willi-Eichler-Straße 26, 37079 Göttingen</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary-foreground/40" />
                <span>info@fritze-it.solutions</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary-foreground/40" />
                <span>Telefon auf Anfrage</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-foreground/40" />
                <div>
                  <p>Mo-Fr: 8:00 - 17:00 Uhr</p>
                  <p>Sa: 9:00 - 12:00 Uhr</p>
                </div>
              </div>
            </div>
          </div>

          {/* Schnellzugriff */}
          <div>
            <h4 className="font-semibold mb-5">Schnellzugriff</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li>
                <a href="/#jobs" className="hover:text-primary-foreground transition-colors flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Stellenangebote
                </a>
              </li>
              <li>
                <a href="/#team" className="hover:text-primary-foreground transition-colors flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Unser Team
                </a>
              </li>
              <li>
                <a href="/#benefits" className="hover:text-primary-foreground transition-colors flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Benefits
                </a>
              </li>
              <li>
                <a href="/#contact" className="hover:text-primary-foreground transition-colors flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Kontakt
                </a>
              </li>
              <li>
                <Link to="/ueber-uns" className="hover:text-primary-foreground transition-colors flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Über uns
                </Link>
              </li>
            </ul>
          </div>

          {/* Leistungen */}
          <div>
            <h4 className="font-semibold mb-5">Leistungen</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li className="flex items-center gap-2">
                <Server className="w-4 h-4" />
                IT-Infrastruktur
              </li>
              <li className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                IT-Sicherheit
              </li>
              <li className="flex items-center gap-2">
                <Cloud className="w-4 h-4" />
                Cloud-Lösungen
              </li>
              <li className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Software-Entwicklung
              </li>
              <li className="flex items-center gap-2">
                <Headphones className="w-4 h-4" />
                24/7 Support
              </li>
              <li className="flex items-center gap-2">
                <Cog className="w-4 h-4" />
                Consulting
              </li>
            </ul>
          </div>

          {/* Social & Contact */}
          <div>
            <h4 className="font-semibold mb-5">Kontakt & Social</h4>
            <p className="text-sm text-primary-foreground/70 mb-4">
              Folgen Sie uns und bleiben Sie informiert.
            </p>
            <div className="flex gap-3 mb-6">
              <Link 
                to="/" 
                className="w-10 h-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                title="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </Link>
              <Link 
                to="/" 
                className="w-10 h-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                title="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </Link>
              <a 
                href="mailto:info@fritze-it.solutions" 
                className="w-10 h-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                title="E-Mail"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
            <div className="bg-primary-foreground/5 rounded-lg p-4">
              <p className="text-sm font-medium text-primary-foreground mb-1">Bewerbungen an:</p>
              <p className="text-sm text-primary-foreground/70">bewerbung@fritze-it.solutions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-primary-foreground/10" />

      {/* Bottom Bar */}
      <div className="container py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Fritze IT-Systeme Logo" className="h-8 w-auto brightness-0 invert opacity-60" />
            <p className="text-sm text-primary-foreground/50">
              © {new Date().getFullYear()} Fritze IT GmbH. Alle Rechte vorbehalten.
            </p>
          </div>
          <div className="flex gap-6 text-sm">
            <Link to="/impressum" className="text-primary-foreground/50 hover:text-primary-foreground transition-colors">
              Impressum
            </Link>
            <Link to="/datenschutz" className="text-primary-foreground/50 hover:text-primary-foreground transition-colors">
              Datenschutz
            </Link>
            <Link to="/ueber-uns" className="text-primary-foreground/50 hover:text-primary-foreground transition-colors">
              Über uns
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
