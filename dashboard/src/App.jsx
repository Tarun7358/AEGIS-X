import React, { useState, useEffect } from 'react';
import useStore from './store/useStore';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Callback from './pages/Callback';
import ServerSelector from './pages/ServerSelector';
import ErrorBoundary from './components/ErrorBoundary';

// Import sub-pages
import Overview from './pages/Overview';
import Security from './pages/Security';
import Verification from './pages/Verification';
import Threats from './pages/Threats';
import Moderation from './pages/Moderation';
import Tickets from './pages/Tickets';
import Analytics from './pages/Analytics';
import AICenter from './pages/AICenter';
import Backup from './pages/Backup';
import SettingsPage from './pages/Settings';
import Announcements from './pages/Announcements';
// v2.0 SOC pages
import AltDetection from './pages/AltDetection';
import AuditCenter from './pages/AuditCenter';
import EmergencyCenter from './pages/EmergencyCenter';
import TeamManagement from './pages/TeamManagement';
import Integrations from './pages/Integrations';

function App() {
  const token = useStore((state) => state.token);
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const setUser = useStore((state) => state.setUser);
  const initSocket = useStore((state) => state.initSocket);
  const fetchGuilds = useStore((state) => state.fetchGuilds);
  const guilds = useStore((state) => state.guilds);
  
  const activeGuildId = useStore((state) => state.activeGuildId);
  const activeGuild = useStore((state) => state.activeGuild);
  const setActiveGuild = useStore((state) => state.setActiveGuild);

  const [currentPage, setCurrentPage] = useState('overview');

  // Verify token and fetch guilds on start
  useEffect(() => {
    if (token) {
      fetch('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Session expired');
        })
        .then((data) => {
          setUser(data.user);
          initSocket(token);
          fetchGuilds(); // Load the server selector list
        })
        .catch(() => {
          logout();
        });
    }
  }, [token]);

  // Intercept callback path immediately for OAuth callback handling
  const isCallbackPath = window.location.pathname.startsWith('/auth/callback');
  if (isCallbackPath) {
    return <Callback />;
  }

  // Handle unauthorized state
  if (!token || !user) {
    return <Login />;
  }

  // Handle server selection screen state
  if (!activeGuildId || !activeGuild) {
    return <ServerSelector />;
  }

  // Page switcher routing helper
  const renderActivePage = () => {
    switch (currentPage) {
      case 'overview':
        return <Overview />;
      case 'security':
        return <Security />;
      case 'verification':
        return <Verification />;
      case 'threats':
        return <Threats />;
      case 'moderation':
        return <Moderation />;
      case 'tickets':
        return <Tickets />;
      case 'analytics':
        return <Analytics />;
      case 'ai':
        return <AICenter />;
      case 'backup':
        return <Backup />;
      case 'settings':
        return <SettingsPage />;
      case 'announcements':
        return <Announcements />;
      // v2.0 SOC pages
      case 'alt-detection':
        return <AltDetection />;
      case 'audit':
        return <AuditCenter />;
      case 'emergency':
        return <EmergencyCenter />;
      case 'team':
        return <TeamManagement />;
      case 'integrations':
        return <Integrations />;
      default:
        return <Overview />;
    }
  };

  const initials = activeGuild.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="flex bg-cyber-black min-h-screen text-gray-100">
      {/* Sidebar Panel */}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        onLogout={logout} 
      />

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        {/* Header bar */}
        <header className="h-16 bg-cyber-darker border-b border-gray-800/80 px-8 flex justify-between items-center sticky top-0 z-40">
          {/* Guild active indicator */}
          <div className="flex items-center gap-3">
            {activeGuild.icon_url ? (
              <img src={activeGuild.icon_url} alt="" className="w-8 h-8 rounded-lg border border-[#ff4655]/20" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#ff4655]/10 border border-[#ff4655]/20 flex items-center justify-center font-black text-[#ff4655] text-xs">
                {initials}
              </div>
            )}
            <div>
              <span className="text-[10px] text-gray-500 font-semibold block uppercase tracking-wider">Active Console</span>
              <span className="text-xs font-bold text-white block truncate max-w-xs">{activeGuild.name}</span>
            </div>
            <button
              onClick={() => setActiveGuild(null)}
              className="ml-3 text-[10px] text-cyber-blue hover:underline bg-cyber-blue/5 border border-cyber-blue/20 px-2 py-0.5 rounded-md transition-colors"
            >
              Switch Console
            </button>
          </div>

          {/* User profile details */}
          <div className="flex items-center gap-3">
            {user.avatar_url && (
              <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full border border-gray-800" />
            )}
            <div className="text-right">
              <span className="text-xs font-bold text-white block">{user.username}</span>
              <span className="text-[10px] text-[#ff4655] block font-mono font-bold uppercase tracking-wider">
                {activeGuild.user_role}
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
          <ErrorBoundary key={currentPage}>
            {renderActivePage()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default App;
