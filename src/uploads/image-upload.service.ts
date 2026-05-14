import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { garageStorageService, type GarageStorageService } from '@/storage/storage.service'

export const ACCEPTED_IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024

const WEBP_CONTENT_TYPE = 'image/webp'
const WEBP_QUALITY = 85
const CACHE_CONTROL = 'public, max-age=31536000, immutable'

type UploadedObject = {
  key: string
  url: string
}

type WebpImageParams = {
  keyPrefix: string
  width: number
  square?: boolean
}

type ResizeToWebpParams = {
  width: number
  square?: boolean
}

export type UploadedImageResult = {
  image: UploadedObject
  objects: UploadedObject[]
}

export type UploadedAnimeCoverResult = {
  original: UploadedObject
  medium: UploadedObject
  large: UploadedObject
  extraLarge: UploadedObject
  objects: UploadedObject[]
}

type Storage = Pick<GarageStorageService, 'putObject' | 'getPublicUrl' | 'getObjectKeyFromPublicUrl' | 'deleteObject'>

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageUploadError'
  }
}

export class ImageUploadService {
  constructor(
    private readonly storage: Storage = garageStorageService,
    private readonly createId: () => string = randomUUID,
  ) {}

  uploadAvatar(file: File, userId: string) {
    return this.uploadWebpImage(file, {
      keyPrefix: `users/${userId}/avatar`,
      width: 512,
      square: true,
    })
  }

  uploadAnimeBanner(file: File, animeId: number) {
    return this.uploadWebpImage(file, {
      keyPrefix: `anime/${animeId}/banner`,
      width: 1600,
    })
  }

  uploadTrailerThumbnail(file: File, trailerId: number) {
    return this.uploadWebpImage(file, {
      keyPrefix: `anime/trailers/${trailerId}/thumbnail`,
      width: 640,
    })
  }

  uploadStudioLogo(file: File, studioId: number) {
    return this.uploadWebpImage(file, {
      keyPrefix: `studios/${studioId}/logo`,
      width: 512,
    })
  }

  uploadEpisodeThumbnail(file: File, episodeId: string) {
    return this.uploadWebpImage(file, {
      keyPrefix: `episodes/${episodeId}/thumbnail`,
      width: 640,
    })
  }

  async uploadAnimeCover(file: File, animeId: number): Promise<UploadedAnimeCoverResult> {
    const buffer = await this.readImageFile(file)
    const id = this.createId()
    const objects: UploadedObject[] = []

    try {
      const original = await this.uploadBuffer({
        key: `anime/${animeId}/cover/original/${id}.${getImageExtension(file.type)}`,
        body: buffer,
        contentType: file.type,
      })
      objects.push(original)

      const medium = await this.uploadWebpBuffer({
        key: `anime/${animeId}/cover/medium/${id}.webp`,
        body: await resizeToWebp(buffer, { width: 300 }),
      })
      objects.push(medium)

      const large = await this.uploadWebpBuffer({
        key: `anime/${animeId}/cover/large/${id}.webp`,
        body: await resizeToWebp(buffer, { width: 600 }),
      })
      objects.push(large)

      const extraLarge = await this.uploadWebpBuffer({
        key: `anime/${animeId}/cover/extraLarge/${id}.webp`,
        body: await resizeToWebp(buffer, { width: 900 }),
      })
      objects.push(extraLarge)

      return {
        original,
        medium,
        large,
        extraLarge,
        objects,
      }
    } catch (error) {
      await this.cleanupUploadedObjects(objects)
      throw error
    }
  }

  async cleanupUploadedObjects(objects: UploadedObject[]) {
    await Promise.allSettled(objects.map(({ key }) => this.storage.deleteObject(key)))
  }

  async cleanupPublicUrls(urls: Array<string | null | undefined>) {
    const keys = new Set<string>()

    for (const url of urls) {
      const key = this.storage.getObjectKeyFromPublicUrl(url)
      if (key) keys.add(key)
    }

    await Promise.allSettled([...keys].map((key) => this.storage.deleteObject(key)))
  }

  private async uploadWebpImage(file: File, params: WebpImageParams): Promise<UploadedImageResult> {
    const buffer = await this.readImageFile(file)
    const image = await this.uploadWebpBuffer({
      key: `${params.keyPrefix}/${this.createId()}.webp`,
      body: await resizeToWebp(buffer, params),
    })

    return { image, objects: [image] }
  }

  private async readImageFile(file: File): Promise<Buffer> {
    if (!ACCEPTED_IMAGE_CONTENT_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_CONTENT_TYPES)[number])) {
      throw new ImageUploadError('Unsupported image type')
    }
    if (file.size <= 0) {
      throw new ImageUploadError('Image file must not be empty')
    }
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      throw new ImageUploadError('Image file is too large')
    }

    return Buffer.from(await file.arrayBuffer())
  }

  private uploadWebpBuffer(params: { key: string; body: Buffer }) {
    return this.uploadBuffer({
      ...params,
      contentType: WEBP_CONTENT_TYPE,
    })
  }

  private async uploadBuffer(params: { key: string; body: Buffer; contentType: string }): Promise<UploadedObject> {
    await this.storage.putObject({
      key: params.key,
      body: params.body,
      contentType: params.contentType,
      cacheControl: CACHE_CONTROL,
    })

    return {
      key: params.key,
      url: this.storage.getPublicUrl(params.key),
    }
  }
}

async function resizeToWebp(buffer: Buffer, params: ResizeToWebpParams): Promise<Buffer> {
  try {
    const image = sharp(buffer).rotate()
    const resized = params.square
      ? image.resize(params.width, params.width, { fit: 'cover', position: 'center' })
      : image.resize({ width: params.width, withoutEnlargement: true })

    return await resized.webp({ quality: WEBP_QUALITY }).toBuffer()
  } catch {
    throw new ImageUploadError('Uploaded file must be a valid image')
  }
}

function getImageExtension(contentType: string): 'jpg' | 'png' | 'webp' {
  switch (contentType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    default:
      throw new ImageUploadError('Unsupported image type')
  }
}

export const imageUploadService = new ImageUploadService()
