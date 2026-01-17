# XMaps - GlobePulse

A minimalistic, premium 3D globe visualization for real-time trending topics from X (Twitter) with Grok AI summaries.

![XMaps Preview](https://img.shields.io/badge/Status-Hackathon-00e5ff)

## Features

- 🌍 **Fullscreen 3D Globe** - Interactive wireframe globe with smooth orbit controls
- 📊 **Trending Topics Panel** - Real-time top 15 trending topics with strength indicators
- 🔗 **Topic Arcs** - Visual connections between countries showing topic flow
- 📍 **Country Markers** - Activity indicators scaled by engagement
- 📱 **Side Panel** - Detailed view for countries and topics with evidence
- 🔴 **Live Updates** - SSE/WebSocket support for real-time data

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
```

Edit `.env` and set your backend URL:

```
VITE_API_BASE_URL=http://localhost:3001
```

### 3. Run development server

```bash
npm run dev
```

## Backend API Requirements

The frontend expects these endpoints from your backend:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/summary?window=60m` | GET | Global topics, arcs, and country activity |
| `/api/countries` | GET | List of countries with ISO2 codes and centroids |
| `/api/country/:iso2?window=60m` | GET | Country-specific topics and evidence |
| `/api/topic/:topicId` | GET | Topic details with Grok summary and evidence |
| `/api/stream?window=60m` | GET (SSE) | Live updates stream |
| `/api/ws?window=60m` | WS | WebSocket alternative for live updates |

### Time Windows

- `15m` - Last 15 minutes
- `60m` - Last hour (default)
- `6h` - Last 6 hours

## Live Updates Configuration

### SSE (Default)

Server-Sent Events is enabled by default. Ensure your backend sends events in this format:

```json
{
  "type": "topic_update",
  "data": { "id": "1", "title": "Topic", "score": 0.85, ... },
  "timestamp": "2025-01-17T12:00:00Z"
}
```

### WebSocket

To switch to WebSocket, update the `useLiveFeed` hook call in `Index.tsx`:

```tsx
useLiveFeed({ 
  window: timeWindow, 
  connectionType: 'websocket',  // Change from 'sse' to 'websocket'
  enabled: true 
});
```

## Visual Encoding

### Arc Strength

| Tier | Strength | Appearance |
|------|----------|------------|
| High | ≥ 0.75 | Thick, bright, fast pulse |
| Medium | 0.40–0.74 | Normal, subtle pulse |
| Low | < 0.40 | Thin, faint (hidden if cluttered) |

### Country Markers

- Dot size scales with `activityScore`
- Glow intensity increases with activity
- High activity (> 0.8) shows soft halo

## Tech Stack

- **React 18** + TypeScript
- **Three.js** via @react-three/fiber + drei
- **TanStack Query** for data fetching
- **Zustand** for state management
- **Tailwind CSS** for styling

## Development Notes

- Mock data is used when backend is unavailable
- Arcs limited to top 60 by default for performance
- Uses instanced meshes for country markers

## License

MIT
