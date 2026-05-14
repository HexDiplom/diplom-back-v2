import { describe, expect, test } from 'bun:test'
import sharp from 'sharp'
import { ImageUploadService } from './image-upload.service'

class MockStorage {
  puts: Array<{ key: string; body: Buffer; contentType?: string; cacheControl?: string }> = []
  deletedKeys: string[] = []

  async putObject(params: { key: string; body: Buffer; contentType?: string; cacheControl?: string }) {
    this.puts.push(params)
    return {} as any
  }

  getPublicUrl(key: string) {
    return `https://cdn.example.com/${key}`
  }

  async deleteObject(key: string) {
    this.deletedKeys.push(key)
    return {} as any
  }
}

async function createPngFile(width = 32, height = 32) {
  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#ffffff',
    },
  }).png().toBuffer()

  return new File([new Uint8Array(buffer)], 'image.png', { type: 'image/png' })
}

describe('ImageUploadService', () => {
  test('rejects unsupported image types before upload', async () => {
    const storage = new MockStorage()
    const service = new ImageUploadService(storage, () => 'image-id')
    const file = new File(['text'], 'image.txt', { type: 'text/plain' })

    await expect(service.uploadStudioLogo(file, 1)).rejects.toThrow('Unsupported image type')
    expect(storage.puts).toHaveLength(0)
  })

  test('uploads optimized webp images with stable storage keys', async () => {
    const storage = new MockStorage()
    const service = new ImageUploadService(storage, () => 'image-id')

    const result = await service.uploadAvatar(await createPngFile(), 'user-1')
    const uploaded = storage.puts[0]
    const metadata = await sharp(uploaded.body).metadata()

    expect(result.image).toEqual({
      key: 'users/user-1/avatar/image-id.webp',
      url: 'https://cdn.example.com/users/user-1/avatar/image-id.webp',
    })
    expect(uploaded.key).toBe('users/user-1/avatar/image-id.webp')
    expect(uploaded.contentType).toBe('image/webp')
    expect(uploaded.cacheControl).toBe('public, max-age=31536000, immutable')
    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBe(512)
    expect(metadata.height).toBe(512)
  })

  test('uploads anime cover original and generated variants', async () => {
    const storage = new MockStorage()
    const service = new ImageUploadService(storage, () => 'cover-id')

    const result = await service.uploadAnimeCover(await createPngFile(1200, 1600), 42)
    const keys = storage.puts.map(({ key }) => key)
    const variantMetadata = await Promise.all(storage.puts.slice(1).map(({ body }) => sharp(body).metadata()))

    expect(keys).toEqual([
      'anime/42/cover/original/cover-id.png',
      'anime/42/cover/medium/cover-id.webp',
      'anime/42/cover/large/cover-id.webp',
      'anime/42/cover/extraLarge/cover-id.webp',
    ])
    expect(storage.puts[0].contentType).toBe('image/png')
    expect(storage.puts.slice(1).map(({ contentType }) => contentType)).toEqual([
      'image/webp',
      'image/webp',
      'image/webp',
    ])
    expect(result.medium.url).toBe('https://cdn.example.com/anime/42/cover/medium/cover-id.webp')
    expect(result.objects.map(({ key }) => key)).toEqual(keys)
    expect(variantMetadata.map(({ width }) => width)).toEqual([300, 600, 900])
  })
})
