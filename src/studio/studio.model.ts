import { studio } from '@/db/schema'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-typebox'
import { t, type UnwrapSchema } from 'elysia'

const _create = createInsertSchema(studio)
const _select = createSelectSchema(studio)
const _update = createUpdateSchema(studio)

export const StudioModel = {
  create: t.Omit(_create, ['id']),
  select: _select,
  update: t.Omit(_update, ['id']),
}

export type StudioModel = {
  [k in keyof typeof StudioModel]: UnwrapSchema<typeof StudioModel[k]>
}
