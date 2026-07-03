if (typeof window !== "undefined") {
  throw new Error("lib/env/server can only be imported on the server");
}

import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().min(1, "MERCADO_PAGO_ACCESS_TOKEN is required"),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().min(1, "MERCADO_PAGO_WEBHOOK_SECRET is required"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  GITHUB_REPO: z.string().optional(),
  VERCEL_PROJECT_ID: z.string().optional(),
  VERCEL_TEAM_ID: z.string().optional(),
});

const serverEnvResult = serverEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  MERCADO_PAGO_ACCESS_TOKEN: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  MERCADO_PAGO_WEBHOOK_SECRET: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  GITHUB_REPO: process.env.GITHUB_REPO,
  VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
  VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID,
});

if (!serverEnvResult.success) {
  const formatted = serverEnvResult.error.flatten().fieldErrors;
  const message = Object.entries(formatted)
    .map(([key, errors]) => `${key}: ${errors?.join(", ")}`)
    .join("\n");
  throw new Error(`Invalid server env vars:\n${message}`);
}

export const serverEnv = serverEnvResult.data;
