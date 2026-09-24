import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileBox, 
  ShieldAlert, 
  Bot, 
  Settings, 
  LogOut, 
  Plus, 
  UploadCloud, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Send,
  Database,
  Layers,
  FileText,
  AlertTriangle,
  Scale,
  Sun,
  Moon,
  Lock,
  UserCheck,
  X
} from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { AuthUser, DocumentItem, AuditLogItem, UserRole, UserType } from '../../types';

export const AdminDashboard: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'data' | 'audit' | 'chat' | 'settings'>('overview');

  // Dark theme
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

  // State: Users
  const [userList, setUserList] = useState<AuthUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [userFormName, setUserFormName] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormPass, setUserFormPass] = useState('');
  const [userFormRole, setUserFormRole] = useState<UserRole>('USER');
  const [userFormType, setUserFormType] = useState<UserType>('MSMEs');
  const [userFormOrg, setUserFormOrg] = useState('');
  const [userFormGst, setUserFormGst] = useState('');
  const [userFormStatus, setUserFormStatus] = useState<'active' | 'disabled'>('active');
  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);

  // State: Documents
  const [documentList, setDocumentList] = useState<DocumentItem[]>([]);
  const [totalChromaChunks, setTotalChromaChunks] = useState(0);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [deleteDocSuccess, setDeleteDocSuccess] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [deleteDocError, setDeleteDocError] = useState<string | null>(null);
  const [reprocessingDocId, setReprocessingDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State: Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');

  // State: Admin Chatbot
  const [adminMessages, setAdminMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: '👋 Welcome Administrator. I am your Administrative & RAG Intelligence Assistant. You can ask me queries about system statistics (e.g. "How many users are active?", "How many documents are indexed?") or test traditional knowledge patent queries.',
    },
  ]);
  const [adminInput, setAdminInput] = useState('');
  const [adminChatLoading, setAdminChatLoading] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchUsers();
    fetchDocuments();
    fetchAuditLogs();
  }, [token]);

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserList(data.users || []);
      }
    } catch (e) {
      console.warn('Fetch users error:', e);
    }
  };

  const fetchDocuments = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/documents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDocumentList(data.documents || []);
        setTotalChromaChunks(data.totalChromaChunks || 0);
      }
    } catch (e) {
      console.warn('Fetch documents error:', e);
    }
  };

  const fetchAuditLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/audit-logs?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.warn('Fetch audit logs error:', e);
    }
  };

  // User Actions
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionError(null);
    setUserActionSuccess(null);

    try {
      const cleanGst = userFormGst.trim().toUpperCase();
      if (cleanGst.length > 0) {
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(cleanGst)) {
          throw new Error('Please enter a valid 15-character Indian GSTIN (e.g. 07AAAAA0000A1Z5)');
        }
      }

      if (editingUser) {
        // Update user
        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: userFormName,
            email: userFormEmail,
            role: userFormRole,
            user_type: userFormType,
            organization: userFormOrg,
            gst_number: cleanGst,
            status: userFormStatus,
            password: userFormPass.trim().length > 0 ? userFormPass : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update user');
        setUserActionSuccess('User updated successfully');
      } else {
        // Create user
        if (!userFormPass) throw new Error('Password is required for new accounts');
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: userFormName,
            email: userFormEmail,
            password: userFormPass,
            role: userFormRole,
            user_type: userFormType,
            organization: userFormOrg,
            gst_number: cleanGst,
            status: userFormStatus,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create user');
        setUserActionSuccess('User created successfully');
      }

      setIsAddUserModalOpen(false);
      setEditingUser(null);
      resetUserForm();
      fetchUsers();
      fetchAuditLogs();
    } catch (err: any) {
      setUserActionError(err.message || 'Action failed');
    }
  };

  const handleToggleUserStatus = async (targetUser: AuthUser) => {
    if (!token) return;
    const nextStatus = targetUser.status === 'active' ? 'disabled' : 'active';
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchUsers();
        fetchAuditLogs();
      }
    } catch (err) {
      console.warn('Toggle status error:', err);
    }
  };

  const handleDeleteUser = async (targetUser: AuthUser) => {
    if (!token) return;
    if (!confirm(`Are you sure you want to delete user "${targetUser.name}" (${targetUser.email})? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      fetchUsers();
      fetchAuditLogs();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const openAddUser = () => {
    resetUserForm();
    setEditingUser(null);
    setIsAddUserModalOpen(true);
  };

  const openEditUser = (u: AuthUser) => {
    setEditingUser(u);
    setUserFormName(u.name);
    setUserFormEmail(u.email);
    setUserFormPass('');
    setUserFormRole(u.role);
    setUserFormType(u.user_type);
    setUserFormOrg(u.organization || '');
    setUserFormGst(u.gst_number || '');
    setUserFormStatus(u.status);
    setIsAddUserModalOpen(true);
  };

  const resetUserForm = () => {
    setUserFormName('');
    setUserFormEmail('');
    setUserFormPass('');
    setUserFormRole('USER');
    setUserFormType('MSMEs');
    setUserFormOrg('');
    setUserFormGst('');
    setUserFormStatus('active');
    setUserActionError(null);
  };

  // Document Actions
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !token || isUploading) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setDeleteDocSuccess(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    if (uploadTitle.trim()) {
      formData.append('title', uploadTitle.trim());
    }

    try {
      const res = await fetch('/api/admin/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setUploadSuccess(`Document "${uploadFile.name}" uploaded successfully! Embedding and indexing pipeline in progress.`);
      setUploadFile(null);
      setUploadTitle('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      fetchDocuments();
      fetchAuditLogs();

      // Poll periodically to track background extraction and embedding progress
      const pollDelays = [1500, 3500, 6000, 9000];
      pollDelays.forEach((delay) => {
        setTimeout(() => {
          fetchDocuments();
          fetchAuditLogs();
        }, delay);
      });
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReprocessDocument = async (docId: string) => {
    if (!token || reprocessingDocId) return;
    setReprocessingDocId(docId);
    setUploadError(null);
    try {
      const res = await fetch(`/api/admin/documents/${docId}/reprocess`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reprocess failed');

      fetchDocuments();
      fetchAuditLogs();

      setTimeout(() => {
        fetchDocuments();
        fetchAuditLogs();
        setReprocessingDocId(null);
      }, 3000);
    } catch (err: any) {
      console.warn('Reprocess document error:', err);
      setUploadError(err.message || 'Reprocessing failed');
      setReprocessingDocId(null);
    }
  };

  const handleDeleteDocument = (doc: DocumentItem) => {
    setDocumentToDelete(doc);
    setDeleteDocError(null);
  };

  const handleConfirmDeleteDocument = async () => {
    if (!token || !documentToDelete || isDeletingDoc) return;

    setIsDeletingDoc(true);
    setDeleteDocError(null);

    try {
      const res = await fetch(`/api/admin/documents/${documentToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete document');

      // Optimistic update of local table
      setDocumentList((prev) => prev.filter((d) => d.id !== documentToDelete.id));
      if (typeof data.totalChromaChunks === 'number') {
        setTotalChromaChunks(data.totalChromaChunks);
      }
      setDeleteDocSuccess(data.message || `Document "${documentToDelete.title}" and associated vector embeddings were deleted.`);
      setDocumentToDelete(null);

      fetchDocuments();
      fetchAuditLogs();
    } catch (err: any) {
      setDeleteDocError(err.message || 'Delete operation failed');
    } finally {
      setIsDeletingDoc(false);
    }
  };

  // Admin Chatbot
  const handleAdminChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminInput.trim() || !token || adminChatLoading) return;

    const q = adminInput.trim();
    setAdminInput('');
    setAdminMessages((prev) => [...prev, { role: 'user', content: q }]);
    setAdminChatLoading(true);

    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: q }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get admin response');

      setAdminMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err: any) {
      setAdminMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ Error: ${err.message || 'Could not query admin intelligence'}` },
      ]);
    } finally {
      setAdminChatLoading(false);
    }
  };

  // Filtered Users & Logs
  const filteredUsers = userList.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.organization && u.organization.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredLogs = auditLogs.filter((log) => {
    if (auditActionFilter !== 'all' && log.action !== auditActionFilter) return false;
    if (auditSearch.trim()) {
      const s = auditSearch.toLowerCase();
      return (
        (log.user_email && log.user_email.toLowerCase().includes(s)) ||
        (log.action && log.action.toLowerCase().includes(s)) ||
        (log.resource && log.resource.toLowerCase().includes(s))
      );
    }
    return true;
  });

  const activeUsersCount = userList.filter((u) => u.status === 'active').length;
  const processedDocsCount = documentList.filter((d) => d.status === 'processed').length;

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* ADMIN SIDEBAR */}
      <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between z-30">
        <div>
          {/* Brand header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-sm">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                IP-SAKTI Admin
              </div>
              <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                Regulatory Controller Portal
              </div>
            </div>
          </div>

          {/* Admin badge */}
          <div className="p-3 mx-3 my-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                AD
              </div>
              <div className="overflow-hidden flex-1">
                <div className="text-xs font-semibold text-purple-900 dark:text-purple-200 truncate">
                  {user?.name}
                </div>
                <div className="text-[10px] text-purple-600 dark:text-purple-400 truncate">
                  {user?.email}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between pt-2 border-t border-purple-200/60 dark:border-purple-900/60">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                ROLE: {user?.role}
              </span>
              <span className="text-[9px] text-purple-500 font-semibold">SUPERUSER</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-2 space-y-1">
            <button
              id="admin-nav-overview"
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'overview'
                  ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard Overview</span>
            </button>

            <button
              id="admin-nav-users"
              onClick={() => { setActiveTab('users'); fetchUsers(); }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'users'
                  ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Management</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {userList.length}
              </span>
            </button>

            <button
              id="admin-nav-data"
              onClick={() => { setActiveTab('data'); fetchDocuments(); }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'data'
                  ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <FileBox className="w-4 h-4" />
              <span>Data Management (RAG)</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {documentList.length}
              </span>
            </button>

            <button
              id="admin-nav-audit"
              onClick={() => { setActiveTab('audit'); fetchAuditLogs(); }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'audit'
                  ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>System Audit Logs</span>
            </button>

            <button
              id="admin-nav-chat"
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'chat'
                  ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Admin Chatbot</span>
            </button>

            <button
              id="admin-nav-settings"
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'settings'
                  ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>System Diagnostics</span>
            </button>
          </nav>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2">
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          <button
            id="admin-logout-btn"
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit Admin Portal</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* VIEW 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Regulatory & System Overview
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time telemetry from in-process PostgreSQL (PGlite) and ChromaDB persistent vector collection.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { fetchUsers(); fetchDocuments(); fetchAuditLogs(); }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm flex items-center gap-1.5 hover:bg-slate-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetry
                </button>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-medium">Registered Users</span>
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{userList.length}</div>
                <div className="text-[10px] text-emerald-600 font-medium mt-1">
                  {activeUsersCount} Active accounts
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-medium">Knowledge Documents</span>
                  <FileBox className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{documentList.length}</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {processedDocsCount} processed and indexed
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-medium">ChromaDB Vector Chunks</span>
                  <Database className="w-4 h-4 text-teal-600" />
                </div>
                <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{totalChromaChunks}</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Persistent semantic embeddings
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-medium">Audit Events Recorded</span>
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{auditLogs.length}</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Full tamper-resistant log
                </div>
              </div>
            </div>

            {/* Quick action cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div 
                onClick={() => openAddUser()}
                className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500 cursor-pointer transition-all shadow-sm group"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center mb-3">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Provision New User</h3>
                <p className="text-xs text-slate-500">Create MSME or Researcher accounts with custom passwords and permissions.</p>
              </div>

              <div 
                onClick={() => setActiveTab('data')}
                className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 cursor-pointer transition-all shadow-sm group"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mb-3">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Ingest Regulatory Dossier</h3>
                <p className="text-xs text-slate-500">Upload PDF or DOCX classical texts, patent acts, or bioethics manuals into ChromaDB.</p>
              </div>

              <div 
                onClick={() => setActiveTab('chat')}
                className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500 cursor-pointer transition-all shadow-sm group"
              >
                <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center mb-3">
                  <Bot className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Admin Assistant</h3>
                <p className="text-xs text-slate-500">Query real-time user metrics, indexing status, or test RAG queries with source citations.</p>
              </div>
            </div>

            {/* Recent Audit Feed */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent System Audit Trail</h3>
                <button
                  onClick={() => setActiveTab('audit')}
                  className="text-xs text-purple-600 dark:text-purple-400 font-medium hover:underline"
                >
                  View Full Audit Log
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {log.action}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200">{log.user_email}</span>
                      <span className="text-slate-400 text-[11px] hidden sm:inline">→ {log.resource}</span>
                    </div>
                    <span className="text-slate-400 text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">User Management</h1>
                <p className="text-xs text-slate-500">
                  Manage registered MSMEs, Researchers, and Admins. Control roles, user types, passwords, and active access states.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <button
                  id="admin-add-user-btn"
                  onClick={openAddUser}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add User
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 font-semibold">User Details</th>
                    <th className="p-3 font-semibold">Organization</th>
                    <th className="p-3 font-semibold">GSTIN</th>
                    <th className="p-3 font-semibold">User Type</th>
                    <th className="p-3 font-semibold">Role</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{u.name}</div>
                        <div className="text-[10px] text-slate-400">{u.email}</div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {u.organization || '—'}
                      </td>
                      <td className="p-3">
                        {u.gst_number ? (
                          <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {u.gst_number}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                          {u.user_type}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 w-max transition-colors ${
                            u.status === 'active'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                              : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-200'
                          }`}
                          title="Click to toggle status"
                        >
                          {u.status === 'active' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" /> Disabled
                            </>
                          )}
                        </button>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => openEditUser(u)}
                          className="p-1 text-slate-400 hover:text-purple-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit user"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 3: DATA MANAGEMENT (DOCUMENTS & PIPELINE) */}
        {activeTab === 'data' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Knowledge Data Management</h1>
                <p className="text-xs text-slate-500">
                  Upload PDF and DOCX files into the RAG corpus. Files are extracted, chunked, embedded, and indexed in ChromaDB.
                </p>
              </div>

              <button
                onClick={fetchDocuments}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm flex items-center gap-1.5 hover:bg-slate-50 self-start"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Pipeline
              </button>
            </div>

            {/* Document Upload Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                Upload New Document (PDF, DOCX, or TXT)
              </h3>

              {uploadSuccess && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{uploadSuccess}</span>
                  </div>
                  <button onClick={() => setUploadSuccess(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {deleteDocSuccess && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{deleteDocSuccess}</span>
                  </div>
                  <button onClick={() => setDeleteDocSuccess(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {uploadError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                  <button onClick={() => setUploadError(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <form onSubmit={handleUploadDocument} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Document Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. Ayurvedic Pharmacopoeia Guidelines"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Select Knowledge File (.pdf, .docx, .txt)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      required
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-950 dark:file:text-purple-300"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    id="btn-upload-knowledge-doc"
                    disabled={!uploadFile || isUploading}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    {isUploading ? (
                      <>
                        <span className="inline-block animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                        <span>Extracting & Indexing...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload & Index in ChromaDB</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Documents List Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Indexed Knowledge Corpus Documents ({documentList.length})
                </h3>
                <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400">
                  {totalChromaChunks} Total Chunks Indexed in ChromaDB
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 font-semibold">Title & File</th>
                      <th className="p-3 font-semibold">Type</th>
                      <th className="p-3 font-semibold">Chunks</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Uploaded</th>
                      <th className="p-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {documentList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">
                          No knowledge documents indexed yet. Upload a PDF or DOCX above.
                        </td>
                      </tr>
                    ) : (
                      documentList.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 max-w-sm">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{doc.title}</div>
                            <div className="text-[10px] text-slate-400 truncate">{doc.original_name}</div>
                          </td>
                          <td className="p-3">
                            <span className="font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {doc.file_type}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                            {doc.total_chunks}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                                doc.status === 'processed'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : doc.status === 'failed'
                                  ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 animate-pulse'
                              }`}>
                                {doc.status}
                              </span>
                              {doc.status === 'failed' && doc.error_message && (
                                <span className="text-[10px] text-red-500 dark:text-red-400 truncate max-w-xs" title={doc.error_message}>
                                  {doc.error_message}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-[11px] text-slate-400">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right space-x-1 whitespace-nowrap">
                            <button
                              type="button"
                              id={`btn-reprocess-doc-${doc.id}`}
                              onClick={() => handleReprocessDocument(doc.id)}
                              disabled={reprocessingDocId === doc.id}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                              title="Reprocess & re-index"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${reprocessingDocId === doc.id ? 'animate-spin text-indigo-600' : ''}`} />
                            </button>
                            <button
                              type="button"
                              id={`btn-delete-doc-${doc.id}`}
                              onClick={() => handleDeleteDocument(doc)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/60 transition-colors"
                              title="Delete document and purge ChromaDB vectors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">System Audit Trail</h1>
                <p className="text-xs text-slate-500">
                  Comprehensive audit logs recording every login, logout, chat initiation, document upload, and user modification.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">All Actions</option>
                  <option value="login_success">login_success</option>
                  <option value="logout">logout</option>
                  <option value="chat_started">chat_started</option>
                  <option value="message_sent">message_sent</option>
                  <option value="document_uploaded">document_uploaded</option>
                  <option value="user_created">user_created</option>
                  <option value="user_disabled">user_disabled</option>
                  <option value="report_downloaded">report_downloaded</option>
                </select>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Search logs..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 font-semibold">Timestamp</th>
                    <th className="p-3 font-semibold">User</th>
                    <th className="p-3 font-semibold">Action</th>
                    <th className="p-3 font-semibold">Resource</th>
                    <th className="p-3 font-semibold">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                        {log.user_email || 'System'}
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {log.resource}
                      </td>
                      <td className="p-3 text-[10px] font-mono text-slate-500 max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 5: ADMIN CHATBOT */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950">
            <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                    Administrator AI Intelligence Terminal
                  </h2>
                  <div className="text-[10px] text-slate-400">
                    Dual Administrative Diagnostics + Hybrid Knowledge RAG
                  </div>
                </div>
              </div>

              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono">
                ADMIN_PRIVILEGE_ENABLED
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {adminMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-2xl p-4 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white rounded-br-none'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans space-y-2">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}

              {adminChatLoading && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-max text-xs text-slate-500 shadow-sm animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]" />
                  <span>Querying PostgreSQL database & vector telemetry...</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <form onSubmit={handleAdminChat} className="max-w-4xl mx-auto flex items-center gap-2">
                <input
                  type="text"
                  value={adminInput}
                  onChange={(e) => setAdminInput(e.target.value)}
                  placeholder="Ask for system metrics (e.g. 'How many users are active?') or query traditional knowledge..."
                  className="flex-1 px-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  disabled={!adminInput.trim() || adminChatLoading}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* VIEW 6: SETTINGS & SYSTEM DIAGNOSTICS */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6">
            <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">System Diagnostics & Architecture</h1>
              <p className="text-xs text-slate-500">
                Verified configuration states for the enterprise multi-user SaaS platform.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
                  <Database className="w-4 h-4 text-purple-600" /> Relational Database (PostgreSQL)
                </div>
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Engine:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">@electric-sql/pglite</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage Path:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">./data/pg_data</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tables:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">users, sessions, conversations, messages, documents, audit_logs, reports</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-emerald-600 font-bold">Connected & Operational</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
                  <Layers className="w-4 h-4 text-teal-600" /> Vector Database (ChromaDB)
                </div>
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Collection:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">ayurveda_tkdl_statutory_corpus</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Indexed Chunks:</span>
                    <span className="font-mono font-bold text-teal-600">{totalChromaChunks} Chunks</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Similarity Metric:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">Cosine Distance + BM25</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage Path:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">./data/chroma_db</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
                  <Bot className="w-4 h-4 text-emerald-600" /> LLM Generation Engine
                </div>
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Primary Provider:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">Groq (High-Speed LLM / Adaptive Model)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fallback Provider:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">Google Gemini Flash</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Anti-Hallucination Guard:</span>
                    <span className="text-emerald-600 font-bold">Strict Active Evidence Restriction</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
                  <Scale className="w-4 h-4 text-indigo-600" /> Statutory & Classical Standards
                </div>
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>National Regime:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">Indian Patents Act 1970 § 3(p), 3(e), 3(d)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Biodiversity Law:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">BDA 2002 / 2023 NBA Form 3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>International:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">USPTO 35 U.S.C. 101, EPO EPC Art 53(c)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT USER MODAL */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingUser ? 'Edit User Credentials' : 'Provision New Platform User'}
            </h3>

            {userActionError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-xs text-red-700 dark:text-red-300">
                {userActionError}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={userFormName}
                  onChange={(e) => setUserFormName(e.target.value)}
                  placeholder="e.g. Dr. Priya Sharma"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={userFormEmail}
                  onChange={(e) => setUserFormEmail(e.target.value)}
                  placeholder="user@organization.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {editingUser ? 'New Password (Leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  value={userFormPass}
                  onChange={(e) => setUserFormPass(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    System Role
                  </label>
                  <select
                    value={userFormRole}
                    onChange={(e) => setUserFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="USER">USER (Standard Client)</option>
                    <option value="ADMIN">ADMIN (System Controller)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    User Type
                  </label>
                  <select
                    value={userFormType}
                    onChange={(e) => setUserFormType(e.target.value as UserType)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="MSMEs">MSMEs</option>
                    <option value="Researchers/Searchers">Researchers/Searchers</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Organization
                  </label>
                  <input
                    type="text"
                    value={userFormOrg}
                    onChange={(e) => setUserFormOrg(e.target.value)}
                    placeholder="e.g. CSIR / AyurPharm"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={userFormStatus}
                    onChange={(e) => setUserFormStatus(e.target.value as 'active' | 'disabled')}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  GSTIN / GST Number
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={userFormGst}
                  onChange={(e) => setUserFormGst(e.target.value.toUpperCase())}
                  placeholder="e.g. 07AAAAA0000A1Z5 (15 digits)"
                  className="w-full px-3 py-2 text-xs font-mono uppercase tracking-wider rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Optional for researchers; recommended for registered Ayush MSMEs & enterprises.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Document Confirmation Modal */}
      {documentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Document</h3>
                  <p className="text-xs text-slate-500">Irreversible RAG Corpus Operation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDocumentToDelete(null);
                  setDeleteDocError(null);
                }}
                disabled={isDeletingDoc}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl text-xs space-y-2 border border-slate-200 dark:border-slate-700/60">
              <div>
                <span className="text-slate-500 font-medium">Document Title: </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{documentToDelete.title}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">File Name: </span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{documentToDelete.original_name}</span>
              </div>
              <div className="flex items-center gap-4 pt-1">
                <div>
                  <span className="text-slate-500 font-medium">Type: </span>
                  <span className="uppercase font-semibold text-slate-700 dark:text-slate-300">{documentToDelete.file_type}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Indexed Chunks: </span>
                  <span className="font-semibold text-teal-600 dark:text-teal-400">{documentToDelete.total_chunks}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to delete this document? This will permanently remove the physical file from server storage and purge all of its vector embeddings from ChromaDB.
            </p>

            {deleteDocError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{deleteDocError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDocumentToDelete(null);
                  setDeleteDocError(null);
                }}
                disabled={isDeletingDoc}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-doc"
                onClick={handleConfirmDeleteDocument}
                disabled={isDeletingDoc}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {isDeletingDoc ? (
                  <>
                    <span className="inline-block animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
