import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import '../config/loadEnv.js';
import { embeddingService } from '../services/embeddingService.js';
import { vectorDbService } from '../services/vectorDbService.js';
import { v4 as generateUUID } from 'uuid';

const PI2_BASE_URL = process.env.PI2_BASE_URL || 'https://pi2.network';
const CHUNK_SIZE = 500; // tokens (approx)
const CHUNK_OVERLAP = 50; // tokens

/**
 * Crawler and indexer for PiSquared website
 */
class Pi2Indexer {
  constructor() {
    this.visited = new Set();
    this.toVisit = [PI2_BASE_URL];
  }

  /**
   * Main indexing function
   */
  async index() {
    if (process.env.NODE_ENV === 'development') {
      console.log('Starting PiSquared website indexing...');
    }
    
    // Ensure collection exists
    await vectorDbService.createCollection(1536); // OpenAI embedding size
    
    while (this.toVisit.length > 0) {
      const url = this.toVisit.shift();
      
      if (this.visited.has(url)) {
        continue;
      }

      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Indexing: ${url}`);
        }
        await this.indexPage(url);
        this.visited.add(url);
      } catch (error) {
        console.error(`Error indexing ${url}:`, error.message);
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`Indexing complete! Indexed ${this.visited.size} pages.`);
    }
  }

  /**
   * Index a single page
   */
  async indexPage(url) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Pi2-Explainer-Bot/1.0)'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract text content
      $('script, style, nav, footer, header').remove();
      const title = $('title').text() || $('h1').first().text() || 'Untitled';
      const text = $('body').text().replace(/\s+/g, ' ').trim();

      // Extract links for crawling
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const absoluteUrl = new URL(href, url).href;
          if (absoluteUrl.startsWith(PI2_BASE_URL) && !this.visited.has(absoluteUrl)) {
            this.toVisit.push(absoluteUrl);
          }
        }
      });

      // Chunk text
      const chunks = this.chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);

      // Generate embeddings and index
      const points = [];
      for (const chunk of chunks) {
        const embedding = await embeddingService.generateEmbedding(chunk.text);
        points.push({
          id: generateUUID(),
          vector: embedding,
          payload: {
            text: chunk.text,
            url: url,
            title: title,
            chunk_index: chunk.index,
            total_chunks: chunks.length
          }
        });
      }

      if (points.length > 0) {
        await vectorDbService.upsert(points);
        if (process.env.NODE_ENV === 'development') {
          console.log(`  ✓ Indexed ${points.length} chunks from ${url}`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to index page ${url}: ${error.message}`);
    }
  }

  /**
   * Chunk text into smaller pieces
   */
  chunkText(text, chunkSize, overlap) {
    const words = text.split(' ');
    const chunks = [];
    let currentChunk = [];
    let currentSize = 0;
    let chunkIndex = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordSize = word.length + 1; // +1 for space

      if (currentSize + wordSize > chunkSize && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.join(' '),
          index: chunkIndex++
        });

        // Start new chunk with overlap
        const overlapWords = Math.floor(overlap / 10); // Approximate
        currentChunk = currentChunk.slice(-overlapWords);
        currentSize = currentChunk.join(' ').length;
      }

      currentChunk.push(word);
      currentSize += wordSize;
    }

    if (currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.join(' '),
        index: chunkIndex
      });
    }

    return chunks;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const indexer = new Pi2Indexer();
  indexer.index().catch(console.error);
}

export { Pi2Indexer };

