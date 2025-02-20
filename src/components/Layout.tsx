import type { FC } from 'hono/jsx'

export const Layout: FC = (props) => {
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
