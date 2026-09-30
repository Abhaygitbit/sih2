import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  FileText, 
  Search, 
  ArrowRight, 
  LogIn, 
  Database, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  Scale 
} from 'lucide-react';
import { AyushMinistryLogo } from './AyushMinistryLogo';
import { GovtAccessibilityBar } from './GovtAccessibilityBar';
import { AyushHeroSlider } from './AyushHeroSlider';
import { AyushNewsMarquee } from './AyushNewsMarquee';

interface SaaSHomepageProps {
  onOpenAuth: (mode: 'signin' | 'signup', prefillEmail?: string, prefillPass?: string) => void;
}

export const SaaSHomepage: React.FC<SaaSHomepageProps> = ({ onOpenAuth }) => {
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [fontSizeOffset, setFontSizeOffset] = useState<number>(0);

  const isHindi = language === 'hi';

  const handleToggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  const handleFontSizeChange = (delta: number) => {
    setFontSizeOffset((prev) => Math.max(-2, Math.min(3, prev + delta)));
  };

  const handleResetFontSize = () => {
    setFontSizeOffset(0);
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white"
      style={{ fontSize: fontSizeOffset ? `${100 + fontSizeOffset * 6}%` : undefined }}
    >
      {/* 1. Official Government Accessibility & Language Strip (Capture 5.JPG) */}
      <GovtAccessibilityBar
        currentLang={language}
        onToggleLang={handleToggleLanguage}
        fontSize={fontSizeOffset}
        onFontSizeChange={handleFontSizeChange}
        onResetFontSize={handleResetFontSize}
      />

      {/* 2. Top Navigation Bar with Ministry of Ayush Emblem (Capture 6.JPG) & IP-SAKTI Identity */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
          
          {/* Top-Left: Bharat Sarkar Ayush Mantralaya Emblem & Project Branding */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <AyushMinistryLogo />
            
            <div className="hidden lg:flex items-center gap-2.5 pl-4 border-l border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                <Scale className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 dark:text-white leading-tight">
                  IP-SAKTI Sahayak
                </span>
                <span className="text-[10px] sm:text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold leading-none">
                  Traditional Knowledge AI Copilot
                </span>
              </div>
            </div>
          </div>

          {/* Top-Right: Language Quick Toggle & Auth CTA Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={handleToggleLanguage}
              className="sm:hidden px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-md bg-emerald-50 dark:bg-emerald-950/60"
            >
              {isHindi ? 'English' : 'हिन्दी'}
            </button>

            <button
              id="header-login-btn"
              onClick={() => onOpenAuth('signin')}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
            >
              {isHindi ? 'लॉगिन करें' : 'Sign In'}
            </button>
            <button
              id="header-get-started-btn"
              onClick={() => onOpenAuth('signup')}
              className="px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5"
            >
              <span>{isHindi ? 'शुरू करें' : 'Get Started'}</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Live Ayush News & Announcements Marquee in Header below navigation bar */}
        <AyushNewsMarquee language={language} inHeader={true} />
      </header>

      {/* Main SaaS Body */}
      <main className="flex-1 pb-12">
        {/* 3. Automatic Sliding Hero Banner (Banners matching Capture.JPG, Capture 1.JPG, 3.JPG) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
          <AyushHeroSlider language={language} onSelectAction={() => onOpenAuth('signin')} />
        </section>

        {/* 4. Core SaaS Value Proposition Section */}
        <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>
              {isHindi
                ? 'अधिकृत ज्ञान कोष एवं क्रोमाडीबी (ChromaDB) द्वारा संचालित पारंपरिक ज्ञान आसूचना'
                : 'PostgreSQL & ChromaDB-Powered Traditional Knowledge Intelligence'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
            {isHindi ? (
              <>
                आयुर्वेदिक नवाचारों एवं पेटेंट विनियामक कार्यों हेतु{' '}
                <span className="relative inline-block px-3 py-1 mx-1 font-black text-purple-950 dark:text-purple-50">
                  {/* Scratched-Brush Marker Highlight Background */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-purple-300/80 dark:bg-purple-600/50 -rotate-1 rounded-sm -z-10 shadow-sm pointer-events-none"
                    style={{
                      clipPath:
                        'polygon(0% 18%, 3% 8%, 9% 22%, 18% 4%, 28% 18%, 39% 6%, 52% 20%, 65% 5%, 78% 16%, 89% 4%, 98% 15%, 100% 75%, 97% 92%, 88% 82%, 77% 96%, 66% 80%, 53% 94%, 41% 83%, 29% 97%, 18% 85%, 8% 95%, 0% 82%)',
                    }}
                  />
                  {/* Secondary Scratch Texture Overlay */}
                  <svg
                    className="absolute inset-0 w-full h-full text-purple-600/40 dark:text-purple-300/30 pointer-events-none -z-10"
                    viewBox="0 0 280 60"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M 5 22 C 60 12, 140 28, 275 16 M 8 36 C 70 42, 170 25, 272 38 M 15 48 C 90 40, 190 52, 265 44"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="16 5 28 8 12 4"
                    />
                  </svg>
                  <span className="relative z-10">{isHindi ? 'बुद्धिमान सह-पायलट' : 'Ayurvedic Innovations'}</span>
                </span>
              </>
            ) : (
              <>
                Intelligent Regulatory & Patent Intelligence for{' '}
                <span className="relative inline-block px-3 py-1 mx-1 font-black text-purple-950 dark:text-purple-50">
                  {/* Scratched-Brush Marker Highlight Background */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-purple-300/80 dark:bg-purple-600/50 -rotate-1 rounded-sm -z-10 shadow-sm pointer-events-none"
                    style={{
                      clipPath:
                        'polygon(0% 18%, 3% 8%, 9% 22%, 18% 4%, 28% 18%, 39% 6%, 52% 20%, 65% 5%, 78% 16%, 89% 4%, 98% 15%, 100% 75%, 97% 92%, 88% 82%, 77% 96%, 66% 80%, 53% 94%, 41% 83%, 29% 97%, 18% 85%, 8% 95%, 0% 82%)',
                    }}
                  />
                  {/* Secondary Scratch Texture Overlay */}
                  <svg
                    className="absolute inset-0 w-full h-full text-purple-600/40 dark:text-purple-300/30 pointer-events-none -z-10"
                    viewBox="0 0 280 60"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M 5 22 C 60 12, 140 28, 275 16 M 8 36 C 70 42, 170 25, 272 38 M 15 48 C 90 40, 190 52, 265 44"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="16 5 28 8 12 4"
                    />
                  </svg>
                  <span className="relative z-10">Ayurvedic Innovations</span>
                </span>
              </>
            )}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-8 leading-relaxed font-normal">
            {isHindi
              ? 'आईपी-शक्ति सहायक (IP-SAKTI Sahayak) आयुर्वेदिक एमएसएमई (MSMEs), अनुसंधानकर्ताओं एवं पेटेंट वकीलों को वानस्पतिक आईपी, पारंपरिक ज्ञान डिजिटल लाइब्रेरी (TKDL) और वैश्विक पेटेंट योग्यता (Section 3p, 3e, 3d, NBA Form 3) में सटीक एवं साक्ष्य-आधारित मार्गदर्शन प्रदान करता है।'
              : 'IP-SAKTI Sahayak empowers Ayurvedic MSMEs, researchers, and patent attorneys to navigate botanical IP, Traditional Knowledge Digital Library (TKDL) citations, and global patentability with zero hallucinations.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <button
              id="hero-launch-assistant-btn"
              onClick={() => onOpenAuth('signin')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-base"
            >
              <span>{isHindi ? 'प्लेटफ़ॉर्म में प्रवेश करें' : 'Access Platform'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              id="hero-login-btn"
              onClick={() => onOpenAuth('signin')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all flex items-center justify-center gap-2 text-base shadow-xs"
            >
              <LogIn className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>{isHindi ? 'लॉगिन' : 'Login'}</span>
            </button>
          </div>
        </section>
      </main>

      {/* SaaS Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">IP-SAKTI Sahayak</span>
            <span>—</span>
            <span>
              {isHindi
                ? 'आयुष मंत्रालय पारिस्थितिकी तंत्र | उद्यम विनियामक एवं पेटेंट आसूचना मंच'
                : 'Ministry of Ayush Ecosystem | Enterprise Regulatory & Patent Intelligence Platform'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>PostgreSQL (PGlite)</span>
            <span>•</span>
            <span>ChromaDB Vector Store</span>
            <span>•</span>
            <span>Evidence-Grounded RAG</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
