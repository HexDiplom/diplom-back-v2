import { anime, animeCoverImage, animeTitle } from '@/db/schema'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-typebox'
import { t, UnwrapSchema } from 'elysia'

const _createAnime = createInsertSchema(anime)
const _createTitle = createInsertSchema(animeTitle)
const _createCover = createInsertSchema(animeCoverImage)

const _selectAnime = createSelectSchema(anime)

const _updateAnime = createUpdateSchema(anime)

export const AnimeModel = {
  create: t.Composite([
    t.Omit(_createAnime, ["id", "createdAt", "updatedAt"]),
    t.Object({
      title: t.Omit(_createTitle, ["animeId"]),
      coverImage: t.Optional(t.Omit(_createCover, ["animeId"]))
    })
  ]),
  select: _selectAnime,
	update: _updateAnime,
}

export type AnimeModel = {
	[k in keyof typeof AnimeModel]: UnwrapSchema<typeof AnimeModel[k]>
}
