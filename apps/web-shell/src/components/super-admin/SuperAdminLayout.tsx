'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ChevronDown, LogOut, Settings, Sun, Moon } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import api from '@/lib/api';
import UserAvatar from '../ui/UserAvatar';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  React.useEffect(() => {
    const syncUser = () => {
      const saved = localStorage.getItem('user');
      const parsed = saved ? JSON.parse(saved) : null;
      setUser(parsed);

      const role = String(parsed?.role || '').toUpperCase();
      if (!parsed) {
        router.replace('/login');
      } else if (role !== 'SUPER_ADMIN') {
        router.replace(role === 'COLLEGE_ADMIN' ? '/admin' : '/');
      }
    };

    syncUser();
    window.addEventListener('storage', syncUser);
    window.addEventListener('user-updated', syncUser as EventListener);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('user-updated', syncUser as EventListener);
    };
  }, [router]);
  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Continue with client-side logout even if the server request fails.
    } finally {
      const savedTheme = localStorage.getItem('portal_theme');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (savedTheme) localStorage.setItem('portal_theme', savedTheme);
      setUserMenuOpen(false);
      router.push('/login');
    }
  };

  const [theme, setTheme] = useState<"light" | "dark">("light");

  React.useEffect(() => {
    const storedTheme = localStorage.getItem("portal_theme");
    const initialTheme = storedTheme === "dark" ? "dark" : "light";
    setTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("portal_theme", nextTheme);
    document.documentElement.classList.toggle("theme-dark", nextTheme === "dark");
  };


  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', href: '/super-admin/dashboard', color: 'from-blue-500 to-blue-600' },
    { id: 'colleges', label: 'College Management', icon: '🏢', href: '/super-admin/colleges', color: 'from-purple-500 to-purple-600' },
    { id: 'users', label: 'User Management', icon: '👥', href: '/super-admin/users', color: 'from-green-500 to-green-600' },
    { id: 'analytics', label: 'Analytics', icon: '📈', href: '/super-admin/analytics', color: 'from-orange-500 to-orange-600' },
    { id: 'audit', label: 'Audit Logs', icon: '📋', href: '/super-admin/audit-logs', color: 'from-red-500 to-red-600' },
    { id: 'settings', label: 'System Settings', icon: '⚙️', href: '/super-admin/settings', color: 'from-indigo-500 to-indigo-600' },
    { id: 'profile', label: 'Profile Settings', icon: '🧑', href: '/super-admin/profile', color: 'from-slate-500 to-slate-600' }
  ];

  const isMenuItemActive = (href: string) => {
    if (pathname === href) return true;
    if (href !== '/super-admin/dashboard' && pathname.startsWith(`${href}/`)) return true;
    return false;
  };

  return (
    <div className="super-admin-shell flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-gray-900 to-gray-800 text-white transition-all duration-300 flex flex-col shadow-lg`}>
        <div className="p-6 flex items-center justify-between">
          {sidebarOpen && <h1 className="text-xl font-bold">Super Admin</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-6 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                isMenuItemActive(item.href)
                  ? `bg-gradient-to-r ${item.color} shadow-lg`
                  : 'hover:bg-gray-700'
              }`}
              title={!sidebarOpen ? item.label : ''}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-700">
           <button
             onClick={handleLogout}
             className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/20 transition-all font-medium"
           >
             <LogOut size={20} />
             {sidebarOpen && <span>Sign Out</span>}
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="super-admin-topbar bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Platform Administration</h2>
            <p className="text-sm text-gray-600">Manage colleges, users, and system settings</p>
          </div>

          {/* Theme & User Menu */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="super-admin-user-trigger flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
              >
                <UserAvatar name={user?.name || 'Super Admin'} imageUrl={user?.profilePicture} size={40} />
                <div className="text-left hidden sm:block">
                  <p className="font-medium text-gray-900">{user?.name || 'Super Admin'}</p>
                  <p className="text-xs text-gray-600">Platform Owner</p>
                </div>
                <ChevronDown size={18} className="text-gray-600" />
              </button>

              {userMenuOpen && (
                <div className="super-admin-user-menu absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      router.push('/super-admin/profile');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                  >
                    <Settings size={16} /> Profile Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-red-600 border-t border-gray-200"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
