import { authMiddleware } from "@/utils/auth"
import Elysia, { t } from "elysia"
import {
  AnimeModel,
  type AnimeListQuery,
  type AnimeRelationListQuery,
  type AnimeTrailerListQuery,
} from "./anime.model"
import { AnimeService } from "./anime.service"
import { ImageUploadModel } from "@/uploads/image-upload.model"
import { ImageUploadError, imageUploadService } from "@/uploads/image-upload.service"

export const animeController = new Elysia({ prefix: "/v1/anime", tags: ["Anime"] })
  .use(authMiddleware)
  .get(
    '/',
    async ({ query }) => AnimeService.getAnimeList(query as AnimeListQuery),
    { query: AnimeModel.listQuery }
  )
  .get(
    '/:id',
    async ({ params: { id }, status }) => {
      const item = await AnimeService.getAnimeById(id)
      if (!item) return status(404)
      return item
    },
    { params: t.Object({ id: t.Numeric() }) }
  )
  .post(
    '/',
    async ({ body }) => AnimeService.createAnime(body),
    { body: AnimeModel.create, adminAuth: true }
  )
  .put(
    '/:id',
    async ({ params: { id }, body, status }) => {
      const updated = await AnimeService.updateAnime(id, body)
      if (!updated) return status(404)
      return updated
    },
    { params: t.Object({ id: t.Numeric() }), body: AnimeModel.update, adminAuth: true }
  )
  .delete(
    '/:id',
    async ({ params: { id }, status }) => {
      const deleted = await AnimeService.deleteAnime(id)
      if (!deleted) return status(404)
      return deleted
    },
    { params: t.Object({ id: t.Numeric() }), adminAuth: true }
  )
  .put(
    '/:id/title',
    async ({ params: { id }, body, status }) => {
      const updated = await AnimeService.updateAnimeTitle(id, body)
      if (!updated) return status(404)
      return updated
    },
    { params: t.Object({ id: t.Numeric() }), body: AnimeModel.updateTitle, adminAuth: true }
  )
  .put(
    '/:id/cover',
    async ({ params: { id }, body, status }) => {
      const updated = await AnimeService.updateAnimeCover(id, body)
      if (!updated) return status(404)
      return updated
    },
    { params: t.Object({ id: t.Numeric() }), body: AnimeModel.updateCover, adminAuth: true }
  )
  .post(
    '/:id/images/banner',
    async ({ params: { id }, body, status }) => {
      const item = await AnimeService.getAnimeById(id)
      if (!item) return status(404)

      try {
        const upload = await imageUploadService.uploadAnimeBanner(body.file, id)

        try {
          const updated = await AnimeService.updateAnimeBanner(id, upload.image.url)
          if (!updated) {
            await imageUploadService.cleanupUploadedObjects(upload.objects)
            return status(404)
          }
          await imageUploadService.cleanupPublicUrls([item.bannerImage])
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
  .post(
    '/:id/images/cover',
    async ({ params: { id }, body, status }) => {
      const item = await AnimeService.getAnimeById(id)
      if (!item) return status(404)

      try {
        const upload = await imageUploadService.uploadAnimeCover(body.file, id)

        try {
          const updated = await AnimeService.upsertAnimeCoverImages(id, {
            original: upload.original.url,
            medium: upload.medium.url,
            large: upload.large.url,
            extraLarge: upload.extraLarge.url,
          })
          await imageUploadService.cleanupPublicUrls([
            item.coverImage?.original,
            item.coverImage?.medium,
            item.coverImage?.large,
            item.coverImage?.extraLarge,
          ])
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
  .get(
    '/:id/trailers',
    async ({ params: { id }, query }) => AnimeService.getAnimeTrailers(id, query as AnimeTrailerListQuery),
    { params: t.Object({ id: t.Numeric() }), query: AnimeModel.trailerListQuery }
  )
  .post(
    '/:id/trailers',
    async ({ params: { id }, body }) => AnimeService.createTrailer(id, body),
    { params: t.Object({ id: t.Numeric() }), body: AnimeModel.createTrailer, adminAuth: true }
  )
  .delete(
    '/trailers/:trailerId',
    async ({ params: { trailerId }, status }) => {
      const deleted = await AnimeService.deleteTrailer(trailerId)
      if (!deleted) return status(404)
      return deleted
    },
    { params: t.Object({ trailerId: t.Numeric() }), adminAuth: true }
  )
  .post(
    '/trailers/:trailerId/images/thumbnail',
    async ({ params: { trailerId }, body, status }) => {
      const trailer = await AnimeService.getTrailerById(trailerId)
      if (!trailer) return status(404)

      try {
        const upload = await imageUploadService.uploadTrailerThumbnail(body.file, trailerId)

        try {
          const updated = await AnimeService.updateTrailerThumbnail(trailerId, upload.image.url)
          if (!updated) {
            await imageUploadService.cleanupUploadedObjects(upload.objects)
            return status(404)
          }
          await imageUploadService.cleanupPublicUrls([trailer.thumbnailUrl])
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
    { params: t.Object({ trailerId: t.Numeric() }), body: ImageUploadModel.body, adminAuth: true }
  )
  .get(
    '/:id/relations',
    async ({ params: { id }, query }) => AnimeService.getAnimeRelations(id, query as AnimeRelationListQuery),
    { params: t.Object({ id: t.Numeric() }), query: AnimeModel.relationListQuery }
  )
  .post(
    '/:id/relations',
    async ({ params: { id }, body }) => AnimeService.createRelation(id, body),
    { params: t.Object({ id: t.Numeric() }), body: AnimeModel.createRelation, adminAuth: true }
  )
  .delete(
    '/relations/:relationId',
    async ({ params: { relationId }, status }) => {
      const deleted = await AnimeService.deleteRelation(relationId)
      if (!deleted) return status(404)
      return deleted
    },
    { params: t.Object({ relationId: t.Numeric() }), adminAuth: true }
  )
