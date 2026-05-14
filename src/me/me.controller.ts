import { db } from '@/db'
import { user as userTable } from '@/db/schema'
import { auth, authMiddleware } from '@/utils/auth'
import { ImageUploadModel } from '@/uploads/image-upload.model'
import { ImageUploadError, imageUploadService } from '@/uploads/image-upload.service'
import { eq } from 'drizzle-orm'
import Elysia from 'elysia'

export const meController = new Elysia({ prefix: '/v1/me', tags: ['Me'] })
  .use(authMiddleware)
  .post(
    '/avatar',
    async ({ body, request: { headers }, set, status, user }) => {
      try {
        const upload = await imageUploadService.uploadAvatar(body.file, user.id)

        try {
          const [currentUser] = await db
            .select({ username: userTable.username, image: userTable.image })
            .from(userTable)
            .where(eq(userTable.id, user.id))

          if (!currentUser) {
            await imageUploadService.cleanupUploadedObjects(upload.objects)
            return status(404)
          }

          const authResponse = await auth.api.updateUser({
            body: { image: upload.image.url, username: currentUser.username },
            headers,
            returnHeaders: true,
          })
          authResponse.headers.forEach((value, key) => {
            set.headers[key] = value
          })

          await imageUploadService.cleanupPublicUrls([currentUser.image])
          return { image: upload.image.url }
        } catch (error) {
          await imageUploadService.cleanupUploadedObjects(upload.objects)
          throw error
        }
      } catch (error) {
        if (error instanceof ImageUploadError) return status(400, { message: error.message })
        throw error
      }
    },
    { body: ImageUploadModel.body, auth: true }
  )
