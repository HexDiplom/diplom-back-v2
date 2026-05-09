import { authMiddleware } from '@/utils/auth'
import Elysia, { t } from 'elysia'
import { StudioModel } from './studio.model'
import { StudioService } from './studio.service'

export const studioController = new Elysia({ prefix: '/v1/studio', tags: ['Studio'] })
  .use(authMiddleware)
  .get('/', async () => StudioService.getStudioList())
  .get(
    '/:id',
    async ({ params: { id }, status }) => {
      const item = await StudioService.getStudioById(id)
      if (!item) return status(404)
      return item
    },
    { params: t.Object({ id: t.Numeric() }) }
  )
  .post(
    '/',
    async ({ body }) => StudioService.createStudio(body),
    { body: StudioModel.create, adminAuth: true }
  )
  .put(
    '/:id',
    async ({ params: { id }, body, status }) => {
      const updated = await StudioService.updateStudio(id, body)
      if (!updated) return status(404)
      return updated
    },
    { params: t.Object({ id: t.Numeric() }), body: StudioModel.update, adminAuth: true }
  )
  .delete(
    '/:id',
    async ({ params: { id }, status }) => {
      const deleted = await StudioService.deleteStudio(id)
      if (!deleted) return status(404)
      return deleted
    },
    { params: t.Object({ id: t.Numeric() }), adminAuth: true }
  )
