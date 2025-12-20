/**
 * useCampaignSSE - Custom hook for Server-Sent Events metrics streaming
 *
 * Features:
 * - Connects to SSE stream for real-time metric updates
 * - Automatic reconnection on connection loss
 * - Fallback to polling if SSE unavailable
 * - Cleanup on unmount
 *
 * Usage:
 * const { metrics, isConnected, isFallback } = useCampaignSSE(campaignId, isActive)
 */

import { useEffect, useState, useCallback, useRef } from 'react'

const POLLING_INTERVAL = 5000 // 5 seconds as fallback
const RECONNECT_DELAY = 3000 // 3 seconds before retry
const MAX_RECONNECT_ATTEMPTS = 5

export const useCampaignSSE = (campaignId, isActive = true) => {
  const [metrics, setMetrics] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isFallback, setIsFallback] = useState(false)
  const [error, setError] = useState(null)

  const eventSourceRef = useRef(null)
  const pollingIntervalRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef(null)
  const unauthorizedRef = useRef(false)

  /**
   * Parse SSE data format: "data: {json}\n\n"
   */
  const parseSSEData = useCallback((dataString) => {
    try {
      // Remove "data: " prefix if present
      const jsonString = dataString.startsWith('data: ')
        ? dataString.substring(6)
        : dataString

      return JSON.parse(jsonString)
    } catch (err) {
      console.error('[SSE] Failed to parse data:', err, dataString)
      return null
    }
  }, [])

  /**
   * Setup SSE connection for real-time updates
   */
  const setupSSE = useCallback(() => {
    if (!campaignId) return
    if (unauthorizedRef.current) return

    try {
      console.log(`[SSE] Connecting to campaign ${campaignId} metrics stream...`)

      const eventSource = new EventSource(
        `/api/campaigns/${campaignId}/metrics/stream`,
        { withCredentials: true }
      )

      eventSource.onopen = () => {
        console.log(`[SSE] Connected to campaign ${campaignId}`)
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0

        // Clear polling interval since SSE is now active
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
      }

      eventSource.onmessage = (event) => {
        const data = parseSSEData(event.data)
        if (data) {
          console.log(`[SSE] Metrics received:`, data.metrics)
          setMetrics(data)
        }
      }

      eventSource.onerror = (err) => {
        console.error(`[SSE] Connection error:`, err)
        setIsConnected(false)
        eventSource.close()
        eventSourceRef.current = null

        // If unauthorized, stop trying
        checkUnauthorized().then((unauth) => {
          if (unauth) {
            unauthorizedRef.current = true
            setError('Unauthorized')
            return
          }

          // Fallback to polling
          startPolling()

          // Try to reconnect
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current++
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(
                `[SSE] Reconnecting... (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
              )
              setupSSE()
            }, RECONNECT_DELAY)
          } else {
            console.warn(
              '[SSE] Max reconnection attempts reached, using polling only'
            )
            setError(
              'Real-time updates unavailable, using polling'
            )
          }
        })
      }

      eventSourceRef.current = eventSource
      setIsFallback(false)
    } catch (err) {
      console.error('[SSE] Failed to setup connection:', err)
      setError(err.message)
      startPolling() // Fallback to polling
    }
  }, [campaignId, parseSSEData])

  /**
   * Fallback polling mechanism
   */
  const startPolling = useCallback(() => {
    if (unauthorizedRef.current) return
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    console.log('[SSE] Falling back to polling every 5 seconds...')
    setIsFallback(true)

    const fetchMetrics = async () => {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}/metrics`, {
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          setMetrics({
            timestamp: new Date().toISOString(),
            campaign: data.campaign,
            metrics: data.metrics,
            uplift: data.uplift,
            resend_metrics: data.resend_metrics
          })
          setError(null)
        } else if (response.status === 404) {
          console.warn('[SSE] Campaign not found')
          setError('Campaign not found')
        } else if (response.status === 401) {
          unauthorizedRef.current = true
          setError('Unauthorized')
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        }
      } catch (err) {
        console.error('[SSE] Polling error:', err)
        setError(err.message)
      }
    }

    // Fetch immediately, then poll
    fetchMetrics()
    pollingIntervalRef.current = setInterval(fetchMetrics, POLLING_INTERVAL)
  }, [campaignId])

  const checkUnauthorized = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/metrics`, {
        credentials: 'include'
      })
      return res.status === 401
    } catch {
      return false
    }
  }, [campaignId])

  /**
   * Initialize connection when active
   */
  useEffect(() => {
    if (isActive && campaignId) {
      setupSSE()

      // Set a timeout to fallback to polling if SSE doesn't connect
      const fallbackTimeout = setTimeout(() => {
        if (!isConnected && !isFallback) {
          console.warn('[SSE] SSE not established after 5s, starting polling...')
          startPolling()
        }
      }, 5000)

      return () => {
        clearTimeout(fallbackTimeout)
      }
    }
  }, [isActive, campaignId, setupSSE, startPolling, isConnected, isFallback])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Close SSE connection
      if (eventSourceRef.current) {
        console.log('[SSE] Closing connection...')
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }

      // Clear polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }

      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [])

  return {
    metrics,
    isConnected,
    isFallback,
    error,
    // Manual control functions (optional, for testing)
    reconnect: setupSSE,
    stopPolling: () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }
}
