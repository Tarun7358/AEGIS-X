import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, ShieldAlert, UserCheck, Eye, 
  Gavel, Ticket, BarChart3, Bot, Database, Settings, 
  LogOut, ChevronDown, Server, Sparkles, Grid, Megaphone,
  ScanFace, ShieldCheck, Zap, Users, Webhook
} from 'lucide-react';
import useStore from '../store/useStore';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { id: 'overview', name: 'Overview', icon: LayoutDashboard }
    ]
  },
  {
    label: 'Security',
    items: [
      { id: 'security',     name: 'Security Center',    icon: ShieldAlert },
      { id: 'verification', name: 'Verification Center', icon: UserCheck },
      { id: 'alt-detection',name: 'Alt Detection',       icon: ScanFace, badge: 'NEW' },
      { id: 'threats',      name: 'Threat Intelligence', icon: Eye },
      { id: 'audit',        name: 'Audit Center',        icon: ShieldCheck, badge: 'NEW' },
      { id: 'emergency',    name: 'Emergency Center',    icon: Zap, badge: 'NEW' }
    ]
  },
  {
    label: 'Moderation',
    items: [
      { id: 'moderation', name: 'Moderation Center', icon: Gavel },
      { id: 'tickets',    name: 'Ticket Center',     icon: Ticket }
    ]
  },
  {
    label: 'Operations',
    items: [
      { id: 'analytics',    name: 'Analytics Center', icon: BarChart3 },
      { id: 'ai',           name: 'AI Center',         icon: Bot },
      { id: 'backup',       name: 'Backup Center',     icon: Database },
      { id: 'announcements',name: 'Announcements',     icon: Megaphone }
    ]
  },
  {
    label: 'Management',
    items: [
      { id: 'integrations', name: 'Integrations',      icon: Webhook,  badge: 'NEW' },
      { id: 'team',         name: 'Team Management',   icon: Users,    badge: 'NEW' },
      { id: 'settings',     name: 'Settings',          icon: Settings }
    ]
  }
];

// All allowed page IDs per role
const ROLE_ACCESS = {
  'Owner':            ['overview','security','verification','alt-detection','threats','audit','emergency','moderation','tickets','analytics','ai','backup','announcements','integrations','team','settings'],
  'Security Director':['overview','security','verification','alt-detection','threats','audit','emergency','moderation','tickets','analytics','ai','backup','announcements','integrations','team','settings'],
  'Admin':            ['overview','security','verification','alt-detection','threats','audit','emergency','moderation','tickets','analytics','ai','backup','announcements','settings'],
  'Moderator':        ['overview','security','verification','alt-detection','threats','moderation','tickets','analytics','backup','settings'],
  'Support':          ['overview','verification','tickets','settings'],
  'DJ':               ['overview']
};

