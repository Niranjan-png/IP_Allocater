import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calculator,
  Network,
  History,
  PieChart,
  ChevronLeft,
  ChevronRight,
  Server
} from 'lucide-react';

export default function Sidebar({ collapsed, setCollapsed }) {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Subnet Calculator', path: '/subnet-calculator', icon: Calculator },
    { name: 'VLSM Allocator', path: '/vlsm-allocator', icon: Network },
    { name: 'Network Visualization', path: '/visualization', icon: PieChart },
    { name: 'Allocation History', path: '/history', icon: History },
  ];

  return (
    <aside
      className={`bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-20 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Server className="w-5 h-5 stroke-[2.2]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-slate-900 tracking-tight text-sm leading-tight">
                IP Allocator
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                IPv4 & VLSM Engine
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
              title={collapsed ? item.name : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-lg p-3 text-xs border border-slate-100 text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700 flex items-center justify-between">
              <span>Academic Edition</span>
              <span className="bg-blue-100 text-blue-700 text-[10px] font-mono px-1.5 py-0.5 rounded">v1.0</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Computer Networks Lab Subnetting & Allocation System
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}

