import openapi, { fromTypes } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { auth, OpenAPI } from "@/utils/auth";
import { animeController } from "./anime/anime.controller";
import { studioController } from "./studio/studio.controller";
import { episodeController } from "./episode/episode.controller";
import { episodeVideoController } from "./episode-video/episode-video.controller";

const app = new Elysia({ serve: { hostname: process.env.HOST ?? '0.0.0.0' } })
  .use(openapi({
    // references: fromTypes(), // FIXME: Создаёт .d.ts файлы рядом с обычными .ts файлами, и вызывает много ошибок
    documentation: {
      components: await OpenAPI.components,
      paths: await OpenAPI.getPaths(),
      tags: [
        { name: "Anime" },
        { name: "Studio" },
        { name: "Episode" },
        { name: "EpisodeVideo" },
      ]
    }
  })) // OpenAPI Documentation
  .mount('/', auth.handler) // Better Auth Mount
  .use(animeController)
  .use(studioController)
  .use(episodeController)
  .use(episodeVideoController)
  .listen(process.env.PORT ?? 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
