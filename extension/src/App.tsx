import { Shield, ShieldAlert, ShieldCheck, Activity, User, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

function App() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ username: string; role: string }>({
    username: 'employee',
    role: 'EMPLOYEE',
  });
  const [showSwitchUser, setShowSwitchUser] = useState(false);
  const [customUsername, setCustomUsername] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const fetchProfileAndActivity = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      // 1. Get User Profile
      chrome.runtime.sendMessage({ type: 'GET_USER_PROFILE' }, (response) => {
        if (response && response.username) {
          setUserProfile({ username: response.username, role: response.role || 'EMPLOYEE' });
        }
      });

      // 2. Get Recent Activity
      chrome.runtime.sendMessage({ type: 'GET_RECENT_ACTIVITY' }, (response) => {
        if (response && response.success) {
          setActivities(response.data || []);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndActivity();
  }, []);

  const handleQuickLogin = (uname: string, pword: string) => {
    setLoggingIn(true);
    setLoginError('');
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'LOGIN_USER',
        payload: { username: uname, password: pword }
      }, (res) => {
        setLoggingIn(false);
        if (res && res.success) {
          setUserProfile({ username: res.username, role: res.role });
          setShowSwitchUser(false);
          fetchProfileAndActivity();
        } else {
          setLoginError(`Login failed for ${uname}`);
        }
      });
    }
  };

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUsername || !customPassword) return;
    handleQuickLogin(customUsername, customPassword);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'ALLOW': return 'bg-emerald-100 text-emerald-700';
      case 'SANITIZE': return 'bg-amber-100 text-amber-700';
      case 'BLOCK': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'ALLOW': return <Activity className="w-4 h-4 text-emerald-500" />;
      case 'SANITIZE': return <ShieldAlert className="w-4 h-4 text-amber-500" />;
      case 'BLOCK': return <ShieldAlert className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'ALLOW': return 'Approved';
      case 'SANITIZE': return 'Sanitized';
      case 'BLOCK': return 'Blocked';
      default: return action;
    }
  };

  return (
    <div className="flex flex-col w-full h-full min-h-[460px] bg-white border-x border-b border-slate-200">
      <header className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h1 className="font-semibold text-base tracking-wide">EAISG Gateway</h1>
        </div>
        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
          v1.0
        </span>
      </header>
      
      <main className="flex-1 p-4 space-y-4">
        {/* User Identity Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-blue-100 text-blue-700 rounded-full">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Active User</p>
                <p className="text-sm font-bold text-slate-800">
                  {userProfile.username}{' '}
                  <span className="text-xs font-normal px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded">
                    {userProfile.role}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSwitchUser(!showSwitchUser)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            >
              {showSwitchUser ? 'Close' : 'Switch'}
            </button>
          </div>

          {/* User Switcher Form */}
          {showSwitchUser && (
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
              <p className="text-xs text-slate-600 font-medium">Quick switch for demo:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={loggingIn}
                  onClick={() => handleQuickLogin('employee', 'employee123')}
                  className={`text-xs px-2.5 py-1.5 rounded border font-medium cursor-pointer transition ${
                    userProfile.username === 'employee'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  👤 employee
                </button>
                <button
                  type="button"
                  disabled={loggingIn}
                  onClick={() => handleQuickLogin('admin', 'admin')}
                  className={`text-xs px-2.5 py-1.5 rounded border font-medium cursor-pointer transition ${
                    userProfile.username === 'admin'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  🛡️ admin
                </button>
              </div>

              {loginError && (
                <p className="text-xs text-red-600 font-medium">{loginError}</p>
              )}

              <form onSubmit={handleCustomLogin} className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Username"
                    value={customUsername}
                    onChange={(e) => setCustomUsername(e.target.value)}
                    className="text-xs p-1.5 border border-slate-300 rounded"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    className="text-xs p-1.5 border border-slate-300 rounded"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loggingIn}
                  className="w-full text-xs bg-slate-800 hover:bg-slate-700 text-white py-1.5 rounded font-medium cursor-pointer"
                >
                  {loggingIn ? 'Logging in...' : 'Sign in as custom user'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Protection Active Alert */}
        <section className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-start space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-emerald-900 font-medium text-xs">Protection Active</h2>
            <p className="text-emerald-700 text-xs mt-0.5">
              Prompts and files sent from this browser are governed under company policy as <strong>{userProfile.username}</strong>.
            </p>
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recent Interceptions
            </h3>
            <button
              onClick={fetchProfileAndActivity}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {loading ? (
              <p className="text-xs text-slate-500 text-center py-3">Loading activity...</p>
            ) : activities.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3 bg-slate-50 rounded border border-slate-100">
                No recent activity recorded.
              </p>
            ) : (
              activities.slice(0, 4).map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-md text-xs">
                  <div className="flex items-center space-x-2 truncate pr-2">
                    {getActionIcon(activity.final_action)}
                    <span className="font-medium text-slate-700 truncate">
                      {activity.ai_model || activity.destination?.name || 'AI Model'}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-medium shrink-0 ${getActionColor(activity.final_action)}`}>
                    {getActionLabel(activity.final_action)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="bg-slate-50 border-t border-slate-200 p-3 flex justify-between items-center text-xs text-slate-500">
        <span>Gateway: http://localhost:8000</span>
        <a href="http://localhost:5173" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
          Admin Dashboard ↗
        </a>
      </footer>
    </div>
  );
}

export default App;
