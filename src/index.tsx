import { instrument } from "@fiberplane/hono-otel";
import { createFiberplane, createOpenAPISpec } from "@fiberplane/hono";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as schema from "./db/schema";
import { SpotifyApi, type MaxInt } from "@spotify/web-api-ts-sdk";
import { PlaylistResults } from "./components/PlaylistResults";
import { Home } from "./components/Home";

type Bindings = {
  DB: D1Database;
  AI: Ai;
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', (c) => {
  return c.html(<Home />)
})

app.post("/api/search", async (c) => {
  const body = await c.req.parseBody();
  const mood = body.query;

  let searchTerms = mood;
  try {
    const model = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
    const prompt = `create music search terms based on the selected mood "${mood}". Don't output anything other than the terms; no extra explanations or follow up questions. No more than 3 words for the complete output.`;

    const data = await c.env.AI.run(model, {
      prompt,
      max_tokens: 50,
      temperature: 0.75,
    }) as { response: string };

    if (data.response) {
      searchTerms = data.response;
    }

    console.log(searchTerms);
  } catch (e) {
    console.error(e);
  }

  const limit = parseInt(body.limit as string) as MaxInt<50>;
  const market = "DE";

  try {
    console.log(`Searching Spotify for ${searchTerms}...`);

    const api = SpotifyApi.withClientCredentials(
        c.env.SPOTIFY_CLIENT_ID,
        c.env.SPOTIFY_CLIENT_SECRET
    );

    const items = await api.search(searchTerms as string, ["track"], market, limit);

    console.table(items.tracks.items.map((item) => ({
        name: item.name,
        artists: item.artists.map((artist) => artist.name).join(", "),
        preview_url: item.preview_url,
    })));

    const tracks = items.tracks.items;

    return c.html(<PlaylistResults tracks={tracks} />);
  } catch (error) {
    return c.html(
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
        Failed to search tracks. Please try again.
      </div>
    );
  }
});

app.get("/api/users", async (c) => {
  const db = drizzle(c.env.DB);
  const users = await db.select().from(schema.users);
  return c.json({ users });
});

app.post("/api/user", async (c) => {
  const db = drizzle(c.env.DB);
  const { name, email } = await c.req.json();

  const [newUser] = await db.insert(schema.users).values({
    name: name,
    email: email,
  }).returning();

  return c.json(newUser);
});

/**
 * Serve a simplified api specification for your API
 * As of writing, this is just the list of routes and their methods.
 */
app.get("/openapi.json", c => {
  // @ts-expect-error - @fiberplane/hono is in beta and still not typed correctly
  return c.json(createOpenAPISpec(app, {
    openapi: "3.0.0",
    info: {
      title: "Honc D1 App",
      version: "1.0.0",
    },
  }))
});

/**
 * Mount the Fiberplane api explorer to be able to make requests against your API.
 * 
 * Visit the explorer at `/fp`
 */
app.use("/fp/*", createFiberplane({
  openapi: { url: "/openapi.json" }
}));

export default app;

// Export the instrumented app if you've wired up a Fiberplane-Hono-OpenTelemetry trace collector
//
// export default instrument(app);
