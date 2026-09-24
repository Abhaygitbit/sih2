import React from 'react';
import { Volume2, Monitor, Eye, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface GovtAccessibilityBarProps {
  currentLang: 'en' | 'hi';
  onToggleLang: () => void;
  onSkipToContent?: () => void;
  fontSize: number;
  onFontSizeChange: (delta: number) => void;
  onResetFontSize: () => void;
}

export const GovtAccessibilityBar: React.FC<GovtAccessibilityBarProps> = ({
  currentLang,
  onToggleLang,
  onSkipToContent,
  fontSize,
  onFontSizeChange,
  onResetFontSize,
}) => {
  return (
    <div
      id="govt-accessibility-header-strip"
      className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs py-1 px-4 select-none"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: National Portal & Official Identity */}
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline-block">
            {currentLang === 'hi' ? 'भारत सरकार | आयुष मंत्रालय' : 'GOVERNMENT OF INDIA | MINISTRY OF AYUSH'}
          </span>
          <span className="text-slate-400 hidden sm:inline-block">|</span>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            {currentLang === 'hi'
              ? 'पारंपरिक ज्ञान एवं पेटेंट आसूचना प्रणाली'
              : 'Traditional Knowledge & Patent Intelligence Portal'}
          </span>
        </div>

        {/* Right: Accessibility Controls matching Indian Govt Guidelines (Capture 5.JPG) */}
        <div className="flex items-center gap-2 sm:gap-4 divide-x divide-slate-300 dark:divide-slate-700 text-[11px]">
          {/* Language Switcher Button matching exact अ/A in 5.JPG */}
          <button
            id="lang-toggle-btn"
            onClick={onToggleLang}
            className="flex items-center gap-1.5 font-bold px-2 py-0.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 transition-colors border border-emerald-300/60 dark:border-emerald-700/60 shadow-2xs"
            title={currentLang === 'hi' ? 'Switch to English' : 'हिन्दी में देखें'}
          >
            <span className="text-sm font-serif">अ</span>
            <span className="text-xs font-sans">/</span>
            <span className="text-xs font-sans font-extrabold">A</span>
            <span className="text-[10px] ml-1 uppercase font-mono px-1 rounded bg-emerald-600 text-white">
              {currentLang === 'hi' ? 'हिन्दी' : 'ENG'}
            </span>
          </button>

          {/* Skip to Main Content (matching icon in 5.JPG) */}
          <button
            onClick={onSkipToContent || (() => window.scrollTo({ top: 400, behavior: 'smooth' }))}
            className="pl-2 sm:pl-3 flex items-center gap-1 hover:text-emerald-600 transition-colors"
            title="Skip to Main Content"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 10 4 15 9 20" />
              <path d="M20 4v7a4 4 0 0 1-4 4H4" />
            </svg>
            <span className="hidden md:inline">
              {currentLang === 'hi' ? 'मुख्य सामग्री पर जाएं' : 'Skip to Content'}
            </span>
          </button>

          {/* Screen Reader Access (matching display icon in 5.JPG) */}
          <button
            onClick={() => alert(currentLang === 'hi' ? 'स्क्रीन रीडर एक्सेसिबिलिटी सक्रिय है।' : 'Screen Reader accessibility mode is enabled.')}
            className="pl-2 sm:pl-3 flex items-center gap-1 hover:text-emerald-600 transition-colors"
            title="Screen Reader Access"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {currentLang === 'hi' ? 'स्क्रीन रीडर' : 'Screen Reader'}
            </span>
          </button>

          {/* Text Size Accessibility Controls (A- / A / A+) */}
          <div className="pl-2 sm:pl-3 flex items-center gap-1">
            <button
              onClick={() => onFontSizeChange(-1)}
              className="px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 font-bold"
              title="Decrease Font Size"
            >
              A-
            </button>
            <button
              onClick={onResetFontSize}
              className="px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 font-bold"
              title="Standard Font Size"
            >
              A
            </button>
            <button
              onClick={() => onFontSizeChange(1)}
              className="px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 font-bold"
              title="Increase Font Size"
            >
              A+
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
