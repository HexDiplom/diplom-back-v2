import { db } from '@/db'
import { episode } from '@/db/schema'
import {
  createPaginatedResult,
  normalizeListQuery,
  ordered,
  orderedNullsLast,
  type SortOrder,
} from '@/utils/pagination'
import { count, eq, type SQL } from 'drizzle-orm'
import type { EpisodeListQuery, EpisodeModel } from './episode.model'

const episodeListDefaults = { sortBy: 'number', sortOrder: 'asc' } as const

function getEpisodeOrderBy(sortBy: NonNullable<EpisodeListQuery['sortBy']>, sortOrder: SortOrder): SQL[] {
  switch (sortBy) {
    case 'name':
      return [orderedNullsLast(episode.name, sortOrder), ordered(episode.id, 'asc')]
    case 'animeId':
      return [ordered(episode.animeId, sortOrder), ordered(episode.id, 'asc')]
    case 'id':
      return [ordered(episode.id, sortOrder)]
    case 'number':
    default:
      return [ordered(episode.number, sortOrder), ordered(episode.id, 'asc')]
  }
}

export abstract class EpisodeService {
  static async getEpisodeList(query?: EpisodeListQuery) {
    const pagination = normalizeListQuery(query, episodeListDefaults)
    const where = query?.animeId !== undefined ? eq(episode.animeId, query.animeId) : undefined

    const [totalRow] = where
      ? await db.select({ total: count() }).from(episode).where(where)
      : await db.select({ total: count() }).from(episode)
    const data = await db.query.episode.findMany({
      where,
      orderBy: getEpisodeOrderBy(pagination.sortBy, pagination.sortOrder),
      limit: pagination.limit,
      offset: pagination.offset,
    })

    return createPaginatedResult(data, totalRow?.total ?? 0, pagination)
  }

  static async getEpisodeById(id: string) {
    return db.query.episode.findFirst({
      where: eq(episode.id, id),
      with: { videos: true },
    })
  }

  static async createEpisode(data: EpisodeModel['create']) {
    const [created] = await db.insert(episode).values(data).returning()
    return created
  }

  static async updateEpisode(id: string, data: EpisodeModel['update']) {
    const [updated] = await db.update(episode).set(data).where(eq(episode.id, id)).returning()
    return updated ?? null
  }

  static async deleteEpisode(id: string) {
    const [deleted] = await db.delete(episode).where(eq(episode.id, id)).returning()
    return deleted ?? null
  }
}
