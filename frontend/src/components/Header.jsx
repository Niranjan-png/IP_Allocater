import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAllocation } from '../context/AllocationContext';
import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function Header() {
  const location = useLocation();
  const { backendConnected, checkConnection } = useAllocation();

  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/':
        return { title: 'Dashboard', desc: 'Real-time network allocation metrics and recent activity' };
      case '/subnet-calculator':
        return { title: 'Subnet Calculator', desc: 'Compute IPv4 network parameters, masks, host boundaries, and address classes' };
      case '/vlsm-allocator':
        return { title: 'VLSM Allocator', desc: 'Variable Length Subnet Masking allocation engine with custom host requirements' };
      case '/visualization':
        return { title: 'Network Visualization', desc: 'Proportional visual distribution of allocated subnets and remaining space' };
      case '/history':
        return { title: 'Allocation History', desc: 'Persistent SQLite database of saved network allocation sessions' };
      default:
        return { title: 'IP Allocator', desc: 'Automated IP Address Allocation and Subnetting Tool' };
    }
  };

  const { title, desc } = getPageTitle(location.pathname);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between select-none">
      <div>
        <h1 className="text-base font-semibold text-slate-900 leading-tight">
          {title}
        </h1>
        <p className="text-xs text-slate-500 hidden sm:block">
          {desc}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Backend Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs">
          {backendConnected === null ? (
            <>
              <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
              <span className="text-slate-500 font-medium">Connecting...</span>
            </>
          ) : backendConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-medium hidden sm:inline">Backend Connected</span>
              <span className="text-emerald-700 font-medium sm:hidden">Online</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span className="text-rose-700 font-medium hidden sm:inline">Backend Offline</span>
              <span className="text-rose-700 font-medium sm:hidden">Offline</span>
            </>
          )}
          <button
            onClick={checkConnection}
            title="Refresh backend status"
            className="ml-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  );
}

