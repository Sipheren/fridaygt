import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role?: string
      gamertag?: string
    } & DefaultSession["user"]
  }

  interface User {
    role?: string
    gamertag?: string
  }
}
