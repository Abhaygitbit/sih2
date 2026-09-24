import React from 'react';
import stateEmblemImg from '../assets/images/state_emblem_india.jpg';

interface AyushMinistryLogoProps {
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export const AyushMinistryLogo: React.FC<AyushMinistryLogoProps> = ({ className = '', theme = 'auto' }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Official State Emblem of India (Ashoka Lion Capital with Satyameva Jayate) Photo */}
      <div className="relative flex-shrink-0 flex items-center justify-center">
        <img
          src={stateEmblemImg}
          alt="State Emblem of India - Satyameva Jayate"
          className="w-10 h-14 object-contain mix-blend-multiply dark:filter dark:invert dark:mix-blend-screen drop-shadow-xs"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Official Government of India & Ministry of Ayush Typography */}
      <div className="flex flex-col border-l border-slate-300 dark:border-slate-700 pl-3">
        <span className="text-xs sm:text-sm font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight font-serif">
          भारत सरकार
        </span>
        <span className="text-sm sm:text-base font-black tracking-tight text-emerald-800 dark:text-emerald-400 leading-tight">
          आयुष मंत्रालय
        </span>
        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300 tracking-wide leading-none mt-0.5">
          Ministry of Ayush, Govt. of India
        </span>
      </div>
    </div>
  );
};
