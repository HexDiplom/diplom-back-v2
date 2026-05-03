import { authMiddleware } from "@/utils/auth"
import { paginationQueryProps } from "@/utils/pagination"
import Elysia, { t } from "elysia"
import { AnimeModel } from "./anime.model"
import { AnimeService } from "./anime.service"

const paginationQuery = t.Object(paginationQueryProps)
const paginationWithId = t.Object({ ...paginationQueryProps, id: t.Numeric() })

export const animeController = new Elysia({ prefix: "/v1/anime", tags: ["Anime"] })
  .use(authMiddleware)
  .get(
    '/',
    async ({ query }) => AnimeService.getAnimeList(query),
    { query: paginationQuery }
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
  .get(
    '/:id/trailers',
    async ({ params: { id }, query }) => AnimeService.getAnimeTrailers(id, query),
    { params: t.Object({ id: t.Numeric() }), query: paginationQuery }
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
  .get(
    '/:id/relations',
    async ({ params: { id }, query }) => AnimeService.getAnimeRelations(id, query),
    { params: t.Object({ id: t.Numeric() }), query: paginationQuery }
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
