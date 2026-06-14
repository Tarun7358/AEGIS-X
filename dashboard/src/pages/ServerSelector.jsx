import React, { useState } from 'react';
import { 
  Server, Shield, Users, LogOut, CheckCircle, AlertTriangle, 
  HelpCircle, Sparkles, Plus, ShieldCheck, ChevronRight
} from 'lucide-react';
import useStore from '../store/useStore';

const ServerSelector = () => {
  const user = useStore((state) => state.user);
  const guilds = useStore((state) => state.guilds);
  const setGuilds = useStore((state) => state.setGuilds);
  const setActiveGuild = useStore((state) => state.setActiveGuild);
  const logout = useStore((state) => state.logout);
  const fetchGuilds = useStore((state) => state.fetchGuilds);

  // Invite bot modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedGuildToInvite, setSelectedGuildToInvite] = useState(null);
  const [permissions, setPermissions] = useState({
    admin: true,
    manageGuild: false,
    banMembers: true,
    kickMembers: true,
    manageRoles: true,
    manageChannels: true,
    readMessages: true,
    sendMessages: true
  });
  const [inviting, setInviting] = useState(false);

  const handleInviteClick = (guild) => {
    setSelectedGuildToInvite(guild);
    setInviteModalOpen(true);
  };

  const handleTogglePermission = (key) => {
    if (key === 'admin') {
      const nextAdmin = !permissions.admin;
      setPermissions({
        admin: nextAdmin,
        manageGuild: nextAdmin,
        banMembers: nextAdmin,
        kickMembers: nextAdmin,
        manageRoles: nextAdmin,
        manageChannels: nextAdmin,
        readMessages: nextAdmin,
        sendMessages: nextAdmin
      });
    } else {
      setPermissions({
        ...permissions,
        [key]: !permissions[key],
        admin: false // If toggling sub-perms, turn off full Admin
      });
    }
  };

  const executeInviteSimulation = () => {
    if (!selectedGuildToInvite) return;
    setInviting(true);

    setTimeout(() => {
      // Update mock database state locally
      const updatedGuilds = guilds.map((g) => {
        if (g.id === selectedGuildToInvite.id) {
          return {
            ...g,
            bot_status: 'ONLINE' // Set online
          };
        }
        return g;
      });

      setGuilds(updatedGuilds);
      setInviting(false);
      setInviteModalOpen(false);
      setSelectedGuildToInvite(null);
    }, 2000);
  };

  const handleAddToServer = () => {
    if (!selectedGuildToInvite) return;
    
    const isMockUser = !user || user.id === '1001' || user.id === '1002' || user.id === '1003' || user.id.toString().startsWith('mock-');
    
    if (isMockUser) {
      executeInviteSimulation();
    } else {
      // Production Discord Bot Invite URL
      const clientId = '1514678475988930691';
      
      // Calculate permission bitmask
      let permissionsValue = 0;
      if (permissions.admin) {
        permissionsValue = 8;
      } else {
        if (permissions.manageGuild) permissionsValue |= 0x20;
        if (permissions.banMembers) permissionsValue |= 0x4;
        if (permissions.kickMembers) permissionsValue |= 0x2;
        if (permissions.manageRoles) permissionsValue |= 0x10000000;
        if (permissions.manageChannels) permissionsValue |= 0x10;
        if (permissions.sendMessages) permissionsValue |= 0x800;
      }
      
      const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissionsValue}&scope=bot%20applications.commands&guild_id=${selectedGuildToInvite.id}&disable_guild_select=true`;
      
      // Open the invite link in a new window/tab
      window.open(inviteUrl, '_blank');
      setInviteModalOpen(false);
      setSelectedGuildToInvite(null);
      
      // Poll guilds list in background to automatically detect when bot joins
      let count = 0;
      const interval = setInterval(() => {
        fetchGuilds(true);
        count++;
        if (count >= 10) clearInterval(interval);
      }, 4000);
    }
  };

  const getStatusBadge = (status, premium) => {
    if (status === 'ONLINE') {
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-[#ff4655] bg-[#ff4655]/10 border border-[#ff4655]/30 px-2.5 py-1 rounded-full">
          <CheckCircle size={12} />
          Bot Online
        </span>
      );
    }
    if (status === 'MISSING_PERMISSIONS') {
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-cyber-yellow bg-cyber-yellow/10 border border-cyber-yellow/30 px-2.5 py-1 rounded-full">
          <AlertTriangle size={12} />
          Restricted Perms
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold text-cyber-red bg-cyber-red/10 border border-cyber-red/30 px-2.5 py-1 rounded-full">
        <HelpCircle size={12} />
        Not Installed
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-cyber-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Neon Rings */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#ff4655]/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#bf55ec]/5 blur-3xl" />

      <div className="w-full max-w-4xl relative z-10 space-y-6">
        {/* User Welcomer Header */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800/80 shadow-glow flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.username} 
                className="w-16 h-16 rounded-full border-2 border-[#ff4655]/50 p-0.5 shadow-neon-red"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#ff4655]/10 border border-[#ff4655]/30 flex items-center justify-center font-bold text-[#ff4655] text-2xl">
                {user?.username?.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2 m-0">
                Welcome back, {user?.username}
                <span className="text-xs text-[#ff4655] font-mono uppercase bg-[#ff4655]/10 border border-[#ff4655]/20 px-2 py-0.5 rounded-md">
                  Authorized Operator
                </span>
              </h2>
              <p className="text-xs text-gray-500 font-mono mt-1 m-0">Discord ID: {user?.id}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 border border-cyber-red/30 hover:border-cyber-red bg-cyber-red/5 hover:bg-cyber-red/10 text-cyber-red font-medium text-sm rounded-xl transition-all"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>

        {/* Server Selection Title */}
        <div>
          <h3 className="text-xl font-black text-white m-0 tracking-wide uppercase font-mono">
            Select Guild Workspace
          </h3>
          <p className="text-sm text-gray-400 mt-1 m-0">
            Choose a guild console workspace below to establish security uplink and configuration tools.
          </p>
        </div>

        {/* Servers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {guilds.map((g) => {
            const botInstalled = g.bot_status === 'ONLINE' || g.bot_status === 'MISSING_PERMISSIONS';
            const initials = g.name.split(' ').map(n => n[0]).join('').substring(0, 3).toUpperCase();
            
            return (
              <div 
                key={g.id} 
                className={`glass-panel p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between h-56 group relative ${
                  botInstalled 
                    ? 'border-gray-800/80 hover:border-[#ff4655]/50 hover:shadow-neon-red' 
                    : 'border-gray-800/85 hover:border-cyber-red/50 hover:shadow-neon-red opacity-80 hover:opacity-100'
                }`}
              >
                {/* Premium Banner badge */}
                {g.premium_enabled && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-black uppercase text-cyber-blue bg-cyber-blue/15 border border-cyber-blue/35 px-2 py-0.5 rounded-md shadow-glow shadow-neon-blue">
                    <Sparkles size={10} />
                    Premium Ready
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-3">
                    {g.icon_url ? (
                      <img 
                        src={g.icon_url} 
                        alt={g.name} 
                        className="w-12 h-12 rounded-xl border border-gray-800"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-gray-850 to-gray-800 border border-gray-800 flex items-center justify-center font-black text-sm text-gray-300">
                        {initials}
                      </div>
                    )}
                    <div>
                      <h4 className="text-md font-bold text-white group-hover:text-[#ff4655] transition-colors m-0 truncate w-48">
                        {g.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-gray-550 mt-1">
                        <Users size={12} />
                        <span>{g.member_count.toLocaleString()} members</span>
                        <span className="text-[10px] text-gray-500 block font-mono">role: {g.user_role}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {getStatusBadge(g.bot_status, g.premium_enabled)}
                  </div>
                </div>

                {/* Card CTA Actions */}
                <div className="mt-6">
                  {botInstalled ? (
                    <button
                      onClick={() => setActiveGuild(g)}
                      className="w-full bg-gradient-rage text-white font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-glow hover:shadow-neon-red"
                    >
                      <span>Manage Workspace</span>
                      <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleInviteClick(g)}
                      className="w-full bg-cyber-dark hover:bg-[#ff4655]/10 border border-cyber-red/40 hover:border-cyber-red/90 text-cyber-red font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-glow hover:shadow-neon-red"
                    >
                      <Plus size={16} />
                      <span>Invite AEGIS X Bot</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invite Simulation Dialog Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-cyber-darker border border-gray-800 p-6 rounded-2xl shadow-glow relative animate-fade-in-up">
            <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-rage flex items-center justify-center text-white rage-glow-red">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-md font-bold text-white m-0">Authorize AEGIS X Integration</h4>
                <p className="text-xs text-gray-500 m-0">Configure bot permissions for {selectedGuildToInvite?.name}</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-4 font-mono leading-relaxed">
              Before integration, choose the permission scopes. Granting Administrator access is recommended to allow self-healing threat rules.
            </p>

            {/* Permission Toggles list */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              <label className="flex items-center justify-between p-2.5 bg-cyber-black border border-gray-850 rounded-xl cursor-pointer hover:bg-gray-900 transition-colors">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">Administrator (Recommended)</span>
                  <span className="text-[10px] text-gray-500">Grants all security permissions automatically</span>
                </div>
                <input 
                  type="checkbox"
                  checked={permissions.admin}
                  onChange={() => handleTogglePermission('admin')}
                  className="w-4 h-4 accent-cyber-red border-gray-800 rounded bg-cyber-dark text-black"
                />
              </label>

              {['manageGuild', 'banMembers', 'kickMembers', 'manageRoles', 'manageChannels', 'sendMessages'].map((perm) => {
                const names = {
                  manageGuild: 'Manage Server',
                  banMembers: 'Ban Members',
                  kickMembers: 'Kick Members',
                  manageRoles: 'Manage Roles',
                  manageChannels: 'Manage Channels',
                  sendMessages: 'Send Messages'
                };
                return (
                  <label key={perm} className="flex items-center justify-between p-2.5 bg-cyber-black/45 border border-gray-850/65 rounded-xl cursor-pointer hover:bg-gray-900 transition-colors">
                    <span className="text-xs text-gray-300">{names[perm]}</span>
                    <input 
                      type="checkbox"
                      disabled={permissions.admin}
                      checked={permissions[perm]}
                      onChange={() => handleTogglePermission(perm)}
                      className="w-4 h-4 accent-cyber-red border-gray-800 rounded bg-cyber-dark text-black disabled:opacity-50"
                    />
                  </label>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6 border-t border-gray-800 pt-4">
              <button
                onClick={() => setInviteModalOpen(false)}
                disabled={inviting}
                className="flex-1 bg-cyber-dark border border-gray-850 hover:bg-gray-850 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToServer}
                disabled={inviting}
                className="flex-1 bg-gradient-rage text-white font-extrabold py-2.5 rounded-xl text-sm transition-all shadow-glow hover:shadow-neon-red flex items-center justify-center gap-2"
              >
                {inviting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Inviting...</span>
                  </>
                ) : (
                  <span>Add to Server</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerSelector;
