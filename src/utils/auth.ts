import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { admin, openAPI, username } from "better-auth/plugins";
import Elysia from "elysia";
import { APIError, createAuthMiddleware } from "better-auth/api";

const PREFIX = '/auth' // Better Auth Prefix (works only if mounted on '/')

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  plugins: [
    openAPI(),
    admin(),
    username(),
  ],
  basePath: PREFIX,
  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://api.anime.freshinsboost.ru",
    "https://api.anime.freshinsboost.ru",
  ],
  emailAndPassword: {
    enabled: true,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-up/email' && ctx.path !== '/update-user') return

      if (!ctx.body.username) {
        throw new APIError('BAD_REQUEST', {
          message: 'Username is required'
        })
      }
    })
  },
  advanced: {
    useSecureCookies: true,

    cookies: {
      session_token: {
        attributes: {
          sameSite: "none",
          secure: true,
          httpOnly: true,
        },
      },
    },
  },
});

export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({
          headers
        })
        if (!session) return status(401)
        return {
          user: session.user,
          session: session.session
        }
      }
    },
    adminAuth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({
          headers
        })
        if (!session) return status(401)
        if (session.user.role !== 'admin') return status(403)
        return {
          user: session.user,
          session: session.session
        }
      }
    }
  })

// Extract schema for OpenAPI (https://elysiajs.com/integrations/better-auth.html)
let _schema: ReturnType<typeof auth.api.generateOpenAPISchema>
const getSchema = async () => (_schema ??= auth.api.generateOpenAPISchema())
export const OpenAPI = {
  getPaths: (prefix = PREFIX) =>
    getSchema().then(({ paths }) => {
      const reference: typeof paths = Object.create(null)
      for (const path of Object.keys(paths)) {
        const key = prefix + path
        reference[key] = paths[path]
        for (const method of Object.keys(paths[path])) {
          const operation = (reference[key] as any)[method]
          operation.tags = ['Better Auth']
        }
      }
      return reference
    }) as Promise<any>,
  components: getSchema().then(({ components }) => components) as Promise<any>
} as const
