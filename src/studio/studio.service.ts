import { db } from '@/db'
import { studio } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { StudioModel } from './studio.model'

export abstract class StudioService {
  static async getStudioList() {
    return db.select().from(studio)
  }

  static async getStudioById(id: number) {
    const [result] = await db.select().from(studio).where(eq(studio.id, id))
    return result ?? null
  }

  static async createStudio(data: StudioModel['create']) {
    const [created] = await db.insert(studio).values(data).returning()
    return created
  }

  static async updateStudio(id: number, data: StudioModel['update']) {
    const [updated] = await db.update(studio).set(data).where(eq(studio.id, id)).returning()
    return updated ?? null
  }

  static async deleteStudio(id: number) {
    const [deleted] = await db.delete(studio).where(eq(studio.id, id)).returning()
    return deleted ?? null
  }
}
