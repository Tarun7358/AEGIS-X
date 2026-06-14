import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2 } from 'lucide-react';
import useStore from '../store/useStore';

const SettingsPage = () => {
  const token = useStore((state) => state.token);
  const activeGuildId = useStore((state) => state.activeGuildId);
  const [settings, setSettings] = useState({
    prefix: '!',
    channel_security_alerts: '',
    channel_threat_feed: '',
    channel_incident_reports: '',
    channel_audit_logs: '',
    channel_backup_status: '',
    role_verified: '',
    role_unverified: '',
    role_quarantined: '',
    role_security_director: '',
    role_moderator: '',
    role_support_team: '',
    role_dj: ''
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [guildChannels, setGuildChannels] = useState([]);
  const [guildRoles, setGuildRoles] = useState([]);

  const socket = useStore((state) => state.socket);

  useEffect(() => {
    if (!activeGuildId || !token) return;

    fetch(`http://localhost:5000/api/guilds/${activeGuildId}/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data) setSettings(data);
      })
      .catch(err => console.error(err));

    fetch(`http://localhost:5000/api/guilds/${activeGuildId}/channels`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setGuildChannels(data);
      })
      .catch(err => console.error(err));

    fetch(`http://localhost:5000/api/guilds/${activeGuildId}/roles`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setGuildRoles(data);
      })
      .catch(err => console.error(err));
  }, [activeGuildId, token]);

  useEffect(() => {
    if (!socket) return;
    const handleRealtimeUpdate = (data) => {
      if (data.changes) {
        setSettings(prev => ({ ...prev, ...data.changes }));
      }
    };
    socket.on('settings_updated', handleRealtimeUpdate);
    return () => {
      socket.off('settings_updated', handleRealtimeUpdate);
    };
  }, [socket]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    try {
      const res = await fetch(`http://localhost:5000/api/guilds/${activeGuildId}/settings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white">System Settings</h2>
        <p className="text-sm text-gray-400">Configure bot prefix, logging channels, and administrative overrides.</p>
      </div>

      {saved && (
        <div className="p-4 bg-[#ff4655]/10 border border-[#ff4655]/20 rounded-xl flex items-center gap-3 text-xs text-[#ff4655]">
          <CheckCircle2 size={16} />
          <span>System configuration overrides saved successfully.</span>
        </div>
      )}

      <div className="glass-panel p-6 rounded-2xl border border-gray-800 max-w-2xl">
        <h3 className="text-md font-bold text-white mb-6 flex items-center gap-2">
          <Settings size={16} className="text-[#ff4655]" />
          Bot Parameters
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Command Prefix
              </label>
              <input
                type="text"
                required
                value={settings.prefix || '!'}
                onChange={(e) => setSettings({ ...settings, prefix: e.target.value })}
                className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#ff4655] transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Security Alerts Channel
              </label>
              <select
                value={settings.channel_security_alerts || ''}
                onChange={(e) => setSettings({ ...settings, channel_security_alerts: e.target.value })}
                className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#ff4655] transition-all cursor-pointer"
              >
                <option value="">-- None --</option>
                {guildChannels.map(c => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Threat Feed Channel
              </label>
              <select
                value={settings.channel_threat_feed || ''}
                onChange={(e) => setSettings({ ...settings, channel_threat_feed: e.target.value })}
                className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#ff4655] transition-all cursor-pointer"
              >
                <option value="">-- None --</option>
                {guildChannels.map(c => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Incident Reports Channel
              </label>
              <select
                value={settings.channel_incident_reports || ''}
                onChange={(e) => setSettings({ ...settings, channel_incident_reports: e.target.value })}
                className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#ff4655] transition-all cursor-pointer"
              >
                <option value="">-- None --</option>
                {guildChannels.map(c => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Audit Logs Channel
              </label>
              <select
                value={settings.channel_audit_logs || ''}
                onChange={(e) => setSettings({ ...settings, channel_audit_logs: e.target.value })}
                className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#ff4655] transition-all cursor-pointer"
              >
                <option value="">-- None --</option>
                {guildChannels.map(c => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Backup Status Channel
              </label>
              <select
                value={settings.channel_backup_status || ''}
                onChange={(e) => setSettings({ ...settings, channel_backup_status: e.target.value })}
                className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#ff4655] transition-all cursor-pointer"
              >
                <option value="">-- None --</option>
                {guildChannels.map(c => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <h3 className="text-md font-bold text-white mt-8 mb-6 flex items-center gap-2 border-t border-gray-800/80 pt-6">
            <Settings size={16} className="text-[#ff4655]" />
            Server Role Mappings
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Verified Member Role
              </label>
              <select
                value={settings.role_verified || ''}
                onChange={(e) => setSettings({ ...settings, role_verified: e.target.value })}
                className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#ff4655] transition-all cursor-pointer"
              >
                <option value="">-- None --</option>
                {guildRoles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Unverified Role
              </label>
              <select
                value={settings.role_unverified || ''}
                onChange={(e) => setSettings({ ...settings, role_unverified: e.target.value })}
                className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#ff4655] transition-all cursor-pointer"
              >
                <option value="">-- None --</option>
                {guildRoles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Quarantined Role
              </label>
              <select
                value={settings.role_quarantined || ''}
                onChange={(e) => setSettings({ ...settings, role_quarantined: e.target.value })}
                className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#ff4655] transition-all cursor-pointer"
              >
                <option value="">-- None --</option>
                {guildRoles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Security Director Role
              </label>
              <select
                value={settings.role_security_director || ''}
                onChange={(e) => setSettings({ ...settings, role_security_director: e.target.value })}
                className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#ff4655] transition-all cursor-pointer"
              >
                <option value="">-- None --</option>
                {guildRoles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Moderator Role
              </label>
              <select
                value={settings.role_moderator || ''}
                onChange={(e) => setSettings({ ...settings, role_moderator: e.target.value })}
                className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#ff4655] transition-all cursor-pointer"
              >
                <option value="">-- None --</option>
                {guildRoles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Support Team Role
              </label>
              <select
                value={settings.role_support_team || ''}
                onChange={(e) => setSettings({ ...settings, role_support_team: e.target.value })}
                className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#ff4655] transition-all cursor-pointer"
              >
                <option value="">-- None --</option>
                {guildRoles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                DJ Role
              </label>
              <select
                value={settings.role_dj || ''}
                onChange={(e) => setSettings({ ...settings, role_dj: e.target.value })}
                className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#ff4655] transition-all cursor-pointer"
              >
                <option value="">-- None --</option>
                {guildRoles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-rage text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-neon-red text-xs tracking-wider uppercase cursor-pointer"
            >
              <Save size={14} />
              {loading ? 'Saving Parameters...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
