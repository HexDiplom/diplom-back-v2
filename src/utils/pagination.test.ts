import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  createPaginatedResult,
  normalizeListQuery,
} from './pagination'

describe('pagination helpers', () => {
  test('uses page, limit and sort defaults', () => {
    const result = normalizeListQuery(undefined, { sortBy: 'createdAt', sortOrder: 'desc' })

    expect(result).toEqual({
      page: 1,
      limit: DEFAULT_LIMIT,
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
  })

  test('normalizes unsafe numeric values and caps limit', () => {
    const result = normalizeListQuery(
      { page: -2, limit: 1000, sortBy: 'id', sortOrder: 'asc' },
      { sortBy: 'createdAt', sortOrder: 'desc' },
    )

    expect(result.page).toBe(1)
    expect(result.limit).toBe(MAX_LIMIT)
    expect(result.offset).toBe(0)
  })

  test('falls back from invalid numbers', () => {
    const result = normalizeListQuery(
      { page: Number.NaN, limit: Number.NaN, sortBy: 'id', sortOrder: 'asc' },
      { sortBy: 'createdAt', sortOrder: 'desc' },
    )

    expect(result.page).toBe(1)
    expect(result.limit).toBe(DEFAULT_LIMIT)
  })

  test('builds pagination metadata', () => {
    const result = createPaginatedResult(['a', 'b'], 42, { page: 2, limit: 20 })

    expect(result).toEqual({
      data: ['a', 'b'],
      meta: {
        page: 2,
        limit: 20,
        total: 42,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true,
      },
    })
  })
})
