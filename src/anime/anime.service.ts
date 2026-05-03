import { db } from '@/db'
import { anime, animeCoverImage, animeTitle, animeTrailer, animeRelation } from '@/db/schema'
import { AnimeModel, AnimeWithDetails } from '@/anime/anime.model'
import { eq } from 'drizzle-orm'
import { getPagination, getOrderExpr, resolveSortColumn, count, type PaginationParams, type PaginatedResult } from '@/utils/pagination'

const ANIME_SORT_COLS = {
  id: anime.id,
  createdAt: anime.createdAt,
  updatedAt: anime.updatedAt,
  seasonYear: anime.seasonYear,
  episodes: anime.episodes,
  duration: anime.duration,
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

  static async getAnimeList(params: PaginationParams): Promise<PaginatedResult<any>> {
    const { page, limit, offset } = getPagination(params)
    const orderExpr = getOrderExpr(resolveSortColumn(params.sortBy, ANIME_SORT_COLS, anime.id), params.order)

    const [data, [{ total }]] = await Promise.all([
      db.query.anime.findMany({
        with: { title: true, coverImage: true },
        limit,
        offset,
        orderBy: orderExpr,
      }),
      db.select({ total: count() }).from(anime),
    ])

    return { data, total, page, limit }
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

  static async getAnimeTrailers(animeId: number, params: PaginationParams): Promise<PaginatedResult<any>> {
    const { page, limit, offset } = getPagination(params)
    const orderExpr = getOrderExpr(animeTrailer.id, params.order)

    const [data, [{ total }]] = await Promise.all([
      db.query.animeTrailer.findMany({
        where: eq(animeTrailer.animeId, animeId),
        limit,
        offset,
        orderBy: orderExpr,
      }),
      db.select({ total: count() }).from(animeTrailer).where(eq(animeTrailer.animeId, animeId)),
    ])

    return { data, total, page, limit }
  }

  static async createTrailer(animeId: number, data: AnimeModel['createTrailer']) {
    const [created] = await db.insert(animeTrailer).values({ animeId, ...data }).returning()
    return created
  }

  static async deleteTrailer(id: number) {
    const [deleted] = await db.delete(animeTrailer).where(eq(animeTrailer.id, id)).returning()
    return deleted ?? null
  }

  static async getAnimeRelations(animeId: number, params: PaginationParams): Promise<PaginatedResult<any>> {
    const { page, limit, offset } = getPagination(params)
    const orderExpr = getOrderExpr(animeRelation.id, params.order)

    const [data, [{ total }]] = await Promise.all([
      db.query.animeRelation.findMany({
        where: eq(animeRelation.animeId, animeId),
        limit,
        offset,
        orderBy: orderExpr,
      }),
      db.select({ total: count() }).from(animeRelation).where(eq(animeRelation.animeId, animeId)),
    ])

    return { data, total, page, limit }
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
