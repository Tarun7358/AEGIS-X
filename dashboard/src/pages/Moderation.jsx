import React, { useState, useEffect } from 'react';
import { Gavel, Search, ShieldAlert, Plus, RefreshCw } from 'lucide-react';
import useStore from '../store/useStore';

const Moderation = () => {
  const token = useStore((state) => state.token);
  const activeGuildId = useStore((state) => state.activeGuildId);
  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [userId, setUserId] = useState('');
  const [actionType, setActionType] = useState('WARN');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const fetchCases = () => {
    setLoading(true);
    fetch(`http://localhost:5000/api/moderation/${activeGuildId}/cases`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCases(data);
        } else {
          setCases([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setCases([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCases();
  }, [activeGuildId, token]);

  const handleSubmitCase = async (e) => {
    e.preventDefault();
    if (!userId || !reason) return;

    try {
      await fetch(`http://localhost:5000/api/moderation/${activeGuildId}/cases`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          actionType,
          reason,
          notes,
          moderatorId: '1002' // Admin
        })
      });

      // Clear form
      setUserId('');
      setReason('');
      setNotes('');
      
      // Refresh
      fetchCases();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCases = Array.isArray(cases)
    ? cases.filter(c => 
        c.user?.username?.toLowerCase().includes(search.toLowerCase()) ||
        c.action_type?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Moderation Center</h2>
          <p className="text-sm text-gray-400">Log warnings, mutes, timeouts, kicks, and bans for audit history.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Moderation Case */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl border border-gray-800 h-[520px]">
          <h3 className="text-md font-bold text-white mb-6 flex items-center gap-2">
            <Plus size={16} className="text-[#ff4655]" />
            Issue Mod Case
          </h3>

          <form onSubmit={handleSubmitCase} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Target User ID
              </label>
              <input
                type="text"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="1001"
                className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4655] transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Action Type
              </label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#ff4655] transition-all"
              >
                <option value="WARN">WARN</option>
                <option value="MUTE">MUTE</option>
                <option value="TIMEOUT">TIMEOUT</option>
                <option value="KICK">KICK</option>
                <option value="BAN">BAN</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Violation Reason
              </label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Disruptive chat behavior..."
                rows={3}
                className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4655] transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Internal Staff Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="First warning"
                className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4655] transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-rage text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-neon-red text-xs tracking-wider uppercase"
            >
              <Gavel size={14} />
              Execute Action
            </button>
          </form>
        </div>

        {/* Moderation Logs List */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-gray-800 h-[520px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                <Search size={14} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter cases by username..."
                className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4655] transition-all"
              />
            </div>
            <button
              onClick={fetchCases}
              className="text-gray-400 hover:text-white"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {loading ? (
              <div className="text-center py-12 text-xs text-gray-500">Retrieving case logs...</div>
            ) : filteredCases.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-500">No moderation cases recorded.</div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 Gavel uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Case #</th>
                    <th className="pb-3 font-semibold">User</th>
                    <th className="pb-3 font-semibold">Action</th>
                    <th className="pb-3 font-semibold">Reason</th>
                    <th className="pb-3 font-semibold">Moderator</th>
                    <th className="pb-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {filteredCases.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-800/10">
                      <td className="py-4 font-mono text-gray-400">#{c.case_number}</td>
                      <td className="py-4 font-semibold text-white">{c.user?.username || 'User (' + c.user_id + ')'}</td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          c.action_type === 'BAN' ? 'bg-cyber-red/10 text-cyber-red border border-cyber-red/20' :
                          c.action_type === 'KICK' ? 'bg-cyber-orange/10 text-cyber-orange border border-cyber-orange/20' :
                          'bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/20'
                        }`}>
                          {c.action_type}
                        </span>
                      </td>
                      <td className="py-4 text-gray-300 max-w-xs truncate">{c.reason}</td>
                      <td className="py-4 text-gray-400 font-medium">{c.moderator?.username || 'Staff'}</td>
                      <td className="py-4 text-gray-500">
                        {new Date(c.created_at).toLocaleDateString()}
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

export default Moderation;
