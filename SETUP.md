# Setup Guide

Complete setup instructions for Pi2 Explainer.

## Prerequisites

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **Qdrant** - Vector database (or use cloud service)
3. **LLM API Key** - Choose one:
   - **Fireworks API Key** (recommended for Dobby) - [Get API Key](https://fireworks.ai/)
   - **OpenRouter API Key** - For various models including OpenAI - [Get API Key](https://openrouter.ai/)

## Step 1: Setup Vector Database (Qdrant)

### Option A: Docker (Recommended)
```bash
docker run -p 6333:6333 qdrant/qdrant
```

### Option B: Cloud Service
- Sign up at [Qdrant Cloud](https://cloud.qdrant.io/)
- Get your URL and API key

## Step 2: Setup Backend

1. Navigate to backend:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
# If .env.example exists:
cp .env.example .env
# Otherwise, copy from env.example:
cp env.example .env
```

4. Edit `.env` with your configuration:
```env
# LLM Provider: 'fireworks' or 'openrouter'
LLM_PROVIDER=fireworks

# Fireworks (Dobby) Configuration
FIREWORKS_API_KEY=your_fireworks_key_here
FIREWORKS_MODEL=accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new

# OpenRouter Configuration (alternative)
# OPENROUTER_API_KEY=your_openrouter_key_here
# LLM_MODEL=openai/gpt-4o-mini

# Vector Database
VECTOR_DB_URL=http://localhost:6333
VECTOR_DB_COLLECTION=pisquared_docs
VECTOR_DB_API_KEY=your_qdrant_key_if_needed

# Server
PORT=3001
```

5. Start backend:
```bash
npm start
```

Backend should be running on http://localhost:3001

## Step 3: Index PiSquared Website

1. Run the crawler:
```bash
npm run crawler
```

Or trigger via API:
```bash
curl -X POST http://localhost:3001/api/crawler/index
```

This will:
- Crawl pi2.network
- Extract text content
- Generate embeddings
- Store in vector database

**Note**: This may take several minutes depending on site size.

## Step 4: Install Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` directory
5. Click the extension icon to configure backend URL (default: http://localhost:3001)

## Step 5: Test

1. Visit https://pi2.network
2. Select some text (minimum 10 characters)
3. Click the "💡 Explain" button
4. View the explanation!

## Troubleshooting

### LLM not responding
- Check your API key is set correctly in `.env`
- Verify `LLM_PROVIDER` matches your chosen provider (fireworks or openrouter)
- For Fireworks: Ensure `FIREWORKS_API_KEY` is set
- For OpenRouter: Ensure `OPENROUTER_API_KEY` is set
- Check API key has sufficient credits/quota

### Vector DB connection error
- Check Qdrant is running: `curl http://localhost:6333/health`
- Verify VECTOR_DB_URL in .env

### No explanations generated
- Check backend logs for errors
- Verify your LLM API key is valid and has credits/quota
- Check which provider is being used: Look for startup log "🤖 LLM Service: Using..."
- Ensure vector DB is indexed (run crawler)

### Switching between LLM Providers
- Set `LLM_PROVIDER=fireworks` in `.env` to use Fireworks (Dobby) - default
- Set `LLM_PROVIDER=openrouter` in `.env` to use OpenRouter (supports OpenAI and other models via OpenRouter)
- Make sure the corresponding API key is set (`FIREWORKS_API_KEY` or `OPENROUTER_API_KEY`)
- Restart backend after changing the provider

### Extension not showing button
- Check you're on pi2.network domain
- Verify backend URL in extension popup
- Check browser console for errors (F12)

## Next Steps

- Experiment with different LLM models and providers
- Add more user options (tone, level, mode)
- Implement feedback collection
- Add analytics and monitoring
- Fine-tune prompts for better explanations

