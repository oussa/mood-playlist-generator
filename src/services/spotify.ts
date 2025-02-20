import { z } from 'zod';

const spotifyConfig = {
  baseUrl: 'https://api.spotify.com/v1',
};

export interface SpotifyArtist {
  id: string;
  name: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
}

interface SpotifyRecommendationsResponse {
  tracks: SpotifyTrack[];
  seeds: any[];
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
    total: number;
    limit: number;
    offset: number;
  };
}

// Schema for mood-based search parameters
export const MoodSearchSchema = z.object({
  mood: z.enum(['happy', 'sad', 'energetic', 'calm', 'angry']),
  limit: z.number().min(1).max(50).default(20),
});

export type MoodSearchParams = z.infer<typeof MoodSearchSchema>;

// Mapping moods to Spotify audio features
const moodToAudioFeatures = {
  happy: { minValence: 0.7, minEnergy: 0.5 },
  sad: { maxValence: 0.3, maxEnergy: 0.4 },
  energetic: { minEnergy: 0.8, minTempo: 120 },
  calm: { maxEnergy: 0.4, maxTempo: 100 },
  angry: { minEnergy: 0.7, maxValence: 0.4 },
};

export const SearchQuerySchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(50).default(20),
});

export type SearchQueryParams = z.infer<typeof SearchQuerySchema>;

export class SpotifyService {
  private accessToken: string;

  constructor(accessToken: string) {
    if (!accessToken) {
      throw new Error('Access token is required');
    }
    this.accessToken = accessToken;
  }

  async searchByMood({ mood, limit }: MoodSearchParams): Promise<SpotifyRecommendationsResponse> {
    const audioFeatures = moodToAudioFeatures[mood];
    
    // Convert audio features to query parameters
    const queryParams = new URLSearchParams({
      type: 'track',
      limit: limit.toString(),
      market: 'US',
      // Add seed genres based on mood
      seed_genres: this.getMoodGenres(mood).join(','),
      ...this.convertAudioFeaturesToParams(audioFeatures),
    });

    const response = await fetch(`${spotifyConfig.baseUrl}/recommendations?${queryParams}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recommendations from Spotify');
    }

    return response.json();
  }

  private getMoodGenres(mood: string): string[] {
    const genreMap = {
      happy: ['pop', 'dance', 'disco'],
      sad: ['acoustic', 'piano', 'indie'],
      energetic: ['edm', 'rock', 'dance'],
      calm: ['ambient', 'classical', 'chill'],
      angry: ['metal', 'rock', 'punk'],
    };

    return genreMap[mood as keyof typeof genreMap];
  }

  private convertAudioFeaturesToParams(features: Record<string, number>) {
    const paramMap: Record<string, string> = {};
    
    Object.entries(features).forEach(([key, value]) => {
      const paramKey = key.replace(/^(min|max)/, 'target_').toLowerCase();
      paramMap[paramKey] = value.toString();
    });

    return paramMap;
  }

  async searchTracks({ query, limit }: SearchQueryParams): Promise<SpotifyTrack[]> {
    const queryParams = new URLSearchParams({
      type: 'track',
      q: query,
      limit: limit.toString(),
      market: 'US',
    });

    const response = await fetch(`${spotifyConfig.baseUrl}/search?${queryParams}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to search tracks from Spotify');
    }

    const data = await response.json() as SpotifySearchResponse;
    return data.tracks.items;
  }
} 