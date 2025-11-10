# Pi2 Explainer Backend

Express.js backend server that uses LLM (Fireworks/OpenRouter) with RAG for explaining PiSquared content.

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

## Services

- **LLM Service**: Direct LLM integration (Fireworks Dobby or OpenRouter)
- **Vector DB Service**: Manages Qdrant vector database
- **Embedding Service**: Generates embeddings using OpenAI/OpenRouter
- **Explain Service**: Main orchestration service
- **Cache Service**: In-memory caching for explanations

## Environment Variables

See `.env.example` for all configuration options.

## API Documentation

See main README.md for API endpoint documentation.

