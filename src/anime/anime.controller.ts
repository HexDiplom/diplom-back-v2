import { authMiddleware } from "@/utils/auth";
import Elysia from "elysia";
import { AnimeModel } from "./anime.model";
import { AnimeService } from "./anime.service";

export const animeController = new Elysia({ prefix: "/v1/anime", tags: ["Anime"] })
  .use(authMiddleware)
  .post(
    '/',
    async ({ body }) => {
      return await AnimeService.createAnime(body)
    }, {
      body: AnimeModel.create,
      auth: true,
    }
  )
