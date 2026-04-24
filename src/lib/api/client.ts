import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from '@/types/api'
import { ENV } from '@/config/environment'
import { useAuthStore } from '@/stores/auth/auth'
import { useToastStore } from '@/stores/toast'
import router from '@/router'

// Track if we're currently refreshing to avoid loops
let isRefreshing = false

/**
 * Redirect to login with current path preserved
 */
function redirectToLogin(reason?: string) {
  const currentPath = window.location.pathname + window.location.search
  router.replace({
    path: '/login',
    query: {
      ...(currentPath !== '/' ? { redirect: currentPath } : {}),
      ...(reason ? { reason } : {}),
    },
  })
}

/**
 * Safely extract the human-readable error message from a JSON body
 */
async function readErrorMessage(response: Response): Promise<string | null> {
  try {
    const clone = response.clone()
    const body = (await clone.json()) as { message?: unknown; error?: unknown }
    if (typeof body?.message === 'string') return body.message
    if (Array.isArray(body?.message)) return body.message.join(', ')
    if (typeof body?.error === 'string') return body.error
  } catch {
    // ignore JSON parse errors
  }
  return null
}

/**
 * Authentication middleware that adds Bearer token and retries on 401
 */
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const authStore = useAuthStore()

    try {
      const token = await authStore.getAccessToken()
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`)
      }
    } catch (error) {
      console.error('Failed to get access token for API request:', error)
    }

    return request
  },

  async onResponse({ request, response }) {
    if (response.status !== 401 || isRefreshing) {
      return response
    }

    // Check if the 401 is due to suspension/ban — don't try to refresh in that case
    const message = await readErrorMessage(response)
    if (message && /suspended|banned|revoked/i.test(message)) {
      const authStore = useAuthStore()
      await authStore.logout().catch(() => undefined)
      const toast = useToastStore()
      toast.error('Account access denied', message)
      redirectToLogin('account-disabled')
      return response
    }

    isRefreshing = true
    const authStore = useAuthStore()
    try {
      const newToken = await authStore.refreshAccessToken()
      if (newToken) {
        const retryRequest = new Request(request.url, {
          method: request.method,
          headers: new Headers(request.headers),
          body: request.body,
          credentials: request.credentials,
        })
        retryRequest.headers.set('Authorization', `Bearer ${newToken}`)

        const retryResponse = await fetch(retryRequest)
        isRefreshing = false
        return retryResponse
      }
      redirectToLogin()
    } catch (error) {
      console.error('Token refresh failed during 401 retry:', error)
      redirectToLogin()
    }

    isRefreshing = false
    return response
  },
}

/**
 * Error handling middleware. Surfaces user-friendly toasts for common cases
 * (restrictions, blocks) so callers don't need to replicate the same UX.
 */
const errorMiddleware: Middleware = {
  async onResponse({ response }) {
    if (response.ok || response.status === 401) {
      return response
    }

    const message = await readErrorMessage(response)

    if (message && response.status === 403) {
      // Silent on a couple of routes where a 403 is an expected "hide this UI" signal
      const url = response.url ?? ''
      const isProfileView = /\/v1\/users\/[^/]+\/profile/.test(url)
      const isCompare = /\/v1\/users\/compare/.test(url)

      if (!isProfileView && !isCompare) {
        const toast = useToastStore()
        if (/^Action /i.test(message)) {
          toast.warning('Action restricted', message)
        } else if (/block/i.test(message)) {
          toast.info('Action blocked', message)
        } else {
          toast.error('Not permitted', message)
        }
      }
    }

    console.error('API Error:', {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      message,
    })

    return response
  },
}

/**
 * Main API client instance
 */
export const apiClient = createClient<paths>({
  baseUrl: ENV.apiBaseUrl,
})

apiClient.use(authMiddleware)
apiClient.use(errorMiddleware)
