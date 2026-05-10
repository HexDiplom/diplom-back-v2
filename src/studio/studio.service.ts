import { db } from '@/db'
import { studio } from '@/db/schema'
import { createPaginatedResult, normalizeListQuery, ordered } from '@/utils/pagination'
import { count, eq } from 'drizzle-orm'
import type { StudioListQuery, StudioModel } from './studio.model'

const studioListDefaults = { sortBy: 'id', sortOrder: 'asc' } as const

export abstract class StudioService {
  static async getStudioList(query?: StudioListQuery) {
    const pagination = normalizeListQuery(query, studioListDefaults)

    const [totalRow] = await db.select({ total: count() }).from(studio)
    const data = await db
      .select()
      .from(studio)
      .orderBy(ordered(studio.id, pagination.sortOrder))
      .limit(pagination.limit)
      .offset(pagination.offset)

    return createPaginatedResult(data, totalRow?.total ?? 0, pagination)
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
