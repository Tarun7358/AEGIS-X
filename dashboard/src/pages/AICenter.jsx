import React, { useState } from 'react';
import { Bot, ShieldCheck, AlertOctagon, HelpCircle, Play, Sparkles } from 'lucide-react';
import useStore from '../store/useStore';

const AICenter = () => {
  const token = useStore((state) => state.token);
  const activeGuildId = useStore((state) => state.activeGuildId);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const triggerAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/ai/${activeGuildId}/audit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReport(data.report);
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
        <h2 className="text-2xl font-extrabold text-white">AI Services Center</h2>
        <p className="text-sm text-gray-400">Leverage OpenAI audit algorithms to score settings and prevent server vulnerabilities.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Run Audit Card */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col justify-between h-[480px]">
          <div>
            <div className="w-12 h-12 rounded-xl bg-cyber-purple/10 border border-cyber-purple/20 flex items-center justify-center mb-4 text-cyber-purple">
              <Bot size={24} />
            </div>
            <h3 className="text-md font-bold text-white">AI Security Auditor</h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Analyzes server permission tables, backup histories, active channels, and audit logs using GPT moderation models to identify vulnerabilities.
            </p>
          </div>

          <button
            onClick={triggerAudit}
            disabled={loading}
            className="w-full bg-cyber-purple hover:bg-cyber-purple/90 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-glow text-xs tracking-wider uppercase"
          >
            {loading ? 'Running AI Assessment...' : 'Execute AI Audit'}
            <Sparkles size={14} />
          </button>
        </div>

        {/* Audit Results Dashboard */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-gray-800 h-[480px] flex flex-col justify-between">
          {report ? (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              {/* Header metrics */}
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <div>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest block font-mono">Server Audit Rating</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1.5 block text-center ${
                    report.rating === 'GOOD' ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/20' :
                    report.rating === 'WARNING' ? 'bg-cyber-yellow/10 text-cyber-yellow border border-cyber-yellow/20' :
                    'bg-cyber-red/10 text-cyber-red border border-cyber-red/20'
                  }`}>
                    {report.rating}
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">{report.score}</span>
                  <span className="text-xs text-gray-500">/100</span>
                </div>
              </div>

              {/* Issues */}
              <div className="flex-1 overflow-y-auto my-3 space-y-3 pr-2 max-h-[180px]">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Issues Flagged</h4>
                {report.issues && report.issues.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {report.issues.map((issue) => (
                      <div key={issue.id} className="p-3 bg-cyber-darker/60 border border-gray-800/60 rounded-xl flex items-start gap-2 text-xs">
                        <AlertOctagon size={14} className={issue.severity === 'CRITICAL' ? 'text-cyber-red mt-0.5' : 'text-cyber-yellow mt-0.5'} />
                        <span className="text-gray-300 leading-tight">{issue.message}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-gray-500">No issues flagged. Clean report.</div>
                )}
              </div>

              {/* AI Advice */}
              <div className="p-4 bg-cyber-purple/5 border border-cyber-purple/10 rounded-xl text-xs leading-relaxed">
                <span className="font-bold text-cyber-purple uppercase tracking-wider block text-[10px]">Security Advisor Recommendations</span>
                <p className="text-gray-300 mt-1">{report.recommendations}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <Bot size={36} className="text-gray-700 mb-2" />
              <span className="text-xs">Trigger the AI Security audit from the left console to see ratings here.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AICenter;
