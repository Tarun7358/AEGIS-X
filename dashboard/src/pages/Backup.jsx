import React, { useState, useEffect } from 'react';
import { Database, Plus, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
import useStore from '../store/useStore';

const Backup = () => {
  const token = useStore((state) => state.token);
  const activeGuildId = useStore((state) => state.activeGuildId);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchBackups = () => {
    setLoading(true);
    fetch(`http://localhost:5000/api/guilds/${activeGuildId}/backups`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBackups(data);
        } else {
          setBackups([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setBackups([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBackups();
  }, [activeGuildId, token]);

  const handleCreateBackup = async () => {
    setCreating(true);
    setSuccessMsg('');
    try {
      const res = await fetch(`http://localhost:5000/api/guilds/${activeGuildId}/backups`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Server configuration backup generated successfully.');
        fetchBackups();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (backupId) => {
    if (!window.confirm('WARNING: Restoring this backup will replace current channel and role configurations. Proceed?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/guilds/${activeGuildId}/backups/${backupId}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert('Restore executed. Check Discord bot terminal for details.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Backup Center</h2>
          <p className="text-sm text-gray-400">Manage automated recovery snapshots and restore channel layouts.</p>
        </div>
        <button
          onClick={fetchBackups}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-xl border border-gray-800/80 transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-[#ff4655]/10 border border-[#ff4655]/20 rounded-xl flex items-center gap-3 text-xs text-[#ff4655]">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Snap */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl border border-gray-800 h-[460px] flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#bf55ec]/10 border border-[#bf55ec]/20 flex items-center justify-center mb-4 text-[#bf55ec]">
              <Database size={24} />
            </div>
            <h3 className="text-md font-bold text-white">Create Recovery snapshot</h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Manually compile channels, permissions, and roles definitions. The output backup object is saved securely in the database.
            </p>
          </div>

          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="w-full bg-gradient-rage text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-neon-red hover:opacity-90 text-xs tracking-wider uppercase"
          >
            {creating ? 'Compiling Backup...' : 'Generate Backup Snap'}
            <Plus size={14} />
          </button>
        </div>

        {/* Snap List */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-gray-800 h-[460px] flex flex-col">
          <h3 className="text-md font-bold text-white mb-6">Backup Restore Points</h3>

          <div className="flex-1 overflow-y-auto pr-2">
            {loading ? (
              <div className="text-center py-12 text-xs text-gray-500">Retrieving restore points...</div>
            ) : backups.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-500">No backup records logged.</div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Backup ID</th>
                    <th className="pb-3 font-semibold">Snapshot Name</th>
                    <th className="pb-3 font-semibold">Size</th>
                    <th className="pb-3 font-semibold">Created At</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {backups.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-800/10">
                      <td className="py-4 font-mono text-gray-450">{b.id.substring(0, 8)}...</td>
                      <td className="py-4 font-medium text-white flex items-center gap-2">
                        <FileText size={14} className="text-[#bf55ec]" />
                        <span>{b.backup_name}</span>
                      </td>
                      <td className="py-4 text-gray-300 font-mono">{(b.size_bytes / 1024).toFixed(2)} KB</td>
                      <td className="py-4 text-gray-400">
                        {new Date(b.created_at).toLocaleDateString()} {new Date(b.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => handleRestore(b.id)}
                          className="bg-[#bf55ec]/10 text-[#bf55ec] border border-[#bf55ec]/20 hover:bg-[#bf55ec] hover:text-black font-bold px-3 py-1 rounded-lg transition-all"
                        >
                          Restore
                        </button>
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

export default Backup;
