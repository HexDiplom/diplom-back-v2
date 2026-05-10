import { studio } from '@/db/schema'
import { createListQuerySchema, type ListQuery } from '@/utils/pagination'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-typebox'
import { t, type UnwrapSchema } from 'elysia'

const _create = createInsertSchema(studio)
const _select = createSelectSchema(studio)
const _update = createUpdateSchema(studio)

export const STUDIO_SORT_FIELDS = ['id'] as const

export const StudioModel = {
  listQuery: createListQuerySchema(STUDIO_SORT_FIELDS, { sortBy: 'id', sortOrder: 'asc' }),
  create: t.Omit(_create, ['id']),
  select: _select,
  update: t.Omit(_update, ['id']),
}

export type StudioListQuery = ListQuery<(typeof STUDIO_SORT_FIELDS)[number]>

export type StudioModel = {
  [k in keyof typeof StudioModel]: UnwrapSchema<typeof StudioModel[k]>
}
