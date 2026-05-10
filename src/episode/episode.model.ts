import { episode } from '@/db/schema'
import { createListQuerySchema, type ListQuery } from '@/utils/pagination'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-typebox'
import { t, type UnwrapSchema } from 'elysia'

const _create = createInsertSchema(episode)
const _select = createSelectSchema(episode)
const _update = createUpdateSchema(episode)

export const EPISODE_SORT_FIELDS = ['number', 'name', 'animeId', 'id'] as const

export const EpisodeModel = {
  listQuery: t.Composite([
    createListQuerySchema(EPISODE_SORT_FIELDS, { sortBy: 'number', sortOrder: 'asc' }),
    t.Object({ animeId: t.Optional(t.Numeric()) }),
  ]),
  create: t.Omit(_create, ['id']),
  select: _select,
  update: t.Omit(_update, ['id']),
}

export type EpisodeListQuery = ListQuery<(typeof EPISODE_SORT_FIELDS)[number]> & {
  animeId?: number
}

export type EpisodeModel = {
  [k in keyof typeof EpisodeModel]: UnwrapSchema<typeof EpisodeModel[k]>
}
