import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AllocationContext = createContext(null);

export function AllocationProvider({ children }) {
  const [activeAllocation, setActiveAllocation] = useState(null);
  const [activeBaseNetwork, setActiveBaseNetwork] = useState('192.168.1.0/24');
  const [activeDepartments, setActiveDepartments] = useState([
    { id: '1', name: 'Engineering', hosts_needed: 100 },
    { id: '2', name: 'HR', hosts_needed: 50 },
    { id: '3', name: 'Management', hosts_needed: 20 },
  ]);
  const [backendConnected, setBackendConnected] = useState(null); // null = checking, true, false
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setNotification(prev => prev && prev.message === message ? null : prev);
    }, 4000);
  };

  const checkConnection = async () => {
    try {
      await api.checkHealth();
      setBackendConnected(true);
    } catch (e) {
      setBackendConnected(false);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSessionIntoActive = (sessionDetail) => {
    try {
      const depts = JSON.parse(sessionDetail.departments_json);
      const res = JSON.parse(sessionDetail.result_json);
      setActiveBaseNetwork(sessionDetail.base_network);
      setActiveDepartments(depts.map((d, index) => ({ id: String(index + 1), name: d.name, hosts_needed: d.hosts_needed })));
      setActiveAllocation(res);
      showNotification(`Loaded session "${sessionDetail.title}" into active workspace.`, 'success');
    } catch (e) {
      showNotification('Failed to parse saved session data.', 'error');
    }
  };

  return (
    <AllocationContext.Provider
      value={{
        activeAllocation,
        setActiveAllocation,
        activeBaseNetwork,
        setActiveBaseNetwork,
        activeDepartments,
        setActiveDepartments,
        backendConnected,
        checkConnection,
        loadSessionIntoActive,
        notification,
        showNotification
      }}
    >
      {children}
    </AllocationContext.Provider>
  );
}

export function useAllocation() {
  const context = useContext(AllocationContext);
  if (!context) {
    throw new Error('useAllocation must be used within an AllocationProvider');
  }
  return context;
}

