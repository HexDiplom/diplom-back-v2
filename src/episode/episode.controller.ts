import { authMiddleware } from '@/utils/auth'
import Elysia, { t } from 'elysia'
import { EpisodeModel } from './episode.model'
import { EpisodeService } from './episode.service'

export const episodeController = new Elysia({ prefix: '/v1/episode', tags: ['Episode'] })
  .use(authMiddleware)
  .get(
    '/',
    async ({ query: { animeId } }) => EpisodeService.getEpisodeList(animeId),
    { query: t.Object({ animeId: t.Optional(t.Numeric()) }) }
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
  .delete(
    '/:id',
    async ({ params: { id }, status }) => {
      const deleted = await EpisodeService.deleteEpisode(id)
      if (!deleted) return status(404)
      return deleted
    },
    { adminAuth: true }
  )
