import type { FC } from 'hono/jsx'
import type { SpotifyTrack } from '../types'

export const PlaylistResults: FC<{ tracks: SpotifyTrack[] }> = (props) => {
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
