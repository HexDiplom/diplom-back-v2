import { describe, expect, test } from 'bun:test'
import { deflateSync } from 'node:zlib'
import sharp from 'sharp'
import { ImageUploadService, MAX_IMAGE_PIXELS } from './image-upload.service'

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

  getObjectKeyFromPublicUrl(url: string | null | undefined) {
    const prefix = 'https://cdn.example.com/'
    return url?.startsWith(prefix) ? url.slice(prefix.length) : null
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

function createOversizedPngFile() {
  const width = Math.floor(Math.sqrt(MAX_IMAGE_PIXELS)) + 1
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(width, 4)
  ihdr[8] = 8
  ihdr[9] = 2

  const buffer = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    createPngChunk('IHDR', ihdr),
    createPngChunk('IDAT', deflateSync(Buffer.alloc(0))),
    createPngChunk('IEND', Buffer.alloc(0)),
  ])

  return new File([new Uint8Array(buffer)], 'huge.png', { type: 'image/png' })
}

function createPngChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type)
  const chunk = Buffer.alloc(12 + data.length)
  chunk.writeUInt32BE(data.length, 0)
  typeBuffer.copy(chunk, 4)
  data.copy(chunk, 8)
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length)
  return chunk
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff

  for (const value of buffer) {
    crc = CRC_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index

  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }

  return value >>> 0
})

describe('ImageUploadService', () => {
  test('rejects unsupported image types before upload', async () => {
    const storage = new MockStorage()
    const service = new ImageUploadService(storage, () => 'image-id')
    const file = new File(['text'], 'image.txt', { type: 'text/plain' })

    await expect(service.uploadStudioLogo(file, 1)).rejects.toThrow('Unsupported image type')
    expect(storage.puts).toHaveLength(0)
  })

  test('rejects images over the decoded pixel limit before upload', async () => {
    const storage = new MockStorage()
    const service = new ImageUploadService(storage, () => 'image-id')

    await expect(service.uploadStudioLogo(createOversizedPngFile(), 1)).rejects.toThrow('Image dimensions are too large')
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

  test('deletes only owned old public URLs', async () => {
    const storage = new MockStorage()
    const service = new ImageUploadService(storage, () => 'image-id')

    await service.cleanupPublicUrls([
      'https://cdn.example.com/users/user-1/avatar/old.webp',
      'https://static.example.com/users/user-1/avatar/external.webp',
      'https://cdn.example.com/users/user-1/avatar/old.webp',
      null,
      undefined,
    ])

    expect(storage.deletedKeys).toEqual(['users/user-1/avatar/old.webp'])
  })

  test('queues all old anime cover URLs for deletion', async () => {
    const storage = new MockStorage()
    const service = new ImageUploadService(storage, () => 'cover-id')

    await service.cleanupPublicUrls([
      'https://cdn.example.com/anime/42/cover/original/old.png',
      'https://cdn.example.com/anime/42/cover/medium/old.webp',
      'https://cdn.example.com/anime/42/cover/large/old.webp',
      'https://cdn.example.com/anime/42/cover/extraLarge/old.webp',
    ])

    expect(storage.deletedKeys).toEqual([
      'anime/42/cover/original/old.png',
      'anime/42/cover/medium/old.webp',
      'anime/42/cover/large/old.webp',
      'anime/42/cover/extraLarge/old.webp',
    ])
  })
})
