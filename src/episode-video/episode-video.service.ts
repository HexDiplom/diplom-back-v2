import { db } from '@/db'
import { episodeVideo } from '@/db/schema'
import {
  createPaginatedResult,
  normalizeListQuery,
  ordered,
  orderedNullsLast,
  type SortOrder,
} from '@/utils/pagination'
import { count, eq, type SQL } from 'drizzle-orm'
import type { EpisodeVideoListQuery, EpisodeVideoModel } from './episode-video.model'

const videoListDefaults = { sortBy: 'id', sortOrder: 'asc' } as const

function getVideoOrderBy(sortBy: NonNullable<EpisodeVideoListQuery['sortBy']>, sortOrder: SortOrder): SQL[] {
  switch (sortBy) {
    case 'voiceoverName':
      return [orderedNullsLast(episodeVideo.voiceoverName, sortOrder), ordered(episodeVideo.id, 'asc')]
    case 'status':
      return [orderedNullsLast(episodeVideo.status, sortOrder), ordered(episodeVideo.id, 'asc')]
    case 'container':
      return [orderedNullsLast(episodeVideo.container, sortOrder), ordered(episodeVideo.id, 'asc')]
    case 'episodeId':
      return [ordered(episodeVideo.episodeId, sortOrder), ordered(episodeVideo.id, 'asc')]
    case 'id':
    default:
      return [ordered(episodeVideo.id, sortOrder)]
  }
}

export abstract class EpisodeVideoService {
  static async getVideoList(query?: EpisodeVideoListQuery) {
    const pagination = normalizeListQuery(query, videoListDefaults)
    const where = query?.episodeId !== undefined ? eq(episodeVideo.episodeId, query.episodeId) : undefined

    const [totalRow] = where
      ? await db.select({ total: count() }).from(episodeVideo).where(where)
      : await db.select({ total: count() }).from(episodeVideo)
    const data = await db.query.episodeVideo.findMany({
      where,
      orderBy: getVideoOrderBy(pagination.sortBy, pagination.sortOrder),
      limit: pagination.limit,
      offset: pagination.offset,
    })

    return createPaginatedResult(data, totalRow?.total ?? 0, pagination)
  }

  static async getVideoById(id: string) {
    const [result] = await db.select().from(episodeVideo).where(eq(episodeVideo.id, id))
    return result ?? null
  }

  static async createVideo(data: EpisodeVideoModel['create']) {
    const [created] = await db.insert(episodeVideo).values(data).returning()
    return created
  }

  static async updateVideo(id: string, data: EpisodeVideoModel['update']) {
    const [updated] = await db.update(episodeVideo).set(data).where(eq(episodeVideo.id, id)).returning()
    return updated ?? null
  }

  static async deleteVideo(id: string) {
    const [deleted] = await db.delete(episodeVideo).where(eq(episodeVideo.id, id)).returning()
    return deleted ?? null
  }
}
