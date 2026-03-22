import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { daysUntil, getInitials, voteLabel, timeAgo } from '@/lib/utils'

describe('daysUntil', () => {
  it('returns 0 for today', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(daysUntil(today)).toBe(0)
  })

  it('returns 1 for tomorrow', () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0]
    expect(daysUntil(tomorrow)).toBe(1)
  })

  it('returns negative for past dates', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
    expect(daysUntil(yesterday)).toBeLessThan(0)
  })

  it('returns 7 for a week from now', () => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    expect(daysUntil(d.toISOString().split('T')[0])).toBe(7)
  })
})

describe('getInitials', () => {
  it('returns 2-letter initials for full name', () => {
    expect(getInitials('Maria Rodrigues')).toBe('MR')
  })

  it('returns single letter for single name', () => {
    expect(getInitials('João')).toBe('J')
  })

  it('caps at 2 letters for multi-word names', () => {
    expect(getInitials('Ana Paula Costa')).toBe('AP')
  })

  it('uppercases result', () => {
    expect(getInitials('pedro ferreira')).toBe('PF')
  })

  it('handles empty string', () => {
    expect(getInitials('')).toBe('')
  })
})

describe('voteLabel', () => {
  it('returns Alta for 15+', () => {
    expect(voteLabel(15)).toBe('Alta')
    expect(voteLabel(20)).toBe('Alta')
  })

  it('returns Média for 7–14', () => {
    expect(voteLabel(7)).toBe('Média')
    expect(voteLabel(14)).toBe('Média')
  })

  it('returns Baixa for 0–6', () => {
    expect(voteLabel(0)).toBe('Baixa')
    expect(voteLabel(6)).toBe('Baixa')
  })
})

describe('timeAgo', () => {
  let now: number

  beforeEach(() => {
    now = Date.now()
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "agora" for < 1 minute', () => {
    const ts = new Date(now - 30_000).toISOString()
    expect(timeAgo(ts)).toBe('agora')
  })

  it('returns minutes for < 1 hour', () => {
    const ts = new Date(now - 5 * 60_000).toISOString()
    expect(timeAgo(ts)).toBe('há 5min')
  })

  it('returns hours for < 24 hours', () => {
    const ts = new Date(now - 3 * 3_600_000).toISOString()
    expect(timeAgo(ts)).toBe('há 3h')
  })

  it('returns days for < 7 days', () => {
    const ts = new Date(now - 2 * 86_400_000).toISOString()
    expect(timeAgo(ts)).toBe('há 2d')
  })

  it('returns formatted date for >= 7 days', () => {
    const ts = new Date(now - 10 * 86_400_000).toISOString()
    const result = timeAgo(ts)
    // should be a localised date string, not a relative label
    expect(result).not.toMatch(/^há/)
  })
})
