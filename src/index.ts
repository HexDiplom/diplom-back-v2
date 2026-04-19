import openapi, { fromTypes } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { auth, OpenAPI } from "@/utils/auth";
import { animeController } from "./anime/anime.controller";

const app = new Elysia()
  .use(openapi({
    // references: fromTypes(), // FIXME: Создаёт .d.ts файлы рядом с обычными .ts файлами, и вызывает много ошибок
    documentation: {
      components: await OpenAPI.components,
      paths: await OpenAPI.getPaths(),
      tags: [
        { name: "Anime" }
      ]
    }
  })) // OpenAPI Documentation
  .mount('/', auth.handler) // Better Auth Mount
  .use(animeController)
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
