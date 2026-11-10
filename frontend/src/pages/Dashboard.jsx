import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAllocation } from '../context/AllocationContext';
import StatCard from '../components/StatCard';
import {
  Layers,
  Network,
  Database,
  PieChart as PieChartIcon,
  Calculator,
  ArrowRight,
  Clock,
  Sparkles,
  Info,
  Server
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const { loadSessionIntoActive, activeAllocation } = useAllocation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleInspectSession = async (sessionId) => {
    try {
      const detail = await api.getAllocationById(sessionId);
      loadSessionIntoActive(detail);
      navigate('/visualization');
    } catch (err) {
      console.error(err);
    }
  };

  // Utilization chart data
  const hasData = stats && stats.total_saved_sessions > 0;
  const allocatedIps = hasData ? stats.total_allocated_ips : 0;
  const remainingIps = hasData ? stats.remaining_ips_selected_network : 0;
  
  const chartData = [
    { name: 'Allocated IPs', value: allocatedIps, color: '#2563eb' },
    { name: 'Remaining IPs', value: remainingIps, color: '#94a3b8' },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Intro Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-200 border border-blue-400/20">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            Computer Networks Core Utility
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Automated IPv4 Subnetting & VLSM Engine
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            IP Allocator automates subnet calculation, host boundary determination, and Variable Length Subnet Masking (VLSM) hierarchical address block allocation with zero subnet overlap and maximum address efficiency.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 flex-shrink-0">
          <button
            onClick={() => navigate('/vlsm-allocator')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <Network className="w-4 h-4" />
            Launch VLSM Allocator
          </button>
          <button
            onClick={() => navigate('/subnet-calculator')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/10 transition-colors"
          >
            <Calculator className="w-4 h-4" />
            Subnet Calculator
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Allocated Subnets"
          value={loading ? '...' : (stats?.total_allocated_subnets || 0)}
          subtitle="Cumulative across saved sessions"
          icon={Layers}
          color="blue"
        />
        <StatCard
          title="Total Allocated IPs"
          value={loading ? '...' : (stats?.total_allocated_ips?.toLocaleString() || 0)}
          subtitle="Assigned to department hosts"
          icon={Server}
          color="emerald"
        />
        <StatCard
          title="Remaining in Latest Net"
          value={loading ? '...' : (stats?.remaining_ips_selected_network?.toLocaleString() || 0)}
          subtitle={stats?.selected_network ? `Network: ${stats.selected_network}` : 'No active network'}
          icon={PieChartIcon}
          color="amber"
        />
        <StatCard
          title="Saved Sessions"
          value={loading ? '...' : (stats?.total_saved_sessions || 0)}
          subtitle="Stored in SQLite database"
          icon={Database}
          color="violet"
        />
      </div>

      {/* Middle Section: Utilization Chart + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Utilization Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">
                Network Utilization
              </h3>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                {stats?.network_utilization_pct || 0}% Used
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {stats?.selected_network
                ? `Address capacity distribution for ${stats.selected_network}`
                : 'Proportion of assigned vs unused address space'}
            </p>
          </div>

          <div className="h-60 flex items-center justify-center my-2">
            {hasData && (allocatedIps > 0 || remainingIps > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [`${val.toLocaleString()} IPs`, '']}
                    contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-6 text-slate-400 space-y-2">
                <PieChartIcon className="w-10 h-10 mx-auto stroke-1 text-slate-300" />
                <p className="text-xs font-medium">No saved allocation data yet</p>
                <p className="text-[11px] text-slate-400">Save a VLSM session to view utilization statistics.</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Allocated: <strong className="text-slate-800">{allocatedIps.toLocaleString()}</strong></span>
            <span>Free: <strong className="text-slate-800">{remainingIps.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Recent Allocation Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Recent Allocation Activity
              </h3>
              <button
                onClick={() => navigate('/history')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 transition-colors"
              >
                View all in History
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Recently saved network subnet plans and variable length allocations.
            </p>
          </div>

          <div className="my-3 overflow-hidden">
            {stats?.recent_activity && stats.recent_activity.length > 0 ? (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                {stats.recent_activity.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleInspectSession(item.id)}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          {item.title}
                        </span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {item.base_network}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span>{item.department_count} subnets</span>
                        <span>&bull;</span>
                        <span>{item.created_at}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-medium px-2 py-1 rounded bg-blue-50 text-blue-700">
                        {item.network_utilization_pct}% utilized
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                  <Database className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-700">No Allocation Sessions Recorded</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Design a subnet plan in the VLSM Allocator and click "Save Session" to track history here.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/vlsm-allocator')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors"
                >
                  Create First Allocation
                </button>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Click any session above to instantly load and visualize its subnet hierarchy.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

