import type { FC } from 'hono/jsx'
import { Layout } from './Layout'

export const Home: FC = () => {
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
          class="htmx-indicator fixed inset-0 flex justify-center items-center bg-white/50 pointer-events-none"
        >
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 pointer-events-auto"></div>
        </div>

        <div id="search-results" class="mt-4"></div>
      </div>
    </Layout>
  )
}
