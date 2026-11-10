import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAllocation } from '../context/AllocationContext';
import {
  History,
  Trash2,
  ExternalLink,
  RotateCcw,
  Database,
  Calendar,
  Layers,
  Server,
  Download,
  AlertCircle,
  Eye,
  CheckCircle2,
  X
} from 'lucide-react';

export default function AllocationHistory() {
  const navigate = useNavigate();
  const { loadSessionIntoActive, showNotification } = useAllocation();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await api.getAllocations();
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleOpenDetail = async (id) => {
    try {
      setLoadingDetail(true);
      const detail = await api.getAllocationById(id);
      setSelectedSession(detail);
      setInspectModalOpen(true);
    } catch (err) {
      showNotification(`Failed to load session details: ${err.message}`, 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleLoadAndNavigate = (session) => {
    loadSessionIntoActive(session);
    setInspectModalOpen(false);
    navigate('/visualization');
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this saved allocation session?")) {
      return;
    }

    try {
      setDeletingId(id);
      await api.deleteAllocation(id);
      setSessions(sessions.filter(s => s.id !== id));
      if (selectedSession && selectedSession.id === id) {
        setInspectModalOpen(false);
      }
      showNotification('Session deleted successfully.', 'info');
    } catch (err) {
      showNotification(`Failed to delete session: ${err.message}`, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Saved Allocation Sessions
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Historical records persisted in the local SQLite database.
          </p>
        </div>

        <button
          onClick={fetchSessions}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Refresh List
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Error loading sessions: {error}</span>
        </div>
      )}

      {/* Sessions Table or Empty State */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading saved allocation sessions...
          </div>
        ) : sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Session Title</th>
                  <th className="py-3 px-3">Base Network</th>
                  <th className="py-3 px-3">Subnets</th>
                  <th className="py-3 px-3">Allocated IPs</th>
                  <th className="py-3 px-3">Utilization</th>
                  <th className="py-3 px-4">Saved At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleOpenDetail(item.id)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        {item.description && (
                          <span className="text-[11px] text-slate-400 font-normal line-clamp-1">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-medium text-slate-800">
                      {item.base_network}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-600">
                      {item.department_count} subnets
                    </td>
                    <td className="py-3.5 px-3 font-mono text-blue-600 font-semibold">
                      {item.total_allocated_ips.toLocaleString()} / {item.total_base_ips.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                        {item.network_utilization_pct}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {item.created_at}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenDetail(item.id)}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        disabled={deletingId === item.id}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Database className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">No Allocation Sessions in SQLite Database</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Once you calculate a VLSM allocation, click "Save Session" to preserve it for future reference, grading, or review.
              </p>
            </div>
            <button
              onClick={() => navigate('/vlsm-allocator')}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Go to VLSM Allocator
            </button>
          </div>
        )}
      </div>

      {/* Inspect Detail Modal */}
      {inspectModalOpen && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedSession.title}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                  <span>Base Network: <strong className="font-mono text-slate-800">{selectedSession.base_network}</strong></span>
                  <span>&bull;</span>
                  <span>Recorded: {selectedSession.created_at}</span>
                </div>
              </div>
              <button
                onClick={() => setInspectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedSession.description && (
              <div className="p-3 rounded-lg bg-slate-50 text-xs text-slate-600 border border-slate-100">
                {selectedSession.description}
              </div>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400">Total Subnets</span>
                <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                  {selectedSession.department_count}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400">Allocated IPs</span>
                <div className="text-sm font-bold font-mono text-blue-600 mt-0.5">
                  {selectedSession.total_allocated_ips}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400">Network Utilization</span>
                <div className="text-sm font-bold font-mono text-emerald-600 mt-0.5">
                  {selectedSession.network_utilization_pct}%
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDelete(selectedSession.id)}
                className="px-3.5 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Session
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInspectModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadAndNavigate(selectedSession)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Load Into Workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

