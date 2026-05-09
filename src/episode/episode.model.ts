import { episode } from '@/db/schema'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-typebox'
import { t, type UnwrapSchema } from 'elysia'

const _create = createInsertSchema(episode)
const _select = createSelectSchema(episode)
const _update = createUpdateSchema(episode)

export const EpisodeModel = {
  create: t.Omit(_create, ['id']),
  select: _select,
  update: t.Omit(_update, ['id']),
}

export type EpisodeModel = {
  [k in keyof typeof EpisodeModel]: UnwrapSchema<typeof EpisodeModel[k]>
}