const Sidebar = ({ currentPage, setCurrentPage, onLogout }) => {
  const activeGuild = useStore((state) => state.activeGuild);
  const guilds = useStore((state) => state.guilds);
  const setActiveGuild = useStore((state) => state.setActiveGuild);
  const alerts = useStore((state) => state.alerts);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userRole = activeGuild ? activeGuild.user_role : 'Member';
  const allowedIds = ROLE_ACCESS[userRole] || ['overview'];
  const initials = activeGuild?.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AX';

  // Unread alert count for badge
  const alertCount = alerts ? Math.min(alerts.length, 9) : 0;

  return (
    <aside className="w-64 bg-[#050608] border-r border-[#ff4655]/10 flex flex-col justify-between h-screen sticky top-0 z-50 shadow-2xl">
      <div className="p-4 flex flex-col flex-1 overflow-y-auto scrollbar-thin">
        {/* Logo Brand */}
        <div className="flex items-center gap-3 px-2 mb-6">
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-rage flex items-center justify-center font-black text-white text-lg rage-glow-red select-none" style={{fontFamily: 'serif', letterSpacing: '-1px'}}>
              Æ
            </div>
            <div className="absolute inset-0 rounded-xl border border-[#ff4655]/40 animate-ping opacity-30 pointer-events-none" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider text-white m-0 uppercase flex items-center gap-1 leading-none">
              AEGIS <span className="text-gradient-rage">X</span>
            </h1>
            <span className="text-[9px] text-[#ff4655]/70 font-semibold uppercase tracking-widest block mt-0.5">SOC Platform v2.0</span>
          </div>
        </div>

        {/* Server Switcher Dropdown */}
        <div className="relative mb-6" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full bg-cyber-black hover:bg-cyber-dark border border-[#ff4655]/10 px-3 py-2.5 rounded-xl flex items-center justify-between transition-all hover:border-[#ff4655]/35"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {activeGuild?.icon_url ? (
                <img src={activeGuild.icon_url} alt="" className="w-7 h-7 rounded-lg border border-gray-800" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[#ff4655]/10 border border-[#ff4655]/20 flex items-center justify-center font-bold text-[#ff4655] text-xs flex-shrink-0">
                  {initials}
                </div>
              )}
              <div className="text-left min-w-0">
                <span className="text-xs font-bold text-white block truncate">{activeGuild?.name}</span>
                <span className="text-[9px] text-gray-500 block font-mono">role: {userRole}</span>
              </div>
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-cyber-darker border border-gray-800 rounded-xl shadow-glow overflow-hidden z-50 py-1">
              <div className="px-3 py-1 text-[9px] font-bold text-gray-500 font-mono uppercase tracking-wider border-b border-gray-800">
                Switch Workspaces
              </div>
              <div className="max-h-48 overflow-y-auto">
                {guilds.map((g) => {
                  const botInstalled = g.bot_status === 'ONLINE' || g.bot_status === 'MISSING_PERMISSIONS';
                  const gInitials = g.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  return (
                    <button
                      key={g.id}
                      onClick={() => { botInstalled ? setActiveGuild(g) : setActiveGuild(null); setDropdownOpen(false); }}
                      className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-[#ff4655]/5 transition-colors ${g.id === activeGuild?.id ? 'bg-[#ff4655]/8 text-[#ff4655]' : 'text-gray-300'}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {g.icon_url ? (
                          <img src={g.icon_url} alt="" className="w-6 h-6 rounded-md" />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] font-black text-gray-400">
                            {gInitials}
                          </div>
                        )}
                        <span className="text-xs font-semibold truncate block">{g.name}</span>
                      </div>
                      {g.premium_enabled && <Sparkles size={10} className="text-[#bf55ec]" />}
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-gray-800 mt-1 pt-1">
                <button
                  onClick={() => { setActiveGuild(null); setDropdownOpen(false); }}
                  className="w-full px-3 py-2 flex items-center gap-2 text-xs font-semibold text-[#ff4655]/70 hover:bg-[#ff4655]/5 transition-colors"
                >
                  <Grid size={12} />
                  <span>All Server Consoles</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Groups */}
        <nav className="space-y-5">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(item => allowedIds.includes(item.id));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label}>
                {/* Group Label */}
                <div className="px-3.5 mb-1.5">
                  <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest font-mono">{group.label}</span>
                </div>

                {/* Group Items */}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    const isEmergency = item.id === 'emergency';

                    return (
                      <button
                        key={item.id}
                        onClick={() => setCurrentPage(item.id)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-rage/10 text-[#ff4655] border-l-2 border-[#ff4655] shadow-neon-red'
                            : isEmergency
                            ? 'text-[#ff4655]/60 hover:text-[#ff4655] hover:bg-[#ff4655]/5'
                            : 'text-gray-400 hover:text-white hover:bg-cyber-dark/45'
                        }`}
                      >
                        <Icon size={15} />
                        <span className="flex-1 text-left">{item.name}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider bg-[#ff4655]/10 text-[#ff4655] border border-[#ff4655]/20">
                            {item.badge}
                          </span>
                        )}
                        {item.id === 'security' && alertCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-[#ff4655] text-white text-[9px] font-black flex items-center justify-center">
                            {alertCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Logout Profile */}
      <div className="p-3 border-t border-gray-800/80">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-gray-400 hover:text-[#ff4655] hover:bg-[#ff4655]/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <LogOut size={14} />
            <span>Sign Out Operator</span>
          </div>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
