import { db } from '@/db'
import { episodeVideo } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { EpisodeVideoModel } from './episode-video.model'

export abstract class EpisodeVideoService {
  static async getVideoList(episodeId?: string) {
    if (episodeId !== undefined) {
      return db.query.episodeVideo.findMany({
        where: eq(episodeVideo.episodeId, episodeId),
      })
    }

    return db.select().from(episodeVideo)
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
