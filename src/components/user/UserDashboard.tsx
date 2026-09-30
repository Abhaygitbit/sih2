import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Bot, 
  History, 
  FileDown, 
  User, 
  LogOut, 
  Send, 
  ShieldCheck, 
  FileText, 
  Sparkles, 
  ExternalLink, 
  Trash2, 
  Search, 
  RefreshCw,
  Building,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Sun,
  Moon,
  ArrowRight,
  Download,
  Key,
  Edit3
} from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { downloadPDFReport } from '../../lib/pdfReport';
import { ChatMessage, ConversationItem, RAGCitation, Jurisdiction } from '../../types';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const UserDashboard: React.FC = () => {
  const { user, token, logout, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'history' | 'reports' | 'profile'>('dashboard');

  // Dark mode state
  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark');
  });

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Chat State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationTitle, setActiveConversationTitle] = useState<string>('New Research Consultation');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('india');
  const [chatLoading, setChatLoading] = useState(false);

  // History & Reports State
  const [historySearch, setHistorySearch] = useState('');
  const [selectedCitation, setSelectedCitation] = useState<RAGCitation | null>(null);

  // Profile Edit State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileOrg, setProfileOrg] = useState(user?.organization || '');
  const [profileGst, setProfileGst] = useState(user?.gst_number || '');
  const [profileCurrentPass, setProfileCurrentPass] = useState('');
  const [profileNewPass, setProfileNewPass] = useState('');
  const [profileConfirmPass, setProfileConfirmPass] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Sync state when user changes
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileOrg(user.organization || '');
      setProfileGst(user.gst_number || '');
    }
  }, [user]);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [token]);

  const fetchConversations = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (e) {
      console.warn('Failed to load conversations:', e);
    }
  };

  const loadConversation = async (convId: string) => {
    if (!token) return;
    try {
      setChatLoading(true);
      const res = await fetch(`/api/conversations/${convId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveConversationId(data.conversation.id);
        setActiveConversationTitle(data.conversation.title);
        setMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.created_at,
            citations: m.citations,
            evidence_sources: m.evidence_sources,
          }))
        );
        setActiveTab('chat');
      }
    } catch (e) {
      console.warn('Failed to load conversation details:', e);
    } finally {
      setChatLoading(false);
    }
  };

  const deleteConversation = async (convId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!token || !confirm('Are you sure you want to delete this consultation history?')) return;
    try {
      const res = await fetch(`/api/conversations/${convId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (activeConversationId === convId) {
          setActiveConversationId(null);
          setMessages([]);
          setActiveConversationTitle('New Research Consultation');
        }
      }
    } catch (err) {
      console.warn('Delete conversation failed:', err);
    }
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setActiveConversationTitle('New Research Consultation');
    setMessages([]);
    setActiveTab('chat');
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputMessage).trim();
    if (!textToSend || !token || chatLoading) return;

    setInputMessage('');
    const tempUserMsg: ChatMessage = {
      id: 'temp_u_' + Date.now(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat/rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: textToSend,
          conversationId: activeConversationId,
          jurisdiction,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process inquiry');
      }

      if (!activeConversationId && data.conversationId) {
        setActiveConversationId(data.conversationId);
        setActiveConversationTitle(textToSend.slice(0, 45) + (textToSend.length > 45 ? '...' : ''));
        fetchConversations();
      }

      const assistantMsg: ChatMessage = {
        id: data.messageId || 'asst_' + Date.now(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
        citations: data.citations || [],
        evidence_sources: (data.citations || []).map((c: any) => c.documentTitle),
        sourceEngine: data.sourceEngine,
        evidenceFound: data.evidenceFound,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: 'err_' + Date.now(),
        role: 'assistant',
        content: `⚠️ Error processing inquiry: ${err.message || 'Please verify network or API keys.'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDownloadReport = (msg?: ChatMessage) => {
    if (!user) return;
    downloadPDFReport({
      title: activeConversationTitle || 'AYUSH Patent Intelligence Consultation',
      user,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        citations: m.citations,
        sourceEngine: m.sourceEngine,
      })),
      query: messages.find((m) => m.role === 'user')?.content || activeConversationTitle,
      answer: msg ? msg.content : (messages[messages.length - 1]?.content || ''),
      citations: msg ? (msg.citations || []) : undefined,
      timestamp: msg?.timestamp || new Date().toISOString(),
    });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSaveSuccess(false);

    if (profileNewPass && profileNewPass.length < 6) {
      setProfileError('New password must be at least 6 characters long');
      return;
    }

    if (profileNewPass && profileNewPass !== profileConfirmPass) {
      setProfileError('New passwords do not match');
      return;
    }

    setProfileSaving(true);
    try {
      const cleanGst = profileGst.trim().toUpperCase();
      if (cleanGst.length > 0) {
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(cleanGst)) {
          throw new Error('Please enter a valid 15-character Indian GSTIN (e.g. 07AAAAA0000A1Z5)');
        }
      }
      await updateProfile(
        profileName,
        profileOrg,
        cleanGst,
        profileCurrentPass || undefined,
        profileNewPass || undefined
      );
      setProfileSaveSuccess(true);
      setProfileCurrentPass('');
      setProfileNewPass('');
      setProfileConfirmPass('');
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Could not update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between z-30">
        <div>
          {/* Brand header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-sm">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                IP-SAKTI Sahayak
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Enterprise Client Portal
              </div>
            </div>
          </div>

          {/* User badge */}
          <div className="p-3 mx-3 my-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-600/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-xs">
                {user?.name?.slice(0, 2).toUpperCase() || 'US'}
              </div>
              <div className="overflow-hidden flex-1">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user?.name}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  {user?.organization || user?.email}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                {user?.user_type}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="text-[9px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-bold underline cursor-pointer"
              >
                Edit Profile
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-2 space-y-1">
            <button
              id="user-nav-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard / Home</span>
            </button>

            <button
              id="user-nav-chat"
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'chat'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>AI Chatbot (RAG)</span>
            </button>

            <button
              id="user-nav-history"
              onClick={() => { setActiveTab('history'); fetchConversations(); }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'history'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Chat History</span>
              {conversations.length > 0 && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {conversations.length}
                </span>
              )}
            </button>

            <button
              id="user-nav-reports"
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'reports'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <FileDown className="w-4 h-4" />
              <span>Download Reports</span>
            </button>

            <button
              id="user-nav-profile"
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'profile'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <User className="w-4 h-4" />
              <span>User Profile</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2">
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {isDark ? 'Light Theme' : 'Dark Theme'}
            </span>
          </button>

          <button
            id="user-logout-btn"
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* VIEW 1: DASHBOARD / OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Welcome, {user?.name}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Assigned Profile: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{user?.user_type}</span> ({user?.organization})
                </p>
              </div>

              <button
                onClick={startNewChat}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-all self-start"
              >
                <Bot className="w-4 h-4" /> Start New Consultation
              </button>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-medium">Consultations</span>
                  <Bot className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{conversations.length}</div>
                <div className="text-[10px] text-slate-400 mt-1">Saved in database</div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-medium">Knowledge Corpus</span>
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">4 Dossiers</div>
                <div className="text-[10px] text-slate-400 mt-1">11+ Indexed Vector Chunks</div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-medium">Evidentiary Standard</span>
                  <Scale className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Strict RAG</div>
                <div className="text-[10px] text-slate-400 mt-1">No-Hallucination Safe</div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-medium">Account Status</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold capitalize text-slate-900 dark:text-white">{user?.status}</div>
                <div className="text-[10px] text-slate-400 mt-1">Active Client Session</div>
              </div>
            </div>

            {/* Quick Consultation Cards */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                Targeted Ayurvedic IP Research Topics
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  onClick={() => {
                    startNewChat();
                    handleSendMessage('What is the virya and pharmacological profile of Neem according to TKDL and how does Section 3(p) apply?');
                  }}
                  className="p-4 text-left rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-sm hover:shadow transition-all group"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white mb-1">
                    <span>Neem (Azadirachta indica) Virya & TKDL Prior Art</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Verify Sheeta (cooling) virya evidence and Section 3(p) patent bar guidelines.
                  </p>
                </button>

                <button
                  onClick={() => {
                    startNewChat();
                    handleSendMessage('How can an Ayurvedic combination of Curcumin and Piperine qualify for patent protection under Section 3(e) synergistic efficacy?');
                  }}
                  className="p-4 text-left rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-sm hover:shadow transition-all group"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white mb-1">
                    <span>Section 3(e) Synergistic Admixtures</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Learn evidentiary criteria (Chou-Talalay, bioavailability) to overcome mere aggregation bars.
                  </p>
                </button>

                <button
                  onClick={() => {
                    startNewChat();
                    handleSendMessage('Compare Indian Patent Office Section 3(p) against USPTO 35 U.S.C. 101 Natural Products doctrine and EPO Article 53(c).');
                  }}
                  className="p-4 text-left rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-sm hover:shadow transition-all group"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white mb-1">
                    <span>Cross-Border Patent Comparison (IPO vs USPTO vs EPO)</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Evaluate patent eligibility and claim drafting strategies across US, Europe, and India.
                  </p>
                </button>

                <button
                  onClick={() => {
                    startNewChat();
                    handleSendMessage('What are the statutory requirements for filing NBA Form 3 prior approval under Section 6 of Biological Diversity Act before international patent filing?');
                  }}
                  className="p-4 text-left rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-sm hover:shadow transition-all group"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white mb-1">
                    <span>NBA Form 3 Compliance & Benefit Sharing</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Review statutory deadlines, benefit sharing percentages, and export permissions.
                  </p>
                </button>
              </div>
            </div>

            {/* Recent consultations preview */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Research Consultations</h3>
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  View All History
                </button>
              </div>

              {conversations.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No previous consultations. Launch the AI Chatbot to begin.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {conversations.slice(0, 4).map((c) => (
                    <div
                      key={c.id}
                      onClick={() => loadConversation(c.id)}
                      className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <div>
                          <div className="text-xs font-medium text-slate-800 dark:text-slate-200">{c.title}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(c.updated_at).toLocaleDateString()} • {c.message_count || 1} messages
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: AI CHATBOT (RAG) */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950">
            {/* Chat header */}
            <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                    {activeConversationTitle}
                  </h2>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>Evidence-Grounded RAG</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">ChromaDB + PostgreSQL</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value as Jurisdiction)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="india">🇮🇳 Indian Patents Act (IPO)</option>
                  <option value="international">🌐 Global / USPTO / EPO</option>
                </select>

                {messages.length > 0 && (
                  <button
                    onClick={() => handleDownloadReport()}
                    className="px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors flex items-center gap-1.5 shadow-sm"
                    title="Export publication-ready PDF containing all questions, answers, and verified citations"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Full Chat Report</span>
                  </button>
                )}

                <button
                  onClick={startNewChat}
                  className="px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  + New Chat
                </button>
              </div>
            </div>

            {/* Chat messages body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="max-w-xl mx-auto my-12 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                    <Scale className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Ayurvedic Regulatory & Patent RAG Assistant
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Ask any question regarding Ayurvedic formulations, Traditional Knowledge Digital Library (TKDL) references, Indian Patent Act (Section 3p, 3e, 3d), or USPTO/EPO filing. Responses cite exact document pages and sections.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4 text-left">
                    <button
                      onClick={() => handleSendMessage('What is the virya of Neem and how does TKDL protect it from international patents?')}
                      className="p-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 text-slate-700 dark:text-slate-300 transition-all shadow-sm"
                    >
                      🌿 "What is the virya of Neem and how does TKDL protect it?"
                    </button>
                    <button
                      onClick={() => handleSendMessage('How do I prove synergistic enhancement for Curcumin under Section 3(e)?')}
                      className="p-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 text-slate-700 dark:text-slate-300 transition-all shadow-sm"
                    >
                      ⚖️ "How do I prove synergistic enhancement under Section 3(e)?"
                    </button>
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-3xl rounded-2xl p-4 sm:p-5 shadow-sm text-xs leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                      }`}
                    >
                      {/* Citations Box for Assistant messages */}
                      {m.role === 'assistant' && m.citations && m.citations.length > 0 && (
                        <div className="mb-4 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Verified Retrieved Evidence ({m.citations.length} Sources)
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                              ChromaDB Vector Match
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {m.citations.slice(0, 3).map((c, i) => (
                              <div
                                key={i}
                                onClick={() => setSelectedCitation(c)}
                                className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-all"
                              >
                                <div className="overflow-hidden">
                                  <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    [{i + 1}] {c.documentTitle}
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate">
                                    Section: {c.section || 'General'} • Page {c.page || 1}
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 ml-2">
                                  {c.relevanceScore}% match
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Content rendering */}
                      <div className="font-sans text-xs text-slate-800 dark:text-slate-100 overflow-x-auto leading-relaxed">
                        <Markdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ ...props }) => <h1 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mt-3 mb-1.5 border-b border-emerald-100 dark:border-emerald-950 pb-1" {...props} />,
                            h2: ({ ...props }) => <h2 className="text-xs font-bold text-slate-900 dark:text-white mt-3 mb-1" {...props} />,
                            h3: ({ ...props }) => <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-2 mb-1" {...props} />,
                            p: ({ ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
                            ul: ({ ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                            ol: ({ ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                            li: ({ ...props }) => <li className="leading-relaxed" {...props} />,
                            strong: ({ ...props }) => <strong className="font-bold text-slate-950 dark:text-white" {...props} />,
                            table: ({ ...props }) => (
                              <div className="my-2.5 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                                <table className="w-full text-[11px] border-collapse" {...props} />
                              </div>
                            ),
                            th: ({ ...props }) => <th className="bg-slate-100 dark:bg-slate-800/80 p-2 font-bold text-left border-b border-slate-200 dark:border-slate-700" {...props} />,
                            td: ({ ...props }) => <td className="p-2 border-b border-slate-100 dark:border-slate-800/60" {...props} />,
                            code: ({ ...props }) => <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-emerald-700 dark:text-emerald-400" {...props} />,
                            blockquote: ({ ...props }) => <blockquote className="border-l-2 border-emerald-500 pl-3 my-2 italic text-slate-600 dark:text-slate-400" {...props} />,
                          }}
                        >
                          {m.content}
                        </Markdown>
                      </div>

                      {/* Actions footer on assistant messages */}
                      {m.role === 'assistant' && (
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-2">
                            <span>Grounded in active corpus</span>
                            {m.sourceEngine && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                                {m.sourceEngine}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleDownloadReport(m)}
                            className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 transition-colors"
                          >
                            <FileDown className="w-3.5 h-3.5" /> Download Report
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {chatLoading && (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-max shadow-sm animate-pulse text-xs text-slate-500">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce [animation-delay:-0.3s]" />
                  <span>Searching ChromaDB vector store & verifying evidence...</span>
                </div>
              )}
            </div>

            {/* Chat input footer */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="max-w-4xl mx-auto flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask a technical or regulatory question (e.g. 'What is the virya of Neem according to TKDL?')..."
                  className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || chatLoading}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* VIEW 3: CHAT HISTORY */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Consultation History</h1>
                <p className="text-xs text-slate-500">
                  Every user conversation is persistently recorded in PostgreSQL. Only you can access your consultations.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search consultations..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {filteredConversations.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                No past consultations found matching your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredConversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => loadConversation(c.id)}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-sm flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {c.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Started: {new Date(c.created_at).toLocaleString()} • {c.message_count || 1} messages
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          loadConversation(c.id);
                        }}
                        className="px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-lg transition-colors"
                      >
                        Reopen
                      </button>
                      <button
                        onClick={(e) => deleteConversation(c.id, e)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: DOWNLOAD REPORTS */}
        {activeTab === 'reports' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-4">
            <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Research Dossier Reports</h1>
              <p className="text-xs text-slate-500">
                Generate and download publication-grade PDF dossiers from previous research consultations. Each dossier contains verified citations, section references, and patent eligibility disclosures.
              </p>
            </div>

            {conversations.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                No consultations found. Ask questions in the AI Chatbot to generate downloadable research reports.
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 font-semibold">Consultation Topic</th>
                      <th className="p-3 font-semibold">Messages</th>
                      <th className="p-3 font-semibold">Date</th>
                      <th className="p-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {conversations.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate">
                          {c.title}
                        </td>
                        <td className="p-3 text-slate-500">{c.message_count || 1} records</td>
                        <td className="p-3 text-slate-500">{new Date(c.updated_at).toLocaleDateString()}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => loadConversation(c.id)}
                            className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors inline-flex items-center gap-1.5"
                          >
                            <FileDown className="w-3.5 h-3.5" /> Export PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 5: USER PROFILE */}
        {activeTab === 'profile' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                  <User className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  User Profile & Account Settings
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  View and manage your institutional identity, statutory registration, and security credentials.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED AYUSH CLIENT
                </span>
              </div>
            </div>

            {/* Profile Overview Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/40 flex items-center justify-center text-white text-2xl font-black shadow-inner backdrop-blur-md">
                    {user?.name?.slice(0, 2).toUpperCase() || 'US'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{user?.name}</h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-400/30">
                        {user?.user_type || 'MSMEs'}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-200 mt-0.5 font-mono">{user?.email}</p>
                    <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-teal-300" />
                      <span>{user?.organization || 'Institutional Client'}</span>
                      {user?.gst_number && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-emerald-200">
                          GST: {user.gst_number}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10 text-xs text-emerald-200 space-y-1">
                  <div>Role: <span className="font-bold text-white uppercase font-mono">{user?.role}</span></div>
                  <div>Status: <span className="font-bold text-white uppercase font-mono">{user?.status || 'active'}</span></div>
                  <div className="text-[11px] text-slate-400 font-mono">ID: {user?.id}</div>
                </div>
              </div>
            </div>

            {profileSaveSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Profile details and credentials successfully updated in the database.</span>
              </div>
            )}

            {profileError && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {/* Profile Edit Form Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-600" />
                  Edit Profile Information
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your personal name, affiliated organization, and statutory GSTIN.
                </p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="e.g. Dr. Priya Sharma"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Organization / Institution
                    </label>
                    <input
                      type="text"
                      value={profileOrg}
                      onChange={(e) => setProfileOrg(e.target.value)}
                      placeholder="e.g. Arya Vaidya Herbal Formulations Pvt Ltd"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      GSTIN / GST Number
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={profileGst}
                      onChange={(e) => setProfileGst(e.target.value.toUpperCase())}
                      placeholder="e.g. 07AAAAA0000A1Z5"
                      className="w-full px-3 py-2 text-xs font-mono uppercase tracking-wider rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Assigned User Type (Admin-Managed)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user?.user_type || 'MSMEs'}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Email Address (Locked)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Your email address is your unique system identifier and cannot be changed without administrator intervention.
                  </p>
                </div>

                {/* Password update section */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-600" />
                    Change Security Password (Optional)
                  </h4>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Leave password fields blank if you only want to update your name or organization details.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={profileCurrentPass}
                        onChange={(e) => setProfileCurrentPass(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={profileNewPass}
                        onChange={(e) => setProfileNewPass(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={profileConfirmPass}
                        onChange={(e) => setProfileConfirmPass(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-400">
                    Account Status: <span className="text-emerald-600 font-bold uppercase">{user?.status || 'active'}</span>
                  </div>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    {profileSaving ? (
                      <>
                        <span className="inline-block animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                        <span>Updating Profile...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Save Profile Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* CITATION DETAILS MODAL */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Verified Citation Metadata
              </span>
              <button
                onClick={() => setSelectedCitation(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 rounded"
              >
                ✕ Close
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">DOCUMENT TITLE:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedCitation.documentTitle}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px]">SECTION:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedCitation.section || 'General'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">PAGE:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedCitation.page || 1}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">SOURCE FILE:</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {selectedCitation.source}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] mb-1">VERIFIED EVIDENCE EXCERPT:</span>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed max-h-48 overflow-y-auto">
                  {selectedCitation.snippet}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
