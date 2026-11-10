import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AllocationProvider, useAllocation } from './context/AllocationContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import SubnetCalculator from './pages/SubnetCalculator';
import VLSMAllocator from './pages/VLSMAllocator';
import NetworkVisualization from './pages/NetworkVisualization';
import AllocationHistory from './pages/AllocationHistory';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

function Toast() {
  const { notification } = useAllocation();
  if (!notification) return null;

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-xs font-medium max-w-md transition-all animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className={`p-1 rounded-md ${borders[notification.type] || borders.info} flex items-center gap-2`}>
        {icons[notification.type] || icons.info}
        <span>{notification.message}</span>
      </div>
    </div>
  );
}

function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/subnet-calculator" element={<SubnetCalculator />} />
              <Route path="/vlsm-allocator" element={<VLSMAllocator />} />
              <Route path="/visualization" element={<NetworkVisualization />} />
              <Route path="/history" element={<AllocationHistory />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AllocationProvider>
        <MainLayout />
      </AllocationProvider>
    </BrowserRouter>
  );
}

