import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { ENDPOINTS } from '../services/endpoints'
import type { ExchangeRate } from '../types'

/** One request per visit: every price on the screen converts with the same rate. */
let pending: Promise<ExchangeRate | null> | null = null
let known: ExchangeRate | null = null

function loadRate(): Promise<ExchangeRate | null> {
  pending ??= api
    .get<ExchangeRate>(ENDPOINTS.exchangeRate)
    .then(({ data }) => (known = data))
    .catch(() => {
      pending = null
      return null
    })
  return pending
}

/** Soles per dollar, or null until it arrives (prices then show in their own currency only). */
export function useExchangeRate(): number | null {
  const [rate, setRate] = useState<number | null>(known?.rate ?? null)
  useEffect(() => {
    if (known) return
    let isMounted = true
    void loadRate().then((result) => {
      if (isMounted && result) setRate(result.rate)
    })
    return () => {
      isMounted = false
    }
  }, [])
  return rate
}

/** The same amount in the other currency: soles to dollars or dollars to soles. */
export function convertCurrency(amount: number, currency: string, penPerUsd: number): { amount: number; currency: string } | null {
  if (currency === 'PEN') return { amount: amount / penPerUsd, currency: 'USD' }
  if (currency === 'USD') return { amount: amount * penPerUsd, currency: 'PEN' }
  return null
}
