import { authMiddleware } from '@/utils/auth'
import Elysia, { t } from 'elysia'
import { StudioModel, type StudioListQuery } from './studio.model'
import { StudioService } from './studio.service'
import { ImageUploadModel } from '@/uploads/image-upload.model'
import { ImageUploadError, imageUploadService } from '@/uploads/image-upload.service'

export const studioController = new Elysia({ prefix: '/v1/studio', tags: ['Studio'] })
  .use(authMiddleware)
  .get(
    '/',
    async ({ query }) => StudioService.getStudioList(query as StudioListQuery),
    { query: StudioModel.listQuery }
  )
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
  .post(
    '/:id/images/logo',
    async ({ params: { id }, body, status }) => {
      const item = await StudioService.getStudioById(id)
      if (!item) return status(404)

      try {
        const upload = await imageUploadService.uploadStudioLogo(body.file, id)

        try {
          const updated = await StudioService.updateStudioLogo(id, upload.image.url)
          if (!updated) {
            await imageUploadService.cleanupUploadedObjects(upload.objects)
            return status(404)
          }
          await imageUploadService.cleanupPublicUrls([item.logo])
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
    { params: t.Object({ id: t.Numeric() }), body: ImageUploadModel.body, adminAuth: true }
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
