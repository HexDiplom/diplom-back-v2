import { db } from '@/db'
import { episode } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { EpisodeModel } from './episode.model'

export abstract class EpisodeService {
  static async getEpisodeList(animeId?: number) {
    if (animeId !== undefined) {
      return db.query.episode.findMany({
        where: eq(episode.animeId, animeId),
      })
    }

    return db.select().from(episode)
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
