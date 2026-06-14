import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertOctagon, RefreshCw, ToggleLeft, ToggleRight, Radio } from 'lucide-react';
import useStore from '../store/useStore';

const Security = () => {
  const token = useStore((state) => state.token);
  const activeGuildId = useStore((state) => state.activeGuildId);
  const lockdownActive = useStore((state) => state.lockdownActive);
  const setLockdown = useStore((state) => state.setLockdown);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    anti_nuke_enabled: false,
    anti_raid_enabled: false,
    anti_spam_enabled: false,
    anti_scam_enabled: false,
    anti_phishing_enabled: false,
    anti_malware_enabled: false
  });

  // Fetch configuration
  useEffect(() => {
    setLoading(true);
    // Fetch settings
    fetch(`http://localhost:5000/api/guilds/${activeGuildId}/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setSettings(data);
        }
      })
      .catch(err => console.error(err));

    // Fetch security incidents
    fetch(`http://localhost:5000/api/security/${activeGuildId}/incidents`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setIncidents(data);
        } else {
          setIncidents([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIncidents([]);
        setLoading(false);
      });
  }, [activeGuildId, token]);

  // Handle setting updates
  const toggleFeature = async (featureName) => {
    const newVal = !settings[featureName];
    const updatedSettings = { ...settings, [featureName]: newVal };
    setSettings(updatedSettings);

    try {
      const res = await fetch(`http://localhost:5000/api/guilds/${activeGuildId}/settings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ [featureName]: newVal })
      });
      if (!res.ok) {
        // Revert toggle state on server/database error
        setSettings(prev => ({ ...prev, [featureName]: !newVal }));
      }
    } catch (err) {
      console.error(err);
      // Revert toggle state on network error
      setSettings(prev => ({ ...prev, [featureName]: !newVal }));
    }
  };

  // Trigger Lockdown
  const handleLockdownToggle = async () => {
    const targetState = !lockdownActive;
    setLockdown(targetState);

    try {
      await fetch(`http://localhost:5000/api/security/${activeGuildId}/lockdown`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: targetState })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const securityModules = [
    { key: 'anti_nuke_enabled', name: 'Anti-Nuke Engine', desc: 'Protects channels, roles, and settings from malicious bot modifications.' },
    { key: 'anti_raid_enabled', name: 'Anti-Raid Engine', desc: 'Detects join floods and halts rapid automated server arrivals.' },
    { key: 'anti_spam_enabled', name: 'Anti-Spam Filter', desc: 'Mutes and timeouts users sending repeated links or spam text.' },
    { key: 'anti_scam_enabled', name: 'Anti-Scam Guard', desc: 'Blocks links mimicking free Nitro, game gift keys, or giveaways.' },
    { key: 'anti_phishing_enabled', name: 'Anti-Phishing Filter', desc: 'Scans text to detect and quarantine credential harvesting sites.' },
    { key: 'anti_malware_enabled', name: 'Anti-Malware scanner', desc: 'Blocks uploads with executable scripts or zip file payloads.' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Security Center</h2>
          <p className="text-sm text-gray-400">Configure global protection modules and emergency actions.</p>
        </div>
      </div>

      {/* Lockdown Panel */}
      <div className={`p-6 rounded-2xl border ${lockdownActive ? 'bg-cyber-red/10 border-cyber-red animate-pulse-glow-red' : 'glass-panel border-gray-800'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${lockdownActive ? 'bg-cyber-red/20 text-cyber-red' : 'bg-gray-800 text-gray-400'}`}>
              <AlertOctagon size={24} />
            </div>
            <div>
              <h3 className="text-md font-bold text-white">Emergency Server Lockdown</h3>
              <p className="text-xs text-gray-400 mt-1">
                Instantly revoke all member writing permissions, halt verification bypasses, and lockdown all active channels.
              </p>
            </div>
          </div>
          <button
            onClick={handleLockdownToggle}
            className={`py-3 px-6 rounded-xl font-bold text-sm tracking-wide uppercase transition-all shadow-glow ${
              lockdownActive 
                ? 'bg-emerald-500 text-black hover:bg-emerald-450 shadow-glow' 
                : 'bg-cyber-red text-white hover:bg-cyber-red/90 shadow-neon-red'
            }`}
          >
            {lockdownActive ? 'Deactivate Lockdown' : 'Trigger Lockdown'}
          </button>
        </div>
      </div>

      {/* Grid: Modules and Incident History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Toggles */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-md font-bold text-white flex items-center gap-2">
            <Radio size={16} className="text-[#bf55ec]" />
            Security Shields
          </h3>
          <div className="space-y-3">
            {securityModules.map((mod) => (
              <div key={mod.key} className="glass-panel p-4 rounded-xl border border-gray-800/80 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-white block">{mod.name}</span>
                  <span className="text-xs text-gray-500 block leading-tight">{mod.desc}</span>
                </div>
                <button
                  onClick={() => toggleFeature(mod.key)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {settings[mod.key] ? (
                    <ToggleRight size={28} className="text-[#ff4655]" />
                  ) : (
                    <ToggleLeft size={28} className="text-gray-600" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Security Incident History */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col h-[520px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <ShieldAlert size={16} className="text-cyber-red" />
              Incident Reports
            </h3>
            <button 
              onClick={() => {
                fetch(`http://localhost:5000/api/security/${activeGuildId}/incidents`, {
                  headers: { Authorization: `Bearer ${token}` }
                })
                  .then(res => res.json())
                  .then(data => {
                    if (Array.isArray(data)) {
                      setIncidents(data);
                    } else {
                      setIncidents([]);
                    }
                  })
                  .catch(() => setIncidents([]));
              }}
              className="text-gray-400 hover:text-white"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto pr-2">
            {loading ? (
              <div className="text-center py-12 text-xs text-gray-500">Loading incident history...</div>
            ) : incidents.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-500">No security incidents logged.</div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Incident Type</th>
                    <th className="pb-3 font-semibold">Severity</th>
                    <th className="pb-3 font-semibold">Details</th>
                    <th className="pb-3 font-semibold">Action Taken</th>
                    <th className="pb-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {incidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-gray-800/10">
                      <td className="py-4 font-medium text-white">{incident.incident_type}</td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          incident.severity === 'CRITICAL' ? 'bg-cyber-red/10 text-cyber-red border border-cyber-red/20' :
                          incident.severity === 'HIGH' ? 'bg-cyber-orange/10 text-cyber-orange border border-cyber-orange/20' :
                          'bg-cyber-yellow/10 text-cyber-yellow border border-cyber-yellow/20'
                        }`}>
                          {incident.severity}
                        </span>
                      </td>
                      <td className="py-4 text-gray-300 max-w-xs truncate">{incident.details}</td>
                      <td className="py-4 text-gray-400 font-mono">{incident.action_taken}</td>
                      <td className="py-4 text-gray-500">
                        {new Date(incident.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Security;
