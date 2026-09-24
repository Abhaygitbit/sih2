import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, UserType } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<AuthUser>;
  register: (name: string, email: string, pass: string, org: string, userType: UserType, gstNumber?: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateProfile: (name: string, org: string, gstNumber?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ipsakti_token');
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on mount
  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Token expired or invalid
          localStorage.removeItem('ipsakti_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.warn('Failed to verify session token:', err);
      } finally {
        setIsLoading(false);
      }
    };
    verifySession();
  }, [token]);

  const login = async (email: string, pass: string): Promise<AuthUser> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    localStorage.setItem('ipsakti_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (
    name: string,
    email: string,
    pass: string,
    org: string,
    userType: UserType,
    gstNumber?: string
  ): Promise<AuthUser> => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        password: pass,
        organization: org,
        user_type: userType,
        gst_number: gstNumber || '',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    localStorage.setItem('ipsakti_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (e) {
      console.warn('Logout error:', e);
    } finally {
      localStorage.removeItem('ipsakti_token');
      setToken(null);
      setUser(null);
    }
  };

  const updateProfile = async (name: string, org: string, gstNumber?: string) => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, organization: org, gst_number: gstNumber }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update profile');
    }
    setUser(data.user);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
