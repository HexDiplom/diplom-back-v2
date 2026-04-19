import { db } from '@/db'
import { anime, animeCoverImage, animeTitle } from '@/db/schema'
import { AnimeModel } from '@/anime/anime.model'

export abstract class AnimeService {
  static async createAnime(data: AnimeModel['create']): Promise<AnimeModel['select']> {
    // const [created] = await db.insert(anime).values(data).returning()
    // return created

    const { title, coverImage, ...animeData } = data;

    return await db.transaction(async (tx) => {
      const [createdAnime] = await tx
        .insert(anime)
        .values(animeData)
        .returning()

      const [createdTitle] = await tx
        .insert(animeTitle)
        .values({
          animeId: createdAnime.id,
          ...title,
        })
        .returning()

      const [createdCoverImage] = coverImage ?
        await tx
          .insert(animeCoverImage)
          .values({
            ...coverImage,
            animeId: createdAnime.id,
          })
          .returning()
        : [null]

      return { ...createdAnime, title: createdTitle, coverImage: createdCoverImage }
    })
  }
}
