import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAllocation } from '../context/AllocationContext';
import { api } from '../services/api';
import CopyButton from '../components/CopyButton';
import {
  PieChart as PieChartIcon,
  Layers,
  Network,
  Info,
  Sparkles,
  Server,
  ArrowRight,
  Shield,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';

export default function NetworkVisualization() {
  const navigate = useNavigate();
  const {
    activeAllocation,
    setActiveAllocation,
    setActiveBaseNetwork,
    setActiveDepartments,
    showNotification
  } = useAllocation();

  const [selectedBlock, setSelectedBlock] = useState(null);

  const handleRunDemo = async () => {
    try {
      const demoReq = {
        base_network: '192.168.1.0/24',
        departments: [
          { name: 'Engineering', hosts_needed: 100 },
          { name: 'HR', hosts_needed: 50 },
          { name: 'Management', hosts_needed: 20 },
        ]
      };
      const res = await api.allocateVLSM(demoReq);
      setActiveAllocation(res);
      setActiveBaseNetwork(demoReq.base_network);
      setActiveDepartments(demoReq.departments.map((d, i) => ({ id: String(i + 1), ...d })));
      showNotification('Loaded benchmark allocation visualization.', 'success');
    } catch (e) {
      showNotification(e.message, 'error');
    }
  };

  if (!activeAllocation) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm max-w-2xl mx-auto my-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <PieChartIcon className="w-8 h-8 stroke-[1.8]" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900">No Active Network Allocation to Visualize</h3>
          <p className="text-sm text-slate-500">
            Generate an allocation in the VLSM Allocator or load a saved session from History to render proportional block partitions and capacity charts.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={handleRunDemo}
            className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Visualize Standard Demo (192.168.1.0/24)
          </button>
          <button
            onClick={() => navigate('/vlsm-allocator')}
            className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            Open VLSM Allocator
          </button>
        </div>
      </div>
    );
  }

  const {
    base_network,
    total_base_addresses,
    total_allocated_addresses,
    total_remaining_addresses,
    network_utilization_pct,
    allocations,
    unused_subnets
  } = activeAllocation;

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];

  // Data for proportional pie chart
  const pieData = [
    ...allocations.map((a, i) => ({
      name: `${a.name} (${a.cidr})`,
      value: a.total_addresses,
      color: COLORS[i % COLORS.length],
      type: 'Allocated',
      item: a
    })),
    ...unused_subnets.map((u, i) => ({
      name: `Unused ${u.cidr_block}`,
      value: u.total_addresses,
      color: '#cbd5e1',
      type: 'Unused',
      item: u
    }))
  ];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-base font-bold text-slate-900 font-mono">
              {base_network}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {network_utilization_pct}% Utilized
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visual partitioning of {total_base_addresses.toLocaleString()} total IP addresses across {allocations.length} subnets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/vlsm-allocator')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
          >
            <Network className="w-3.5 h-3.5" />
            Modify Allocation
          </button>
        </div>
      </div>

      {/* Proportional Address Strip Visualizer */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Contiguous Address Space Strip Map
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            0 to {total_base_addresses - 1} Offset
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Proportional linear layout of sequential subnet allocations and unassigned address blocks. Click any block to view its host properties.
        </p>

        {/* Proportional Bar */}
        <div className="h-14 w-full bg-slate-100 rounded-xl overflow-hidden flex border border-slate-200 shadow-inner p-1 gap-1">
          {allocations.map((dept, index) => {
            const widthPct = (dept.total_addresses / total_base_addresses) * 100;
            const isSelected = selectedBlock?.name === dept.name;
            return (
              <div
                key={index}
                onClick={() => setSelectedBlock(dept)}
                className={`h-full rounded-lg cursor-pointer transition-all flex flex-col items-center justify-center text-white px-2 overflow-hidden select-none relative group ${
                  isSelected ? 'ring-2 ring-slate-900 ring-offset-1' : 'hover:opacity-95'
                }`}
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: COLORS[index % COLORS.length]
                }}
                title={`${dept.name}: ${dept.network_address}${dept.cidr} (${dept.total_addresses} IPs, ${dept.allocated_hosts} usable hosts)`}
              >
                <span className="text-[11px] font-bold truncate tracking-tight">{dept.name}</span>
                <span className="text-[9px] opacity-90 font-mono truncate">{dept.cidr}</span>
              </div>
            );
          })}

          {unused_subnets.map((u, i) => {
            const widthPct = (u.total_addresses / total_base_addresses) * 100;
            const isSelected = selectedBlock?.cidr_block === u.cidr_block;
            return (
              <div
                key={`unused-${i}`}
                onClick={() => setSelectedBlock(u)}
                className={`h-full rounded-lg cursor-pointer transition-all flex flex-col items-center justify-center text-slate-600 bg-slate-200 hover:bg-slate-300 px-2 overflow-hidden select-none relative ${
                  isSelected ? 'ring-2 ring-slate-900 ring-offset-1' : ''
                }`}
                style={{ width: `${widthPct}%` }}
                title={`Unused block: ${u.cidr_block} (${u.total_addresses} free IPs)`}
              >
                <span className="text-[10px] font-semibold text-slate-600 truncate">Free</span>
                <span className="text-[9px] text-slate-500 font-mono truncate">/{u.prefix}</span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
          {allocations.map((a, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              ></span>
              <span className="font-medium text-slate-700">{a.name}</span>
              <span className="text-slate-400 font-mono text-[11px]">({a.cidr})</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-200 border border-slate-300"></span>
            <span className="font-medium text-slate-700">Unused Space</span>
          </div>
        </div>
      </div>

      {/* Selected Block Detail Card */}
      {selectedBlock && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm bg-gradient-to-r from-blue-50/40 to-white">
          <div className="flex items-center justify-between pb-3 border-b border-blue-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Subnet Block Inspector</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {selectedBlock.name || selectedBlock.cidr_block}
              </span>
            </div>
            <button
              onClick={() => setSelectedBlock(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
            <div>
              <span className="text-slate-400">Network Address</span>
              <div className="font-mono font-bold text-slate-900 mt-0.5">{selectedBlock.network_address}</div>
            </div>
            <div>
              <span className="text-slate-400">Subnet Mask / CIDR</span>
              <div className="font-mono font-bold text-slate-900 mt-0.5">
                {selectedBlock.subnet_mask} ({selectedBlock.cidr || `/${selectedBlock.prefix}`})
              </div>
            </div>
            <div>
              <span className="text-slate-400">Total IP Capacity</span>
              <div className="font-mono font-bold text-slate-900 mt-0.5">{selectedBlock.total_addresses} IPs</div>
            </div>
            <div>
              <span className="text-slate-400">Usable Hosts</span>
              <div className="font-mono font-bold text-blue-700 mt-0.5">
                {selectedBlock.allocated_hosts ?? selectedBlock.usable_hosts} hosts
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Address Space Allocation Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Relative slice of the base network occupied by each department and unassigned space.
            </p>
          </div>

          <div className="h-72 my-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} IPs (${((value / total_base_addresses) * 100).toFixed(1)}%)`, name]}
                  contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={40} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
            <span>Base Size: <strong className="text-slate-800">{total_base_addresses} IPs</strong></span>
            <span>Allocated: <strong className="text-blue-700">{total_allocated_addresses} IPs</strong></span>
            <span>Free: <strong className="text-emerald-700">{total_remaining_addresses} IPs</strong></span>
          </div>
        </div>

        {/* Subnet Blocks List Cards */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Subnet Partition Cards
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Exact boundaries and usable IP address ranges for routing tables.
            </p>
          </div>

          <div className="space-y-2.5 my-4 max-h-72 overflow-y-auto pr-1">
            {allocations.map((dept, index) => (
              <div
                key={index}
                className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></span>
                    <span className="font-bold text-slate-900">{dept.name}</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                      {dept.cidr}
                    </span>
                  </div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    Net: {dept.network_address} | Mask: {dept.subnet_mask}
                  </div>
                  <div className="text-emerald-700 font-mono text-[11px]">
                    Hosts: {dept.first_usable_ip} &rarr; {dept.last_usable_ip} ({dept.allocated_hosts} hosts)
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {dept.total_addresses} IPs
                  </span>
                  <div className="text-[10px] text-slate-400">
                    req: {dept.required_hosts}
                  </div>
                </div>
              </div>
            ))}

            {unused_subnets.map((u, i) => (
              <div
                key={`un-${i}`}
                className="p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span>Free Subnet Block</span>
                    <span className="font-mono font-bold text-slate-800">/{u.prefix}</span>
                  </div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    Address: {u.network_address} | Mask: {u.subnet_mask}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-semibold text-emerald-700">
                    {u.total_addresses} IPs
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-400">
            All subnets strictly align to power-of-2 binary address boundaries.
          </div>
        </div>
      </div>
    </div>
  );
}

