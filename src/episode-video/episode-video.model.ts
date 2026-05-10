import { episodeVideo } from '@/db/schema'
import { createListQuerySchema, type ListQuery } from '@/utils/pagination'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-typebox'
import { t, type UnwrapSchema } from 'elysia'

const _create = createInsertSchema(episodeVideo)
const _select = createSelectSchema(episodeVideo)
const _update = createUpdateSchema(episodeVideo)

export const EPISODE_VIDEO_SORT_FIELDS = ['voiceoverName', 'status', 'container', 'episodeId', 'id'] as const

export const EpisodeVideoModel = {
  listQuery: t.Composite([
    createListQuerySchema(EPISODE_VIDEO_SORT_FIELDS, { sortBy: 'id', sortOrder: 'asc' }),
    t.Object({ episodeId: t.Optional(t.String()) }),
  ]),
  create: t.Omit(_create, ['id']),
  select: _select,
  update: t.Omit(_update, ['id']),
}

export type EpisodeVideoListQuery = ListQuery<(typeof EPISODE_VIDEO_SORT_FIELDS)[number]> & {
  episodeId?: string
}

export type EpisodeVideoModel = {
  [k in keyof typeof EpisodeVideoModel]: UnwrapSchema<typeof EpisodeVideoModel[k]>
}
