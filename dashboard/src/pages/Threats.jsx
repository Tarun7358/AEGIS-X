import React, { useState, useEffect } from 'react';
import { Shield, Search, Eye, AlertTriangle, Check } from 'lucide-react';
import useStore from '../store/useStore';

const Threats = () => {
  const token = useStore((state) => state.token);
  const activeGuildId = useStore((state) => state.activeGuildId);
  const [threatList, setThreatList] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedThreat, setSelectedThreat] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:5000/api/security/${activeGuildId}/threat-scores`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setThreatList(data);
          if (data.length > 0) setSelectedThreat(data[0]);
        } else {
          setThreatList([]);
        }
      })
      .catch(err => {
        console.error(err);
        setThreatList([]);
      });
  }, [activeGuildId, token]);

  const filteredThreats = Array.isArray(threatList) 
    ? threatList.filter(t => t.user?.username?.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white">Threat Intelligence</h2>
        <p className="text-sm text-gray-400">Advanced user profiling and behavioral risk evaluation analytics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat List */}
        <div className="lg:col-span-1 glass-panel p-5 rounded-2xl border border-gray-800 flex flex-col h-[520px]">
          <div className="relative mb-4">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search threat profiles..."
              className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4655] transition-all"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {filteredThreats.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-500">No threat profiles match.</div>
            ) : (
              filteredThreats.map((threat) => (
                <button
                  key={threat.user_id}
                  onClick={() => setSelectedThreat(threat)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                    selectedThreat?.user_id === threat.user_id
                      ? 'bg-cyber-dark border-[#ff4655]/40'
                      : 'bg-cyber-darker/50 border-gray-800/80 hover:bg-cyber-dark'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center font-bold text-xs text-gray-300">
                      {threat.user?.username?.substring(0, 2).toUpperCase() || 'M'}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">{threat.user?.username || 'Unknown'}</span>
                      <span className="text-[10px] text-gray-500 block">Score: {threat.score}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    threat.threat_level === 'RED' ? 'bg-[#ff4655]/10 text-[#ff4655]' :
                    threat.threat_level === 'ORANGE' ? 'bg-orange-500/10 text-orange-400' :
                    threat.threat_level === 'YELLOW' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {threat.threat_level}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Threat Detailed Profile */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-gray-800 h-[520px] flex flex-col justify-between">
          {selectedThreat ? (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              {/* Header profile info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-cyber-dark border border-gray-800 flex items-center justify-center text-xl font-bold text-[#ff4655]">
                    {selectedThreat.user?.username?.substring(0, 2).toUpperCase() || 'M'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white m-0">{selectedThreat.user?.username}</h3>
                    <span className="text-xs text-gray-500 font-mono">UID: {selectedThreat.user_id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest block">Threat Score</span>
                    <span className="text-2xl font-black text-white mt-1 block">{selectedThreat.score}/100</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest block">Threat Level</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold mt-1.5 block text-center ${
                      selectedThreat.threat_level === 'RED' ? 'bg-[#ff4655]/10 text-[#ff4655] border border-[#ff4655]/20' :
                      selectedThreat.threat_level === 'ORANGE' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                      selectedThreat.threat_level === 'YELLOW' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {selectedThreat.threat_level}
                    </span>
                  </div>
                </div>
              </div>

              {/* Behavior Logs */}
              <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-2">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Behavior Timeline</h4>
                {selectedThreat.history && selectedThreat.history.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {selectedThreat.history.map((log, i) => (
                      <div key={i} className="p-3 bg-cyber-darker/60 border border-gray-800/60 rounded-xl flex justify-between items-start text-xs">
                        <div className="space-y-1">
                          <span className="font-semibold text-white block">
                            {log.action || 'Risk Level Assessment'}
                          </span>
                          {log.details && <span className="text-gray-400 block">{log.details}</span>}
                          {log.reason && <span className="text-gray-500 block leading-tight">{log.reason}</span>}
                        </div>
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                          {new Date(log.date || log.created_at || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-gray-500">No history parameters recorded.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <Shield size={32} className="text-gray-700 mb-2" />
              <span className="text-xs">Select a member threat profile from the sidebar to audit details.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Threats;
