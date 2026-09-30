import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, Building, AlertCircle, CheckCircle2, ArrowRight, FileCheck, Hash } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { UserType, AuthUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  prefillEmail?: string;
  prefillPassword?: string;
  onSuccess?: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  prefillEmail = '',
  prefillPassword = '',
  onSuccess,
}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [userType, setUserType] = useState<UserType>('MSMEs');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    if (prefillEmail) setEmail(prefillEmail);
    if (prefillPassword) setPassword(prefillPassword);
    setError(null);
  }, [initialMode, prefillEmail, prefillPassword, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let loggedUser: AuthUser;
      if (mode === 'signin') {
        loggedUser = await login(email, password);
      } else {
        if (!name.trim()) throw new Error('Full Name is required');
        
        // Validate GST format if provided or if MSMEs
        const trimmedGst = gstNumber.trim().toUpperCase();
        if (trimmedGst && trimmedGst.length > 0) {
          const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
          if (!gstRegex.test(trimmedGst)) {
            throw new Error('Please enter a valid 15-character Indian GSTIN (e.g. 07AAAAA0000A1Z5)');
          }
        }

        loggedUser = await register(name, email, password, organization, userType, trimmedGst);
      }

      if (onSuccess) {
        onSuccess(loggedUser);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div 
        id="auth-modal-card"
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative my-auto max-h-[92vh] flex flex-col"
      >
        <button
          id="auth-modal-close-btn"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-white/80 dark:bg-slate-900/80 shadow-xs border border-slate-200/60 dark:border-slate-700/60"
          aria-label="Close"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="text-center mb-4 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 shadow-inner">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {mode === 'signin' ? 'Sign In to IP-SAKTI' : 'Create an Account'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {mode === 'signin' 
              ? 'Enter your credentials to access your dashboard'
              : 'Register your organization for enterprise patent intelligence'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 mb-4 flex-shrink-0">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === 'signin'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === 'signup'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2 flex-shrink-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-y-auto pr-1 -mr-1 flex-1">
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. Rajesh Sharma"
                      className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Organization / Institution
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="e.g. CCRAS, Ministry of Ayush, Govt. of India"
                      className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* User Type shifted BEFORE GSTIN No. */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    User Type
                  </label>
                  <select
                    value={userType}
                    onChange={(e) => setUserType(e.target.value as UserType)}
                    className="w-full px-3 py-1.5 sm:py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="MSMEs">MSMEs (Manufacturing & Formulation Startups)</option>
                    <option value="Researchers/Searchers">Researchers / Searchers (Academic & Patent Searchers)</option>
                  </select>
                </div>

                {/* GSTIN / GST No. now follows User Type */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      GSTIN / GST No.
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {userType === 'MSMEs' ? 'Recommended for MSMEs' : 'Optional'}
                    </span>
                  </div>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="auth-gst-input"
                      type="text"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. 07AAAAA0000A1Z5 (15 digits)"
                      maxLength={15}
                      className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs font-mono uppercase tracking-wider rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Enter 15-character Goods & Services Tax Identification Number for statutory AYUSH compliance
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.com"
                  className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
