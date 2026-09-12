const BASE_URL = '/api/v1';

export class APIError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'APIError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = localStorage.getItem('access_token');
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('access_token');
      // Do not reload to prevent infinite loops, just let the app handle the failure
    }
    
    let message = 'An error occurred';
    try {
      const errorData = await response.json();
      message = errorData.detail || message;
    } catch (e) {
      // Ignore json parse error
    }
    throw new APIError(response.status, message);
  }

  return response.json();
}

export const api = {
  // Auth
  login: async (username: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    if (!response.ok) {
      throw new Error('Login failed');
    }
    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    return data;
  },
  
  logout: () => {
    localStorage.removeItem('access_token');
  },

  // Analyze
  analyzePrompt: (prompt: string, destinationId: number) =>
    request<any>('/analyze/prompt', {
      method: 'POST',
      body: JSON.stringify({ prompt, destination_id: destinationId }),
    }),

  // Dashboard Overview
  getOverviewStats: (days: number = 7) => 
    request<any>(`/dashboard/overview?days=${days}`),
    
  // Requests
  getRequests: (skip: number = 0, limit: number = 50) => 
    request<any[]>(`/dashboard/requests?skip=${skip}&limit=${limit}`),
    
  getCriticalEvents: (limit: number = 5) => 
    request<any[]>(`/dashboard/critical?limit=${limit}`),
    
  getRequestFindings: (requestId: string) => 
    request<any[]>(`/dashboard/requests/${requestId}/findings`),
    
  // Findings
  getFindingsStats: (days: number = 7) => 
    request<any[]>(`/dashboard/findings?days=${days}`),
    
  // Users
  getUsersRisk: (days: number = 30) => 
    request<any[]>(`/dashboard/users?days=${days}`),
    
  // Policies
  getPolicies: () => 
    request<any[]>('/policies/'),
  
  createPolicy: (policy: any) => 
    request<any>('/policies/', {
      method: 'POST',
      body: JSON.stringify(policy),
    }),
    
  updatePolicy: (id: number, policy: any) => 
    request<any>(`/policies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(policy),
    }),
    
  deletePolicy: (id: number) => 
    request<any>(`/policies/${id}`, {
      method: 'DELETE',
    }),
    
  // Settings / Destinations
  getDestinations: () => 
    request<any[]>('/settings/destinations'),
    
  createDestination: (dest: any) => 
    request<any>('/settings/destinations', {
      method: 'POST',
      body: JSON.stringify(dest),
    }),
    
  updateDestination: (id: number, dest: any) => 
    request<any>(`/settings/destinations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dest),
    }),
};
