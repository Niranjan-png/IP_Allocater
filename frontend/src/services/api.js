const API_BASE = '/api';

/**
 * Generic helper for handling JSON fetch requests and HTTP errors.
 */
async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    if (!res.ok) {
      let errorMessage = `HTTP error ${res.status}: ${res.statusText}`;
      try {
        const errorData = await res.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail);
        }
      } catch (e) {
        // Fallback to res.statusText if not json
      }
      throw new Error(errorMessage);
    }

    return await res.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error("Unable to connect to backend server. Ensure the FastAPI backend is running on http://127.0.0.1:8000.");
    }
    throw error;
  }
}

export const api = {
  // Health
  checkHealth: () => fetchJson('/health'),

  // Subnet Calculator
  calculateSubnet: (data) => fetchJson('/subnet/calculate', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // VLSM Allocator
  allocateVLSM: (data) => fetchJson('/vlsm/allocate', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Dashboard Stats
  getDashboardStats: () => fetchJson('/dashboard/stats'),

  // Saved Allocations (SQLite)
  getAllocations: () => fetchJson('/allocations'),
  getAllocationById: (id) => fetchJson(`/allocations/${id}`),
  saveAllocation: (data) => fetchJson('/allocations', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deleteAllocation: (id) => fetchJson(`/allocations/${id}`, {
    method: 'DELETE'
  })
};

