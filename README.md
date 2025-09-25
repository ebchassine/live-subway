# NYC Subway Live Map

A real-time NYC subway train tracking application built with React, Vite, and Google Maps. Shows live train positions, subway routes, and station information with smooth animations and automatic updates.

![NYC Subway Live Map](https://via.placeholder.com/800x400/0039A6/FFFFFF?text=NYC+Subway+Live+Map)

## Features

- **Real-time train tracking** - Live positions from MTA GTFS-RT feeds
- **Interactive map** - Google Maps with subway routes and stations
- **Smooth animations** - Trains move smoothly between position updates
- **Route selection** - Switch between different subway lines (A, C, E, 1, 4, 6, L, N, Q, R)
- **Customizable refresh intervals** - 5s, 10s, 15s, or 30s updates
- **Connection status** - Visual indicators for API connectivity
- **Keyboard shortcuts** - Quick route switching and controls
- **Responsive design** - Works on desktop and mobile devices

## Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm** - Comes with Node.js
- **Google Maps API Key** - [Get one here](https://developers.google.com/maps/documentation/javascript/get-api-key)
- **MTA GTFS Static Data** - [Download here](http://web.mta.info/developers/data/nyct/subway/google_transit.zip)

## Quick Start

### 1. Clone and Install

\`\`\`bash
git clone <your-repo-url>
cd nyc-subway-map
npm install
\`\`\`

### 2. Configure Environment

\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env` and add your Google Maps API key:

\`\`\`env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
\`\`\`

### 3. Prepare Data (Optional)

The app includes sample data for routes A and 1. To add more routes:

1. Download GTFS static data: http://web.mta.info/developers/data/nyct/subway/google_transit.zip
2. Extract to `./gtfs-data/`
3. Run preprocessing:

\`\`\`bash
npm run preprocess
\`\`\`

### 4. Start Development Server

\`\`\`bash
npm run dev
\`\`\`

Open http://localhost:3000 to view the app.

## Google Maps API Setup

### Getting an API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Maps JavaScript API**
4. Create credentials → API Key
5. Copy the API key to your `.env` file

### Securing Your API Key

**Important**: Restrict your API key to prevent unauthorized usage:

1. In Google Cloud Console, go to **APIs & Services** → **Credentials**
2. Click on your API key
3. Under **Application restrictions**, select **HTTP referrers**
4. Add these referrers:
   - `http://localhost:3000/*` (for development)
   - `https://yourdomain.com/*` (for production)
   - `https://*.vercel.app/*` (if deploying to Vercel)

**Note**: The Google Maps JavaScript API doesn't have a separate "Maps SDK" toggle - the HTTP referrer restriction is the primary security method for web applications.

## Architecture

### Frontend (React + Vite)

- **React 18** with functional components and hooks
- **Vite** for fast development and building
- **@react-google-maps/api** for Google Maps integration
- **@tanstack/react-query** for data fetching and caching
- **Tailwind CSS** for styling

### Backend (Vercel Functions)

- **Node.js 18+** serverless functions
- **gtfs-realtime-bindings** for protobuf decoding
- **CORS enabled** for cross-origin requests
- **In-memory caching** (10s) to reduce MTA API calls

### Data Flow

1. **Frontend** requests vehicle data for selected route
2. **Backend** fetches GTFS-RT from MTA endpoint
3. **Backend** decodes protobuf and filters by route
4. **Frontend** receives JSON data and animates train positions
5. **Process repeats** every 5-30 seconds (configurable)

## API Endpoints

### GET /api/vehicles?feed={feedGroup}

Returns live train positions for a feed group.

**Parameters:**
- `feed` - Feed group (123456S, ACE, BDFM, G, JZ, NQRW, L)

**Response:**
\`\`\`json
{
  "data": [
    {
      "trainId": "1_123456_ABC",
      "routeId": "1",
      "lat": 40.7589,
      "lon": -73.9851,
      "bearing": 180,
      "timestamp": 1640995200000,
      "tripId": "123456_1..N01R",
      "status": "IN_TRANSIT_TO",
      "stopId": "101"
    }
  ],
  "timestamp": 1640995200000,
  "cached": false
}
\`\`\`

### GET /api/shapes/{routeId}

Returns route polyline coordinates.

**Response:**
\`\`\`json
{
  "data": {
    "shapeId1": [
      {"lat": 40.7589, "lon": -73.9851, "sequence": 1},
      {"lat": 40.7590, "lon": -73.9852, "sequence": 2}
    ]
  }
}
\`\`\`

### GET /api/stops/{routeId}

Returns station information for a route.

**Response:**
\`\`\`json
{
  "data": [
    {
      "stopId": "101",
      "name": "Times Sq - 42 St",
      "lat": 40.7589,
      "lon": -73.9851
    }
  ]
}
\`\`\`

### GET /api/health

Health check endpoint.

**Response:**
\`\`\`json
{
  "ok": true,
  "updatedAt": "2023-01-01T12:00:00.000Z",
  "timestamp": 1640995200000
}
\`\`\`

## Feed Mapping

The app maps subway routes to MTA GTFS-RT feed endpoints:

| Routes | Feed Group | MTA Endpoint |
|--------|------------|--------------|
| 1,2,3,4,5,6,S | 123456S | nyct%2Fgtfs |
| A,C,E | ACE | nyct%2Fgtfs-ace |
| B,D,F,M | BDFM | nyct%2Fgtfs-bdfm |
| G | G | nyct%2Fgtfs-g |
| J,Z | JZ | nyct%2Fgtfs-jz |
| N,Q,R,W | NQRW | nyct%2Fgtfs-nqrw |
| L | L | nyct%2Fgtfs-l |

## Adding New Routes

### 1. Update Route Configuration

Edit `src/lib/routes.js`:

\`\`\`javascript
export const ROUTE_COLORS = {
  // Add your route
  'X': '#FF0000'
}

export const FEED_MAPPING = {
  // Add feed mapping
  'X': 'BDFM'
}

export const AVAILABLE_ROUTES = [
  // Add to UI
  { id: 'X', name: 'X Train', color: '#FF0000' }
]
\`\`\`

### 2. Generate Route Data

1. Ensure GTFS static data includes your route
2. Update `TARGET_ROUTES` in `scripts/preprocess-gtfs.ts`
3. Run: `npm run preprocess`

### 3. Test

Select the new route in the UI and verify:
- Route lines appear on map
- Stations are displayed
- Live trains are tracked

## Deployment

### Vercel (Recommended)

1. **Connect Repository**
   \`\`\`bash
   npm i -g vercel
   vercel
   \`\`\`

2. **Set Environment Variables**
   - Go to Vercel dashboard → Project → Settings → Environment Variables
   - Add `VITE_GOOGLE_MAPS_API_KEY`

3. **Deploy**
   \`\`\`bash
   vercel --prod
   \`\`\`

### Other Platforms

The app works on any platform supporting:
- Static file hosting (frontend)
- Node.js serverless functions (backend)

Popular options: Netlify, Railway, Render

## Keyboard Shortcuts

- **Space** - Toggle live updates on/off
- **1-7** - Select numbered routes (1, 4, 6, etc.)
- **A-R** - Select lettered routes (A, C, E, L, N, Q, R)

## Troubleshooting

### Google Maps Not Loading

1. **Check API Key**: Ensure `VITE_GOOGLE_MAPS_API_KEY` is set correctly
2. **Check Restrictions**: Verify HTTP referrer restrictions in Google Cloud Console
3. **Check Billing**: Ensure billing is enabled for your Google Cloud project
4. **Check Browser Console**: Look for specific error messages

### No Train Data

1. **Check Network**: Verify API endpoints are accessible
2. **Check MTA Status**: MTA feeds may be temporarily unavailable
3. **Check Route**: Ensure the selected route has active service
4. **Check Console**: Look for API error messages

### Performance Issues

1. **Reduce Refresh Rate**: Use 15s or 30s intervals instead of 5s
2. **Limit Routes**: Don't switch routes too frequently
3. **Check Network**: Slow connections may cause delays
4. **Clear Cache**: Refresh the page to clear React Query cache

### Data Preprocessing Errors

1. **Check GTFS Data**: Ensure `./gtfs-data/` contains valid GTFS files
2. **Check File Permissions**: Ensure write access to `./data/` directory
3. **Check Node Version**: Use Node.js 18 or higher
4. **Check CSV Format**: GTFS files should be properly formatted CSV

## Development

### Project Structure

\`\`\`
nyc-subway-map/
├── api/                    # Vercel Functions
│   ├── vehicles.js         # Live train data
│   ├── shapes/[routeId].js # Route polylines
│   ├── stops/[routeId].js  # Station data
│   └── health.js           # Health check
├── src/
│   ├── components/         # React components
│   │   ├── MapView.jsx     # Google Maps container
│   │   ├── TrainMarkers.jsx # Animated train markers
│   │   └── Controls.jsx    # Control panel UI
│   ├── api/
│   │   └── client.js       # React Query hooks
│   ├── lib/
│   │   ├── routes.js       # Route configuration
│   │   └── animation.js    # Animation utilities
│   └── types/
│       └── index.ts        # TypeScript definitions
├── scripts/
│   └── preprocess-gtfs.ts  # GTFS data processor
├── data/                   # Preprocessed route data
│   ├── stops.A.json        # Station data by route
│   └── shapes.A.json       # Route polylines
└── public/                 # Static assets
\`\`\`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run preprocess` - Process GTFS static data
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

### Code Style

- **ESLint** with React and React Hooks rules
- **Prettier** for code formatting
- **Functional components** with hooks
- **TypeScript** for type definitions
- **Tailwind CSS** for styling

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm run lint`
5. Commit changes: `git commit -m 'Add feature'`
6. Push to branch: `git push origin feature-name`
7. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- **MTA** for providing GTFS-RT data
- **Google Maps** for mapping services
- **React** and **Vite** communities
- **GTFS** specification maintainers

## Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Email**: your-email@example.com

---

**Built with ❤️ for NYC subway riders**
# live-subway
