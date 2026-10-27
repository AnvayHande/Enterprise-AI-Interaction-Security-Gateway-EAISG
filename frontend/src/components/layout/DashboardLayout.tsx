import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, List, Target, Users, Settings, FileSearch, LogOut, User as UserIcon } from 'lucide-react';
import { api } from '../../lib/api';

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Playground', href: '/playground', icon: Shield },
  { name: 'Requests', href: '/requests', icon: List },
  { name: 'Findings', href: '/findings', icon: FileSearch },
  { name: 'Policies', href: '/policies', icon: Target },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface DashboardLayoutProps {
  onLogout?: () => void;
}

export function DashboardLayout({ onLogout }: DashboardLayoutProps) {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string; department_name?: string } | null>(null);

  useEffect(() => {
    api.getCurrentUser()
      .then(user => setCurrentUser(user))
      .catch(err => console.error('Failed to load current user', err));
  }, []);

  return (
    <div className="flex h-screen bg-muted/20">
      {/* Sidebar */}
      <div className="w-64 bg-background border-r flex flex-col">
        <div className="h-16 flex items-center px-6 border-b">
          <Shield className="w-6 h-6 text-primary mr-2" />
          <span className="font-bold text-lg">EAISG Gateway</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {/* Logout button */}
        <div className="border-t p-3">
          <button
            id="logout-button"
            onClick={onLogout}
            className="flex items-center w-full px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-background border-b flex items-center justify-between px-6">
          <h1 className="text-xl font-semibold">Governance Dashboard</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-muted px-2.5 py-1 rounded-full flex items-center gap-1.5 border">
              <UserIcon className="w-3 h-3 text-primary" />
              {currentUser ? currentUser.username : 'admin'}
              <span className="text-[10px] uppercase font-bold text-primary ml-1">
                {currentUser?.role || 'ADMIN'}
              </span>
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
