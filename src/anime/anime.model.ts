import { anime, animeCoverImage, animeTitle, animeTrailer, animeRelation } from '@/db/schema'
import { createListQuerySchema, type ListQuery } from '@/utils/pagination'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-typebox'
import { t, UnwrapSchema } from 'elysia'

const _createAnime = createInsertSchema(anime)
const _createTitle = createInsertSchema(animeTitle)
const _createCover = createInsertSchema(animeCoverImage)
const _createTrailer = createInsertSchema(animeTrailer)
const _createRelation = createInsertSchema(animeRelation)

const _selectAnime = createSelectSchema(anime)
const _updateAnime = createUpdateSchema(anime)
const _updateTitle = createUpdateSchema(animeTitle)
const _updateCover = createUpdateSchema(animeCoverImage)

export const ANIME_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'startDate',
  'endDate',
  'seasonYear',
  'episodes',
  'duration',
  'titleRussian',
  'id',
] as const

export const ANIME_TRAILER_SORT_FIELDS = ['id'] as const

export const ANIME_RELATION_SORT_FIELDS = ['relationType', 'relatedAnimeId', 'id'] as const

export const AnimeModel = {
  listQuery: createListQuerySchema(ANIME_SORT_FIELDS, { sortBy: 'createdAt', sortOrder: 'desc' }),
  trailerListQuery: createListQuerySchema(ANIME_TRAILER_SORT_FIELDS, { sortBy: 'id', sortOrder: 'asc' }),
  relationListQuery: createListQuerySchema(ANIME_RELATION_SORT_FIELDS, { sortBy: 'id', sortOrder: 'asc' }),
  create: t.Composite([
    t.Omit(_createAnime, ["id", "createdAt", "updatedAt"]),
    t.Object({
      title: t.Omit(_createTitle, ["animeId"]),
      coverImage: t.Optional(t.Omit(_createCover, ["animeId"]))
    })
  ]),
  select: _selectAnime,
  update: t.Omit(_updateAnime, ["id", "createdAt", "updatedAt"]),
  updateTitle: t.Omit(_updateTitle, ["animeId"]),
  updateCover: t.Omit(_updateCover, ["animeId"]),
  createTrailer: t.Omit(_createTrailer, ["id", "animeId"]),
  createRelation: t.Omit(_createRelation, ["id", "animeId"]),
}

export type AnimeWithDetails = typeof anime.$inferSelect & {
  title: typeof animeTitle.$inferSelect
  coverImage: typeof animeCoverImage.$inferSelect | null
}

export type AnimeListQuery = ListQuery<(typeof ANIME_SORT_FIELDS)[number]>
export type AnimeTrailerListQuery = ListQuery<(typeof ANIME_TRAILER_SORT_FIELDS)[number]>
export type AnimeRelationListQuery = ListQuery<(typeof ANIME_RELATION_SORT_FIELDS)[number]>

export type AnimeModel = {
  [k in keyof typeof AnimeModel]: UnwrapSchema<typeof AnimeModel[k]>
}
