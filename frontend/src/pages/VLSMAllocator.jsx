import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAllocation } from '../context/AllocationContext';
import CopyButton from '../components/CopyButton';
import {
  Network,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Download,
  BookmarkPlus,
  Copy,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  PieChart as PieChartIcon,
  Server,
  Layers,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell
} from 'recharts';

export default function VLSMAllocator() {
  const navigate = useNavigate();
  const {
    activeAllocation,
    setActiveAllocation,
    activeBaseNetwork,
    setActiveBaseNetwork,
    activeDepartments,
    setActiveDepartments,
    showNotification
  } = useAllocation();

  const [baseNetwork, setBaseNetwork] = useState(activeBaseNetwork || '192.168.1.0/24');
  const [departments, setDepartments] = useState(
    activeDepartments || [
      { id: '1', name: 'Engineering', hosts_needed: 100 },
      { id: '2', name: 'HR', hosts_needed: 50 },
      { id: '3', name: 'Management', hosts_needed: 20 },
    ]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(activeAllocation);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('Campus Network Allocation');
  const [sessionDesc, setSessionDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddDepartment = () => {
    const nextId = String(Date.now());
    setDepartments([
      ...departments,
      { id: nextId, name: `Subnet ${departments.length + 1}`, hosts_needed: 10 }
    ]);
  };

  const handleRemoveDepartment = (id) => {
    if (departments.length <= 1) {
      showNotification('At least one department is required.', 'error');
      return;
    }
    setDepartments(departments.filter(d => d.id !== id));
  };

  const handleDeptChange = (id, field, value) => {
    setDepartments(departments.map(d => {
      if (d.id === id) {
        return {
          ...d,
          [field]: field === 'hosts_needed' ? Math.max(1, parseInt(value, 10) || 1) : value
        };
      }
      return d;
    }));
  };

  const handleLoadDemo = () => {
    setBaseNetwork('192.168.1.0/24');
    const demoDepts = [
      { id: '1', name: 'Engineering', hosts_needed: 100 },
      { id: '2', name: 'HR', hosts_needed: 50 },
      { id: '3', name: 'Management', hosts_needed: 20 },
    ];
    setDepartments(demoDepts);
    setError(null);
    showNotification('Preloaded Computer Networks benchmark demo.', 'info');
  };

  const handleReset = () => {
    setBaseNetwork('192.168.1.0/24');
    setDepartments([
      { id: '1', name: 'Department 1', hosts_needed: 50 },
      { id: '2', name: 'Department 2', hosts_needed: 20 }
    ]);
    setResult(null);
    setError(null);
  };

  const handleCalculate = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        base_network: baseNetwork.trim(),
        departments: departments.map(d => ({
          name: d.name.trim(),
          hosts_needed: parseInt(d.hosts_needed, 10)
        }))
      };

      const data = await api.allocateVLSM(payload);
      setResult(data);
      setActiveAllocation(data);
      setActiveBaseNetwork(baseNetwork);
      setActiveDepartments(departments);
      showNotification('VLSM allocation successfully generated!', 'success');
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!result) return;
    const headers = [
      "Department",
      "Required Hosts",
      "Allocated Hosts",
      "Network Address",
      "CIDR Prefix",
      "Subnet Mask",
      "Wildcard Mask",
      "Broadcast Address",
      "First Usable IP",
      "Last Usable IP",
      "Total Addresses"
    ];

    const rows = result.allocations.map(a => [
      `"${a.name}"`,
      a.required_hosts,
      a.allocated_hosts,
      a.network_address,
      a.cidr,
      a.subnet_mask,
      a.wildcard_mask,
      a.broadcast_address,
      a.first_usable_ip,
      a.last_usable_ip,
      a.total_addresses
    ]);

    // Unused subnets
    result.unused_subnets.forEach((u, i) => {
      rows.push([
        `"Unused Space #${i + 1}"`,
        0,
        u.usable_hosts,
        u.network_address,
        `/${u.prefix}`,
        u.subnet_mask,
        "-",
        "-",
        "-",
        "-",
        u.total_addresses
      ]);
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `vlsm_allocation_${result.base_network.replace('/', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Allocation exported as CSV.', 'success');
  };

  const handleSaveSession = async () => {
    if (!result) return;
    if (!sessionTitle.trim()) {
      showNotification('Please enter a session title.', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: sessionTitle.trim(),
        description: sessionDesc.trim(),
        base_network: result.base_network,
        departments: departments.map(d => ({
          name: d.name.trim(),
          hosts_needed: parseInt(d.hosts_needed, 10)
        })),
        result: result
      };

      await api.saveAllocation(payload);
      setSaveModalOpen(false);
      showNotification('Session saved to SQLite history!', 'success');
    } catch (err) {
      showNotification(`Failed to save session: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Color palette for chart
  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

  const chartData = result
    ? result.allocations.map((a, idx) => ({
        name: a.name,
        Required: a.required_hosts,
        Allocated: a.allocated_hosts,
        Total: a.total_addresses,
        fill: COLORS[idx % COLORS.length]
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Configuration Header & Input Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Network className="w-5 h-5 text-blue-600" />
              VLSM Subnet Allocation Engine
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify base network address space and department host requirements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadDemo}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load Standard Demo (192.168.1.0/24)
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        <form onSubmit={handleCalculate} className="space-y-6">
          {/* Base Network Input */}
          <div className="max-w-md space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Base Network Address (CIDR)
            </label>
            <input
              type="text"
              value={baseNetwork}
              onChange={(e) => setBaseNetwork(e.target.value)}
              placeholder="e.g. 192.168.1.0/24 or 10.0.0.0/16"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono text-sm"
              required
            />
            <span className="text-[11px] text-slate-400">
              The root network block to partition among departments
            </span>
          </div>

          {/* Department Host Requirements List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Department Host Requirements ({departments.length})
              </label>
              <button
                type="button"
                onClick={handleAddDepartment}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Department
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {departments.map((dept, index) => (
                <div
                  key={dept.id}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 font-mono">
                      #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDepartment(dept.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Remove department"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Name</label>
                      <input
                        type="text"
                        value={dept.name}
                        onChange={(e) => handleDeptChange(dept.id, 'name', e.target.value)}
                        placeholder="Department name"
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs font-medium focus:outline-none focus:border-blue-500 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Required Usable Hosts</label>
                      <input
                        type="number"
                        min="1"
                        value={dept.hosts_needed}
                        onChange={(e) => handleDeptChange(dept.id, 'hosts_needed', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs font-mono font-medium focus:outline-none focus:border-blue-500 bg-white"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-end pt-3 border-t border-slate-100 gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
            >
              <Network className="w-4 h-4" />
              {loading ? 'Computing VLSM...' : 'Calculate VLSM Allocation'}
            </button>
          </div>
        </form>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Allocation Error: </strong>
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Allocation Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Summary Metric Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Base Network</span>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">{result.base_network}</div>
              <span className="text-[11px] text-slate-400 font-mono">{result.total_base_addresses.toLocaleString()} total IPs</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Allocated IPs</span>
              <div className="text-lg font-bold font-mono text-blue-600 mt-1">{result.total_allocated_addresses.toLocaleString()}</div>
              <span className="text-[11px] text-slate-400">{result.total_usable_allocated.toLocaleString()} usable hosts</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Remaining Free IPs</span>
              <div className="text-lg font-bold font-mono text-emerald-600 mt-1">{result.total_remaining_addresses.toLocaleString()}</div>
              <span className="text-[11px] text-slate-400">{result.unused_subnets.length} unassigned blocks</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Network Utilization</span>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">{result.network_utilization_pct}%</div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, result.network_utilization_pct)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Detailed Allocation Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Allocated Subnet Partition Table
                </h3>
                <p className="text-xs text-slate-500">
                  Sequentially assigned, boundary-aligned, non-overlapping subnet blocks.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
                <button
                  onClick={() => setSaveModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  Save Session
                </button>
                <button
                  onClick={() => navigate('/visualization')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <PieChartIcon className="w-3.5 h-3.5" />
                  Visualize
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-3">Req. Hosts</th>
                    <th className="py-3 px-3">Alloc. Hosts</th>
                    <th className="py-3 px-3">Network Address</th>
                    <th className="py-3 px-2">Prefix</th>
                    <th className="py-3 px-3">Subnet Mask</th>
                    <th className="py-3 px-3">Usable Host Range</th>
                    <th className="py-3 px-3">Broadcast</th>
                    <th className="py-3 px-3">Total IPs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.allocations.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></span>
                        {item.name}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{item.required_hosts}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-blue-600">{item.allocated_hosts}</td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-800">{item.network_address}</td>
                      <td className="py-3 px-2 font-mono font-semibold text-blue-700">{item.cidr}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{item.subnet_mask}</td>
                      <td className="py-3 px-3 font-mono text-emerald-700">
                        {item.first_usable_ip} - {item.last_usable_ip}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">{item.broadcast_address}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-800">{item.total_addresses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Unused Subnet Section */}
            {result.unused_subnets.length > 0 && (
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-slate-500" />
                    Unassigned Subnet Blocks ({result.unused_subnets.length})
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    Total Free IPs: <strong>{result.total_remaining_addresses}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {result.unused_subnets.map((u, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-dashed border-slate-300 bg-white text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-700">{u.cidr_block}</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px] font-semibold">
                          {u.total_addresses} IPs
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Mask: {u.subnet_mask}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Usable hosts: {u.usable_hosts}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Subnet Distribution Comparison Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">
              Host Requirement vs. Usable Capacity
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Comparison between requested host requirements and actual provisioned subnet capacity.
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="Required" fill="#94a3b8" name="Requested Hosts" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Allocated" fill="#2563eb" name="Provisioned Usable Hosts" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Save Session Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900">
                Save Allocation Session
              </h3>
              <p className="text-xs text-slate-500">
                Store this VLSM allocation and its parameters permanently in the SQLite database.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Session Title</label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="e.g. Headquarters VLSM Plan"
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Description (Optional)</label>
                <textarea
                  value={sessionDesc}
                  onChange={(e) => setSessionDesc(e.target.value)}
                  placeholder="Notes on department sizing or topology..."
                  rows="3"
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSession}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

