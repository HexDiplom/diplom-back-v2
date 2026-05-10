import { asc, desc, sql, type AnyColumn, type SQL, type SQLWrapper } from 'drizzle-orm'
import { t } from 'elysia'

export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 100

export type SortOrder = 'asc' | 'desc'

export type ListQuery<TSortBy extends string> = {
  page?: number
  limit?: number
  sortBy?: TSortBy
  sortOrder?: SortOrder
}

export type NormalizedListQuery<TSortBy extends string> = {
  page: number
  limit: number
  offset: number
  sortBy: TSortBy
  sortOrder: SortOrder
}

export type PaginatedResult<T> = {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export function createListQuerySchema(
  sortByValues: readonly string[],
  defaults: { sortBy: string; sortOrder?: SortOrder },
) {
  const sortByLiterals = sortByValues.map((value) => t.Literal(value))
  const sortBySchema = sortByLiterals.length === 1
    ? t.Literal(sortByValues[0]!, { default: defaults.sortBy })
    : t.Union(sortByLiterals as any, { default: defaults.sortBy })

  return t.Object({
    page: t.Optional(t.Numeric({ minimum: 1, default: DEFAULT_PAGE })),
    limit: t.Optional(t.Numeric({ minimum: 1, maximum: MAX_LIMIT, default: DEFAULT_LIMIT })),
    sortBy: t.Optional(sortBySchema),
    sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')], { default: defaults.sortOrder ?? 'asc' })),
  })
}

export function normalizeListQuery<TSortBy extends string>(
  query: ListQuery<TSortBy> | undefined,
  defaults: { sortBy: TSortBy; sortOrder: SortOrder },
): NormalizedListQuery<TSortBy> {
  const pageValue = Number.isFinite(query?.page) ? query!.page! : DEFAULT_PAGE
  const limitValue = Number.isFinite(query?.limit) ? query!.limit! : DEFAULT_LIMIT
  const page = Math.max(1, Math.trunc(pageValue))
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.trunc(limitValue)))

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    sortBy: query?.sortBy ?? defaults.sortBy,
    sortOrder: query?.sortOrder ?? defaults.sortOrder,
  }
}

export function createPaginatedResult<T>(
  data: T[],
  total: number,
  pagination: Pick<NormalizedListQuery<string>, 'page' | 'limit'>,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / pagination.limit)

  return {
    data,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
    },
  }
}

export function ordered(column: AnyColumn | SQLWrapper, sortOrder: SortOrder): SQL {
  return sortOrder === 'asc' ? asc(column) : desc(column)
}

export function orderedNullsLast(column: AnyColumn | SQLWrapper, sortOrder: SortOrder): SQL {
  return sql`${column} ${sql.raw(sortOrder)} nulls last`
}
