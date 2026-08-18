import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3333),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Env inválido:", result.error.issues);
  process.exit(1);
}

export const env = result.data;
