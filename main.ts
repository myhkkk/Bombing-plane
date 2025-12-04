import { Hono } from "https://deno.land/x/hono@v3.12.0/mod.ts";
import { serveStatic } from "https://deno.land/x/hono@v3.12.0/middleware.ts";

const app = new Hono();

app.use("/*", serveStatic({ root: "./dist" }));

Deno.serve(app.fetch);
