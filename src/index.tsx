import { instrument } from "@fiberplane/hono-otel";
import { createFiberplane, createOpenAPISpec } from "@fiberplane/hono";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import type { FC } from 'hono/jsx'
import * as schema from "./db/schema";
import { SpotifyService, MoodSearchSchema, SearchQuerySchema, type SpotifyTrack } from "./services/spotify";

type Bindings = {
  DB: D1Database;
  AI: Ai;
  SPOTIFY_ACCESS_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

const Layout: FC = (props) => {
  return (
    <html>
      <head>
        <title>Mood Playlist Generator</title>
        <script src="https://unpkg.com/htmx.org@1.9.10"></script>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      </head>
      <body class="bg-gray-100 min-h-screen">
        <div class="container mx-auto px-4 py-8">
          {props.children}
        </div>
      </body>
    </html>
  )
}

const Home: FC = () => {
  return (
    <Layout>
      <div class="max-w-2xl mx-auto">
        <h1 class="text-4xl font-bold text-center mb-8">Mood Playlist Generator</h1>
        
        {/* Search Form */}
        <div class="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 class="text-2xl font-semibold mb-4">Generate by Mood</h2>
          <form 
            hx-post="/api/search" 
            hx-target="#search-results" 
            hx-indicator="#loading"
            class="space-y-4"
          >
            <div>
              <label class="block text-sm font-medium text-gray-700">Select your mood</label>
              <select name="query" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                <option value="happy">Happy</option>
                <option value="sad">Sad</option>
                <option value="energetic">Energetic</option>
                <option value="calm">Calm</option>
                <option value="angry">Angry</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Number of songs</label>
              <input 
                type="number" 
                name="limit" 
                value="20" 
                min="1" 
                max="50" 
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <button 
              type="submit" 
              class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Generate Playlist
            </button>
          </form>
        </div>

        {/* Loading Spinner */}
        <div 
          id="loading" 
          class="htmx-indicator flex justify-center items-center my-8"
        >
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>

        <div id="search-results" class="mt-4"></div>
      </div>
    </Layout>
  )
}

const PlaylistResults: FC<{ tracks: SpotifyTrack[] }> = (props) => {
  return (
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-2xl font-semibold mb-4">Your Playlist</h2>
      <div class="space-y-6">
        {props.tracks.map((track, index) => (
          <div class="p-4 border rounded-lg hover:bg-gray-50">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center space-x-4">
                <span class="text-gray-500 font-medium">{index + 1}.</span>
                <div>
                  <h3 class="font-medium">{track.name}</h3>
                  <p class="text-sm text-gray-600">{track.artists[0].name}</p>
                </div>
              </div>
              <a 
                href={track.external_urls.spotify} 
                target="_blank" 
                rel="noopener noreferrer"
                class="text-indigo-600 hover:text-indigo-800 text-sm"
              >
                Open in Spotify
              </a>
            </div>
            
            <div class="w-full">
              <iframe
                src={`https://open.spotify.com/embed/track/${track.id}`}
                width="100%"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                class="rounded-md"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

app.get('/', (c) => {
  return c.html(<Home />)
})

app.post("/api/playlist", async (c) => {
  const body = await c.req.parseBody();
  const params = MoodSearchSchema.parse({
    mood: body.mood,
    limit: parseInt(body.limit as string),
  });

  try {
    const spotifyService = new SpotifyService(c.env.SPOTIFY_ACCESS_TOKEN);
    const result = await spotifyService.searchByMood(params);
    return c.html(<PlaylistResults tracks={result.tracks} />);
  } catch (error) {
    return c.html(
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
        Failed to generate playlist. Please try again.
      </div>
    );
  }
});

app.post("/api/search", async (c) => {
  const body = await c.req.parseBody();
  const mood = body.query;

  let searchTerms = mood;
  try {
    const model = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
    const prompt = `create music search terms based on the selected mood "${mood}". Don't output anything other than the terms; no extra explanations or follow up questions. No more than 3 words for the complete output.`;

    const data = await c.env.AI.run(model, {
      prompt
    }) as { response: string };

    if (data.response) {
      searchTerms = data.response;
    }

    console.log(searchTerms);
  } catch (e) {
    console.error(e);
  }

  const params = SearchQuerySchema.parse({
    query: searchTerms,
    limit: parseInt(body.limit as string),
  });

  try {
    const spotifyService = new SpotifyService(c.env.SPOTIFY_ACCESS_TOKEN);
    const tracks = await spotifyService.searchTracks(params);
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
