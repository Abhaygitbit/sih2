import React, { useState } from 'react';
import { AuthProvider, useAuth } from './lib/authContext';
import { SaaSHomepage } from './components/SaaSHomepage';
import { AuthModal } from './components/AuthModal';
import { UserDashboard } from './components/user/UserDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Scale } from 'lucide-react';

function MainApp() {
  const { user, isLoading } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [prefillEmail, setPrefillEmail] = useState('');
  const [prefillPass, setPrefillPass] = useState('');

  const handleOpenAuth = (mode: 'signin' | 'signup', email?: string, pass?: string) => {
    setAuthMode(mode);
    setPrefillEmail(email || '');
    setPrefillPass(pass || '');
    setIsAuthOpen(true);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center animate-bounce shadow-md">
            <Scale className="w-5 h-5" />
          </div>
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
            Initializing IP-SAKTI Sahayak Enterprise...
          </span>
        </div>
      </div>
    );
  }

  // 1. Not Authenticated: Render Minimal SaaS Homepage
  if (!user) {
    return (
      <>
        <SaaSHomepage onOpenAuth={handleOpenAuth} />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          initialMode={authMode}
          prefillEmail={prefillEmail}
          prefillPassword={prefillPass}
        />
      </>
    );
  }

  // 2. Authenticated as ADMIN: Render Administrative Command Center
  if (user.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  // 3. Authenticated as USER (MSME or Researcher): Render Client User Dashboard
  return <UserDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
