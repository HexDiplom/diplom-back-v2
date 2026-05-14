import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
  type GetObjectCommandOutput,
  type ListObjectsV2CommandOutput,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

type Env = Record<string, string | undefined>
type StorageClient = Pick<S3Client, 'send'>

export type GarageStorageConfig = {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
  publicUrl?: string
  presignedUrlExpiresIn: number
}

export type PutObjectParams = {
  key: string
  body: NonNullable<PutObjectCommandInput['Body']>
  contentType?: string
  cacheControl?: string
  metadata?: Record<string, string>
}

export type ListObjectsParams = {
  prefix?: string
  limit?: number
  cursor?: string
}

export type ListObjectsResult = {
  objects: Array<{
    key: string
    size?: number
    eTag?: string
    lastModified?: Date
  }>
  nextCursor?: string
}

export type PresignedPutUrlParams = {
  key: string
  contentType?: string
  expiresInSeconds?: number
}

const DEFAULT_REGION = 'garage'
const DEFAULT_PRESIGNED_URL_EXPIRES_IN = 900

function readRequiredEnv(env: Env, name: string): string {
  const value = env[name]?.trim()
  if (!value) throw new Error(`Missing required env variable ${name}`)
  return value
}

function readBooleanEnv(value: string | undefined, defaultValue: boolean, name: string): boolean {
  if (value === undefined || value.trim() === '') return defaultValue

  switch (value.trim().toLowerCase()) {
    case '1':
    case 'true':
    case 'yes':
    case 'on':
      return true
    case '0':
    case 'false':
    case 'no':
    case 'off':
      return false
    default:
      throw new Error(`${name} must be a boolean value`)
  }
}

function readPositiveIntegerEnv(value: string | undefined, defaultValue: number, name: string): number {
  if (value === undefined || value.trim() === '') return defaultValue

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }

  return parsed
}

export function createGarageStorageConfig(env: Env = process.env): GarageStorageConfig {
  return {
    endpoint: readRequiredEnv(env, 'GARAGE_ENDPOINT'),
    region: env.GARAGE_REGION?.trim() || DEFAULT_REGION,
    bucket: readRequiredEnv(env, 'GARAGE_BUCKET'),
    accessKeyId: readRequiredEnv(env, 'GARAGE_ACCESS_KEY_ID'),
    secretAccessKey: readRequiredEnv(env, 'GARAGE_SECRET_ACCESS_KEY'),
    forcePathStyle: readBooleanEnv(env.GARAGE_FORCE_PATH_STYLE, true, 'GARAGE_FORCE_PATH_STYLE'),
    publicUrl: env.GARAGE_PUBLIC_URL?.trim() || undefined,
    presignedUrlExpiresIn: readPositiveIntegerEnv(
      env.GARAGE_PRESIGNED_URL_EXPIRES_IN,
      DEFAULT_PRESIGNED_URL_EXPIRES_IN,
      'GARAGE_PRESIGNED_URL_EXPIRES_IN',
    ),
  }
}

export function normalizeObjectKey(key: string): string {
  const normalized = key.trim().replace(/^\/+/, '')
  if (!normalized) throw new Error('Storage object key must not be empty')
  return normalized
}

function normalizeObjectPrefix(prefix: string): string | undefined {
  return prefix.trim().replace(/^\/+/, '') || undefined
}

function isNotFoundError(error: unknown): boolean {
  if (error instanceof S3ServiceException) {
    return error.name === 'NoSuchKey' || error.name === 'NotFound' || error.$metadata.httpStatusCode === 404
  }

  return false
}

export class GarageStorageService {
  private client?: StorageClient
  private config?: GarageStorageConfig

  constructor(config?: GarageStorageConfig, client?: StorageClient) {
    this.config = config
    this.client = client
  }

  async putObject(params: PutObjectParams) {
    const { bucket } = this.getConfig()

    return this.getClient().send(new PutObjectCommand({
      Bucket: bucket,
      Key: normalizeObjectKey(params.key),
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: params.cacheControl,
      Metadata: params.metadata,
    }))
  }

  async getObject(key: string): Promise<GetObjectCommandOutput | null> {
    const { bucket } = this.getConfig()

    try {
      return await this.getClient().send(new GetObjectCommand({
        Bucket: bucket,
        Key: normalizeObjectKey(key),
      }))
    } catch (error) {
      if (isNotFoundError(error)) return null
      throw error
    }
  }

  async deleteObject(key: string) {
    const { bucket } = this.getConfig()

    return this.getClient().send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: normalizeObjectKey(key),
    }))
  }

  async objectExists(key: string): Promise<boolean> {
    const { bucket } = this.getConfig()

    try {
      await this.getClient().send(new HeadObjectCommand({
        Bucket: bucket,
        Key: normalizeObjectKey(key),
      }))
      return true
    } catch (error) {
      if (isNotFoundError(error)) return false
      throw error
    }
  }

  async listObjects(params: ListObjectsParams = {}): Promise<ListObjectsResult> {
    const { bucket } = this.getConfig()
    const prefix = params.prefix ? normalizeObjectPrefix(params.prefix) : undefined
    const maxKeys = params.limit ? Math.min(1000, Math.max(1, Math.trunc(params.limit))) : undefined

    const result = await this.getClient().send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
      ContinuationToken: params.cursor,
    })) as ListObjectsV2CommandOutput

    return {
      objects: result.Contents?.flatMap((item) => item.Key ? [{
        key: item.Key,
        size: item.Size,
        eTag: item.ETag,
        lastModified: item.LastModified,
      }] : []) ?? [],
      nextCursor: result.NextContinuationToken,
    }
  }

  getPublicUrl(key: string): string {
    const { publicUrl } = this.getConfig()
    if (!publicUrl) throw new Error('GARAGE_PUBLIC_URL is required to build public object URLs')

    return `${publicUrl.replace(/\/+$/, '')}/${encodeObjectKey(normalizeObjectKey(key))}`
  }

  createPresignedGetUrl(key: string, expiresInSeconds?: number): Promise<string> {
    const config = this.getConfig()

    return getSignedUrl(
      this.getS3Client(),
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: normalizeObjectKey(key),
      }),
      { expiresIn: expiresInSeconds ?? config.presignedUrlExpiresIn },
    )
  }

  createPresignedPutUrl(params: PresignedPutUrlParams): Promise<string> {
    const config = this.getConfig()

    return getSignedUrl(
      this.getS3Client(),
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: normalizeObjectKey(params.key),
        ContentType: params.contentType,
      }),
      { expiresIn: params.expiresInSeconds ?? config.presignedUrlExpiresIn },
    )
  }

  private getConfig(): GarageStorageConfig {
    return this.config ??= createGarageStorageConfig()
  }

  private getClient(): StorageClient {
    return this.client ??= this.createClient()
  }

  private getS3Client(): S3Client {
    const client = this.getClient()
    if (!(client instanceof S3Client)) {
      throw new Error('Presigned URLs require a real S3Client instance')
    }

    return client
  }

  private createClient(): S3Client {
    const config = this.getConfig()

    return new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }
}

function encodeObjectKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/')
}

export const garageStorageService = new GarageStorageService()
