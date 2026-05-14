import { t } from 'elysia'
import { ACCEPTED_IMAGE_CONTENT_TYPES, MAX_IMAGE_FILE_SIZE } from './image-upload.service'

export const ImageUploadModel = {
  body: t.Object({
    file: t.File({
      type: [...ACCEPTED_IMAGE_CONTENT_TYPES],
      maxSize: MAX_IMAGE_FILE_SIZE,
    }),
  }),
}
