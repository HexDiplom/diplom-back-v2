import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { admin, openAPI, username } from "better-auth/plugins";
import Elysia from "elysia";

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
  emailAndPassword: {
    enabled: true,
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