import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import useStore from '../store/useStore';

const Analytics = () => {
  const token = useStore((state) => state.token);
  const activeGuildId = useStore((state) => state.activeGuildId);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({ totalJoins: 0, totalLeaves: 0, totalMessages: 0, totalVoiceMinutes: 0 });
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = () => {
    setLoading(true);
    fetch(`http://localhost:5000/api/analytics/${activeGuildId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(resData => {
        setData(resData.chartData || []);
        if (resData.summary) setSummary(resData.summary);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAnalytics();
  }, [activeGuildId, token]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Analytics Center</h2>
          <p className="text-sm text-gray-400">Review community performance metrics and traffic distributions.</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-xl border border-gray-800/80 transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 text-left">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block">Total Arrivals</span>
          <h3 className="text-2xl font-black text-white mt-1">{summary.totalJoins} members</h3>
          <span className="text-[10px] text-cyber-green mt-1 block font-semibold">+12% vs last week</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 text-left">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block">Server Departures</span>
          <h3 className="text-2xl font-black text-white mt-1">{summary.totalLeaves} members</h3>
          <span className="text-[10px] text-cyber-red mt-1 block font-semibold">Low bounce rate</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 text-left">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block">Total Chat Content</span>
          <h3 className="text-2xl font-black text-white mt-1">{summary.totalMessages} posts</h3>
          <span className="text-[10px] text-cyber-blue mt-1 block font-semibold">Healthy chat activity</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 text-left">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block">Voice Occupancy</span>
          <h3 className="text-2xl font-black text-white mt-1">{Math.round(summary.totalVoiceMinutes)} mins</h3>
          <span className="text-[10px] text-cyber-yellow mt-1 block font-semibold">Voice room presence</span>
        </div>
      </div>

      {/* Recharts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800">
          <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp size={16} className="text-cyber-green" />
            Member Growth Timeline
          </h3>
          <div className="h-72 w-full text-xs">
            {loading ? (
              <div className="text-center py-24 text-gray-500">Loading charts...</div>
            ) : data.length === 0 ? (
              <div className="text-center py-24 text-gray-500">No chart details.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="joinsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff87" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#00ff87" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#22283b" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f111a', border: '1px solid #22283b' }} />
                  <Legend />
                  <Area type="monotone" dataKey="joins" name="Joins" stroke="#00ff87" fillOpacity={1} fill="url(#joinsGrad)" />
                  <Area type="monotone" dataKey="leaves" name="Leaves" stroke="#ff4655" fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Message Traffic Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800">
          <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp size={16} className="text-cyber-blue" />
            Message Activity Distribution
          </h3>
          <div className="h-72 w-full text-xs">
            {loading ? (
              <div className="text-center py-24 text-gray-500">Loading charts...</div>
            ) : data.length === 0 ? (
              <div className="text-center py-24 text-gray-500">No chart details.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#22283b" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f111a', border: '1px solid #22283b' }} />
                  <Legend />
                  <Bar dataKey="messages" name="Messages" fill="#00e5ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
