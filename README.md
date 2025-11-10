# Pi2 Explainer

A Chrome extension that provides AI-powered explanations for PiSquared (Pi² Network) content using direct LLM calls with RAG (Retrieval-Augmented Generation).

## Overview

Pi2 Explainer helps users understand complex technical content on the PiSquared website by:
- Detecting text selections on pi2.network pages
- Retrieving relevant context from PiSquared documentation using vector search
- Generating clear, contextual explanations using LLM providers (OpenRouter or Fireworks)

## Architecture

- **Chrome Extension**: Detects text selection and displays explanations in an overlay
- **Backend API**: Express server that handles explanation requests
- **RAG Layer**: Vector database (Qdrant) with embeddings for PiSquared documentation
- **LLM Integration**: Direct calls to OpenRouter or Fireworks (Dobby) for explanations

## Features

- 🎯 **Context-Aware**: Uses RAG to retrieve relevant documentation snippets
- ⚡ **Fast**: Direct LLM calls without complex orchestration
- 🎨 **Minimalist UI**: Clean overlay design that doesn't interfere with reading
- ⌨️ **Keyboard Shortcut**: Press `Alt+E` to explain selected text
- 🔧 **Configurable**: Support for multiple LLM providers and models

## Setup

See [SETUP.md](./SETUP.md) for detailed setup instructions.

### Quick Start

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Start backend:**
   ```bash
   npm start
   ```

4. **Index PiSquared website:**
   ```bash
   npm run crawler
   ```

5. **Install Chrome extension:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `chrome-extension` directory

## Usage

1. Navigate to https://pi2.network
2. Select any text on the page (minimum 10 characters)
3. Click the "💡 Explain" button that appears, or press `Alt+E`
4. View the AI-generated explanation in the overlay

## Project Structure

```
pi2-explainer/
├── backend/                 # Express backend server
│   ├── routes/             # API routes (explain, health, crawler)
│   ├── services/           # Business logic services
│   │   ├── llmService.js   # LLM provider integration
│   │   ├── explainService.js # Explanation orchestration
│   │   ├── vectorDbService.js # Vector database operations
│   │   └── embeddingService.js # Text embedding generation
│   ├── crawler/            # Website crawler and indexer
│   └── server.js           # Main server file
├── chrome-extension/        # Chrome extension
│   ├── content.js          # Content script (text selection, UI)
│   ├── background.js       # Service worker (API communication)
│   ├── popup.html/js       # Extension popup (configuration)
│   └── manifest.json       # Extension manifest
└── render.yaml             # Render deployment configuration
```

## API Endpoints

### POST /api/explain
Generate an explanation for selected text.

**Request:**
```json
{
  "url": "https://pi2.network/some-page",
  "selected_text": "LLVM-K operates on KORE...",
  "user_options": {
    "tone": "casual",
    "level": "beginner"
  },
  "session_id": "session_123"
}
```

**Response:**
```json
{
  "explanation": "LLVM-K is a compiler that transforms K definitions...",
  "executionId": "llm_1234567890_abc123",
  "metadata": {
    "contextSnippetsCount": 3,
    "userOptions": {...},
    "provider": "fireworks",
    "model": "dobby-unhinged-llama-3-3-70b-new"
  },
  "timestamp": "2025-01-10T12:00:00.000Z"
}
```

### GET /api/health
Check backend and service health.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T12:00:00.000Z",
  "services": {
    "llm": {
      "status": "connected",
      "provider": "fireworks",
      "model": "dobby-unhinged-llama-3-3-70b-new"
    },
    "vectorDb": {
      "status": "connected"
    }
  },
  "version": "1.0.0"
}
```

### POST /api/crawler/index
Trigger website indexing (crawls pi2.network and stores in vector DB).

## Configuration

### Environment Variables

See `backend/.env.example` for all available options.

**Required:**
- `LLM_PROVIDER`: `fireworks` or `openrouter`
- `FIREWORKS_API_KEY` or `OPENROUTER_API_KEY`: Your API key
- `VECTOR_DB_URL`: Qdrant instance URL

**Optional:**
- `LLM_MODEL`: Model name (defaults vary by provider)
- `VECTOR_DB_COLLECTION`: Collection name (default: `pisquared_docs`)
- `PORT`: Server port (default: `3001`)
- `CORS_ORIGIN`: Comma-separated allowed origins

### User Options

- **tone**: `casual` | `formal` | `technical`
- **level**: `beginner` | `intermediate` | `expert`
- **mode**: `explain` | `quick-summary` | `bullet-list` | `code-example`

## Deployment

### Render

The project includes a `render.yaml` configuration file for easy deployment to Render.

1. Push code to GitHub
2. Connect repository to Render
3. Configure environment variables in Render dashboard
4. Deploy!

See `render.yaml` for configuration details.

## Development

### Backend Development
```bash
cd backend
npm run dev  # Auto-reload on changes
```

### Testing
```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Test explain endpoint
curl -X POST http://localhost:3001/api/explain \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://pi2.network",
    "selected_text": "PiSquared is a blockchain network"
  }'
```

## Troubleshooting

1. **Extension not showing button**: Check that you're on pi2.network domain
2. **Backend connection error**: Verify backend is running and URL is correct in extension popup
3. **No explanations**: Check vector DB is indexed and LLM API key is valid
4. **CORS errors**: Ensure backend CORS_ORIGIN includes your domain

## License

MIT
