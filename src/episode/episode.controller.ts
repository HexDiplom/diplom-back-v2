import { authMiddleware } from '@/utils/auth'
import Elysia, { t } from 'elysia'
import { EpisodeModel, type EpisodeListQuery } from './episode.model'
import { EpisodeService } from './episode.service'
import { ImageUploadModel } from '@/uploads/image-upload.model'
import { ImageUploadError, imageUploadService } from '@/uploads/image-upload.service'

export const episodeController = new Elysia({ prefix: '/v1/episode', tags: ['Episode'] })
  .use(authMiddleware)
  .get(
    '/',
    async ({ query }) => EpisodeService.getEpisodeList(query as EpisodeListQuery),
    { query: EpisodeModel.listQuery }
  )
  .get('/:id', async ({ params: { id }, status }) => {
    const item = await EpisodeService.getEpisodeById(id)
    if (!item) return status(404)
    return item
  })
  .post(
    '/',
    async ({ body }) => EpisodeService.createEpisode(body),
    { body: EpisodeModel.create, adminAuth: true }
  )
  .put(
    '/:id',
    async ({ params: { id }, body, status }) => {
      const updated = await EpisodeService.updateEpisode(id, body)
      if (!updated) return status(404)
      return updated
    },
    { body: EpisodeModel.update, adminAuth: true }
  )
  .post(
    '/:id/images/thumbnail',
    async ({ params: { id }, body, status }) => {
      const item = await EpisodeService.getEpisodeById(id)
      if (!item) return status(404)

      try {
        const upload = await imageUploadService.uploadEpisodeThumbnail(body.file, id)

        try {
          const updated = await EpisodeService.updateEpisodeThumbnail(id, upload.image.url)
          if (!updated) {
            await imageUploadService.cleanupUploadedObjects(upload.objects)
            return status(404)
          }
          await imageUploadService.cleanupPublicUrls([item.thumbnailUrl])
          return updated
        } catch (error) {
          await imageUploadService.cleanupUploadedObjects(upload.objects)
          throw error
        }
      } catch (error) {
        if (error instanceof ImageUploadError) return status(400, { message: error.message })
        throw error
      }
    },
    { params: t.Object({ id: t.String() }), body: ImageUploadModel.body, adminAuth: true }
  )
  .delete(
    '/:id',
    async ({ params: { id }, status }) => {
      const deleted = await EpisodeService.deleteEpisode(id)
      if (!deleted) return status(404)
      return deleted
    },
    { adminAuth: true }
  )
