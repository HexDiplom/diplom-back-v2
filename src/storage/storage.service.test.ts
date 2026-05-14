import { describe, expect, test } from 'bun:test'
import { S3ServiceException } from '@aws-sdk/client-s3'
import {
  GarageStorageService,
  createGarageStorageConfig,
  normalizeObjectKey,
  type GarageStorageConfig,
} from './storage.service'

const config: GarageStorageConfig = {
  endpoint: 'http://garage.local:3900',
  region: 'garage',
  bucket: 'media',
  accessKeyId: 'access-key',
  secretAccessKey: 'secret-key',
  forcePathStyle: true,
  publicUrl: 'https://cdn.example.com/media/',
  presignedUrlExpiresIn: 900,
}

class MockStorageClient {
  commands: unknown[] = []

  constructor(private handler: (command: any) => unknown | Promise<unknown> = () => ({})) {}

  async send(command: any) {
    this.commands.push(command)
    return this.handler(command)
  }
}

function notFoundError() {
  return new S3ServiceException({
    name: 'NotFound',
    $fault: 'client',
    message: 'Object was not found',
    $metadata: { httpStatusCode: 404 },
  })
}

describe('Garage storage config', () => {
  test('reads env values with Garage defaults', () => {
    const result = createGarageStorageConfig({
      GARAGE_ENDPOINT: ' http://garage.local:3900 ',
      GARAGE_BUCKET: 'media',
      GARAGE_ACCESS_KEY_ID: 'access-key',
      GARAGE_SECRET_ACCESS_KEY: 'secret-key',
    })

    expect(result).toEqual({
      endpoint: 'http://garage.local:3900',
      region: 'garage',
      bucket: 'media',
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-key',
      forcePathStyle: true,
      publicUrl: undefined,
      presignedUrlExpiresIn: 900,
    })
  })

  test('throws on missing required env values', () => {
    expect(() => createGarageStorageConfig({})).toThrow('GARAGE_ENDPOINT')
  })

  test('validates boolean and expiration env values', () => {
    expect(() => createGarageStorageConfig({
      GARAGE_ENDPOINT: 'http://garage.local:3900',
      GARAGE_BUCKET: 'media',
      GARAGE_ACCESS_KEY_ID: 'access-key',
      GARAGE_SECRET_ACCESS_KEY: 'secret-key',
      GARAGE_FORCE_PATH_STYLE: 'maybe',
    })).toThrow('GARAGE_FORCE_PATH_STYLE')

    expect(() => createGarageStorageConfig({
      GARAGE_ENDPOINT: 'http://garage.local:3900',
      GARAGE_BUCKET: 'media',
      GARAGE_ACCESS_KEY_ID: 'access-key',
      GARAGE_SECRET_ACCESS_KEY: 'secret-key',
      GARAGE_PRESIGNED_URL_EXPIRES_IN: '0',
    })).toThrow('GARAGE_PRESIGNED_URL_EXPIRES_IN')
  })
})

describe('GarageStorageService', () => {
  test('normalizes object keys', () => {
    expect(normalizeObjectKey(' /covers/main image.jpg ')).toBe('covers/main image.jpg')
    expect(() => normalizeObjectKey(' / ')).toThrow('must not be empty')
  })

  test('builds encoded public URLs', () => {
    const service = new GarageStorageService(config, new MockStorageClient())

    expect(service.getPublicUrl('/covers/main image.jpg')).toBe('https://cdn.example.com/media/covers/main%20image.jpg')
  })

  test('resolves owned public URLs back to object keys', () => {
    const service = new GarageStorageService(config, new MockStorageClient())

    expect(service.getObjectKeyFromPublicUrl(' https://cdn.example.com/media/covers/main%20image.jpg ')).toBe('covers/main image.jpg')
    expect(service.getObjectKeyFromPublicUrl('https://cdn.example.com/media/covers/main%20image.jpg?v=1')).toBe('covers/main image.jpg')
  })

  test('skips external, malformed and unconfigured public URLs', () => {
    const service = new GarageStorageService(config, new MockStorageClient())
    const serviceWithoutPublicUrl = new GarageStorageService({ ...config, publicUrl: undefined }, new MockStorageClient())

    expect(service.getObjectKeyFromPublicUrl('https://static.example.com/media/covers/main.jpg')).toBeNull()
    expect(service.getObjectKeyFromPublicUrl('https://cdn.example.com/other/covers/main.jpg')).toBeNull()
    expect(service.getObjectKeyFromPublicUrl('https://cdn.example.com/media/%E0%A4%A')).toBeNull()
    expect(service.getObjectKeyFromPublicUrl(null)).toBeNull()
    expect(serviceWithoutPublicUrl.getObjectKeyFromPublicUrl('https://cdn.example.com/media/covers/main.jpg')).toBeNull()
  })

  test('sends put object command with normalized key', async () => {
    const client = new MockStorageClient()
    const service = new GarageStorageService(config, client)

    await service.putObject({
      key: '/covers/poster.jpg',
      body: 'image',
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=3600',
      metadata: { source: 'test' },
    })

    const command = client.commands[0] as any
    expect(command.constructor.name).toBe('PutObjectCommand')
    expect(command.input).toMatchObject({
      Bucket: 'media',
      Key: 'covers/poster.jpg',
      Body: 'image',
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=3600',
      Metadata: { source: 'test' },
    })
  })

  test('returns false when object does not exist', async () => {
    const service = new GarageStorageService(config, new MockStorageClient(() => {
      throw notFoundError()
    }))

    expect(await service.objectExists('/missing.txt')).toBe(false)
  })

  test('maps list objects result to stable output', async () => {
    const lastModified = new Date('2026-05-14T00:00:00.000Z')
    const client = new MockStorageClient(() => ({
      Contents: [
        { Key: 'covers/a.jpg', Size: 12, ETag: '"etag"', LastModified: lastModified },
        { Size: 3 },
      ],
      NextContinuationToken: 'next-page',
    }))
    const service = new GarageStorageService(config, client)

    const result = await service.listObjects({ prefix: '/covers', limit: 25, cursor: 'page-1' })

    const command = client.commands[0] as any
    expect(command.constructor.name).toBe('ListObjectsV2Command')
    expect(command.input).toMatchObject({
      Bucket: 'media',
      Prefix: 'covers',
      MaxKeys: 25,
      ContinuationToken: 'page-1',
    })
    expect(result).toEqual({
      objects: [{ key: 'covers/a.jpg', size: 12, eTag: '"etag"', lastModified }],
      nextCursor: 'next-page',
    })
  })

  test('sends delete object command', async () => {
    const client = new MockStorageClient()
    const service = new GarageStorageService(config, client)

    await service.deleteObject('/covers/a.jpg')

    const command = client.commands[0] as any
    expect(command.constructor.name).toBe('DeleteObjectCommand')
    expect(command.input).toMatchObject({
      Bucket: 'media',
      Key: 'covers/a.jpg',
    })
  })
})
