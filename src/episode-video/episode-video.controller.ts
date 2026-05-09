import { authMiddleware } from '@/utils/auth'
import Elysia, { t } from 'elysia'
import { EpisodeVideoModel } from './episode-video.model'
import { EpisodeVideoService } from './episode-video.service'

export const episodeVideoController = new Elysia({ prefix: '/v1/episode-video', tags: ['EpisodeVideo'] })
  .use(authMiddleware)
  .get(
    '/',
    async ({ query: { episodeId } }) => EpisodeVideoService.getVideoList(episodeId),
    { query: t.Object({ episodeId: t.Optional(t.String()) }) }
  )
  .get('/:id', async ({ params: { id }, status }) => {
    const item = await EpisodeVideoService.getVideoById(id)
    if (!item) return status(404)
    return item
  })
  .post(
    '/',
    async ({ body }) => EpisodeVideoService.createVideo(body),
    { body: EpisodeVideoModel.create, adminAuth: true }
  )
  .put(
    '/:id',
    async ({ params: { id }, body, status }) => {
      const updated = await EpisodeVideoService.updateVideo(id, body)
      if (!updated) return status(404)
      return updated
    },
    { body: EpisodeVideoModel.update, adminAuth: true }
  )
  .delete(
    '/:id',
    async ({ params: { id }, status }) => {
      const deleted = await EpisodeVideoService.deleteVideo(id)
      if (!deleted) return status(404)
      return deleted
    },
    { adminAuth: true }
  )
