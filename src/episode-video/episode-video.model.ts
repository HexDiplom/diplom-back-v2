import { episodeVideo } from '@/db/schema'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-typebox'
import { t, type UnwrapSchema } from 'elysia'

const _create = createInsertSchema(episodeVideo)
const _select = createSelectSchema(episodeVideo)
const _update = createUpdateSchema(episodeVideo)

export const EpisodeVideoModel = {
  create: t.Omit(_create, ['id']),
  select: _select,
  update: t.Omit(_update, ['id']),
}

export type EpisodeVideoModel = {
  [k in keyof typeof EpisodeVideoModel]: UnwrapSchema<typeof EpisodeVideoModel[k]>
}
