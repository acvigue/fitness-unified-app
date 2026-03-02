import { useAuthStore } from '@/stores/auth/auth'
import { ENV } from '@/config/environment'

const API_BASE = ENV.apiBaseUrl

async function authFetch(endpoint: string, options: RequestInit = {}) {
  const authStore = useAuthStore()
  const token = await authStore.getAccessToken()
  
  const url = `${API_BASE}${endpoint}`
  console.log(`[API Request] ${options.method || 'GET'} ${url}`)

  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Try to parse JSON error response
  let responseData
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    responseData = await response.json()
  } else {
    responseData = await response.text()
  }

  if (!response.ok) {
    // Extract error message from backend response
    let message = `Request failed with status ${response.status}`
    if (responseData && typeof responseData === 'object' && responseData.message) {
      message = responseData.message
    } else if (typeof responseData === 'string') {
      message = responseData
    }
    throw new Error(message)
  }

  return responseData
}

export interface ProfilePicture {
  id: string;
  url: string;
  alt?: string;
  isPrimary: boolean;
}

export interface UserProfile {
  userId: string;
  bio?: string;
  favoriteSports: string[];
  pictures: ProfilePicture[];
}


export const userApi = {
  deactivateAccount(password: string) {
    return authFetch('/users/deactivate', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
  },

  deleteAccount(password: string) {
    return authFetch('/users/delete', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
  },


  async getProfile(): Promise<UserProfile> {
    return authFetch('/v1/user/profile', { method: 'GET' });
  },

  async updateProfile(data: { bio?: string; favoriteSports?: string[] }): Promise<UserProfile> {
    return authFetch('/v1/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

}