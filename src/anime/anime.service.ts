import { db } from '@/db'
import { anime, animeCoverImage, animeTitle, animeTrailer, animeRelation } from '@/db/schema'
import {
  AnimeModel,
  type AnimeListQuery,
  type AnimeRelationListQuery,
  type AnimeTrailerListQuery,
  type AnimeWithDetails,
} from '@/anime/anime.model'
import {
  createPaginatedResult,
  normalizeListQuery,
  ordered,
  orderedNullsLast,
  type SortOrder,
} from '@/utils/pagination'
import { count, eq, type SQL } from 'drizzle-orm'

const animeListDefaults = { sortBy: 'createdAt', sortOrder: 'desc' } as const
const trailerListDefaults = { sortBy: 'id', sortOrder: 'asc' } as const
const relationListDefaults = { sortBy: 'id', sortOrder: 'asc' } as const

function getAnimeOrderBy(sortBy: NonNullable<AnimeListQuery['sortBy']>, sortOrder: SortOrder): SQL[] {
  switch (sortBy) {
    case 'titleRussian':
      return [ordered(animeTitle.russian, sortOrder), ordered(anime.id, 'asc')]
    case 'startDate':
      return [
        orderedNullsLast(anime.startDateYear, sortOrder),
        orderedNullsLast(anime.startDateMonth, sortOrder),
        orderedNullsLast(anime.startDateDay, sortOrder),
        ordered(anime.id, 'asc'),
      ]
    case 'endDate':
      return [
        orderedNullsLast(anime.endDateYear, sortOrder),
        orderedNullsLast(anime.endDateMonth, sortOrder),
        orderedNullsLast(anime.endDateDay, sortOrder),
        ordered(anime.id, 'asc'),
      ]
    case 'updatedAt':
      return [ordered(anime.updatedAt, sortOrder), ordered(anime.id, 'asc')]
    case 'seasonYear':
      return [orderedNullsLast(anime.seasonYear, sortOrder), ordered(anime.id, 'asc')]
    case 'episodes':
      return [orderedNullsLast(anime.episodes, sortOrder), ordered(anime.id, 'asc')]
    case 'duration':
      return [orderedNullsLast(anime.duration, sortOrder), ordered(anime.id, 'asc')]
    case 'id':
      return [ordered(anime.id, sortOrder)]
    case 'createdAt':
    default:
      return [ordered(anime.createdAt, sortOrder), ordered(anime.id, 'asc')]
  }
}

function getRelationOrderBy(sortBy: NonNullable<AnimeRelationListQuery['sortBy']>, sortOrder: SortOrder): SQL[] {
  switch (sortBy) {
    case 'relationType':
      return [ordered(animeRelation.relationType, sortOrder), ordered(animeRelation.id, 'asc')]
    case 'relatedAnimeId':
      return [ordered(animeRelation.relatedAnimeId, sortOrder), ordered(animeRelation.id, 'asc')]
    case 'id':
    default:
      return [ordered(animeRelation.id, sortOrder)]
  }
}

export abstract class AnimeService {
  static async createAnime(data: AnimeModel['create']): Promise<AnimeWithDetails> {
    const { title, coverImage, ...animeData } = data

    return db.transaction(async (tx) => {
      const [createdAnime] = await tx
        .insert(anime)
        .values(animeData)
        .returning()

      const [createdTitle] = await tx
        .insert(animeTitle)
        .values({ animeId: createdAnime.id, ...title })
        .returning()

      const [createdCoverImage] = coverImage
        ? await tx.insert(animeCoverImage).values({ ...coverImage, animeId: createdAnime.id }).returning()
        : [null]

      return { ...createdAnime, title: createdTitle, coverImage: createdCoverImage } as AnimeWithDetails
    })
  }

  static async getAnimeList(query?: AnimeListQuery) {
    const pagination = normalizeListQuery(query, animeListDefaults)

    const [totalRow] = await db
      .select({ total: count() })
      .from(anime)
      .innerJoin(animeTitle, eq(animeTitle.animeId, anime.id))
    const rows = await db
      .select({
        anime,
        title: animeTitle,
        coverImage: animeCoverImage,
      })
      .from(anime)
      .innerJoin(animeTitle, eq(animeTitle.animeId, anime.id))
      .leftJoin(animeCoverImage, eq(animeCoverImage.animeId, anime.id))
      .orderBy(...getAnimeOrderBy(pagination.sortBy, pagination.sortOrder))
      .limit(pagination.limit)
      .offset(pagination.offset)

    return createPaginatedResult(
      rows.map(({ anime, title, coverImage }) => ({ ...anime, title, coverImage })),
      totalRow?.total ?? 0,
      pagination,
    )
  }

  static async getAnimeById(id: number) {
    return db.query.anime.findFirst({
      where: eq(anime.id, id),
      with: { title: true, coverImage: true, trailers: true }
    })
  }

  static async updateAnime(id: number, data: AnimeModel['update']) {
    const [updated] = await db.update(anime).set(data).where(eq(anime.id, id)).returning()
    return updated ?? null
  }

  static async deleteAnime(id: number) {
    const [deleted] = await db.delete(anime).where(eq(anime.id, id)).returning()
    return deleted ?? null
  }

  static async updateAnimeTitle(animeId: number, data: AnimeModel['updateTitle']) {
    const [updated] = await db.update(animeTitle).set(data).where(eq(animeTitle.animeId, animeId)).returning()
    return updated ?? null
  }

  static async updateAnimeCover(animeId: number, data: AnimeModel['updateCover']) {
    const [updated] = await db.update(animeCoverImage).set(data).where(eq(animeCoverImage.animeId, animeId)).returning()
    return updated ?? null
  }

  static async getAnimeTrailers(animeId: number, query?: AnimeTrailerListQuery) {
    const pagination = normalizeListQuery(query, trailerListDefaults)
    const where = eq(animeTrailer.animeId, animeId)

    const [totalRow] = await db.select({ total: count() }).from(animeTrailer).where(where)
    const data = await db.query.animeTrailer.findMany({
      where,
      orderBy: [ordered(animeTrailer.id, pagination.sortOrder)],
      limit: pagination.limit,
      offset: pagination.offset,
    })

    return createPaginatedResult(data, totalRow?.total ?? 0, pagination)
  }

  static async createTrailer(animeId: number, data: AnimeModel['createTrailer']) {
    const [created] = await db.insert(animeTrailer).values({ animeId, ...data }).returning()
    return created
  }

  static async deleteTrailer(id: number) {
    const [deleted] = await db.delete(animeTrailer).where(eq(animeTrailer.id, id)).returning()
    return deleted ?? null
  }

  static async getAnimeRelations(animeId: number, query?: AnimeRelationListQuery) {
    const pagination = normalizeListQuery(query, relationListDefaults)
    const where = eq(animeRelation.animeId, animeId)

    const [totalRow] = await db.select({ total: count() }).from(animeRelation).where(where)
    const data = await db.query.animeRelation.findMany({
      where,
      orderBy: getRelationOrderBy(pagination.sortBy, pagination.sortOrder),
      limit: pagination.limit,
      offset: pagination.offset,
    })

    return createPaginatedResult(data, totalRow?.total ?? 0, pagination)
  }

  static async createRelation(animeId: number, data: AnimeModel['createRelation']) {
    const [created] = await db.insert(animeRelation).values({ animeId, ...data }).returning()
    return created
  }

  static async deleteRelation(id: number) {
    const [deleted] = await db.delete(animeRelation).where(eq(animeRelation.id, id)).returning()
    return deleted ?? null
  }
}
