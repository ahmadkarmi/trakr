import type { Config } from "jsr:@supabase/functions-js@2"

export const config: Config = {
  regions: ["fra", "cdg", "dub"],
  secure: true,
  auth: {
    verify_jwt: true,
  },
}
