const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const archiver = require('archiver');
const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');

const execAsync = promisify(exec);

const router = express.Router();

const TEMP_DIR = process.env.TEMP_DIR || '/tmp/image-renamer';
const CRAWL4AI_VENV = process.env.CRAWL4AI_VENV || '/root/.openclaw/workspace/crawl4ai_env';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const sessionId = req.body.sessionId || uuidv4();
    const dir = path.join(TEMP_DIR, sessionId);
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, WEBP allowed.'));
    }
  }
});

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || 'openrouter/free'
});

const DEFAULT_VISION_MODEL = 'qwen/qwen2.5-vl-32b-instruct:free';

router.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`[ImageRenamer] Analyzing URL: ${url}`);

    const sessionId = uuidv4();
    const sessionDir = path.join(TEMP_DIR, sessionId);
    await fs.mkdir(sessionDir, { recursive: true });

    const scriptPath = path.join(sessionDir, 'crawl.js');
    const outputPath = path.join(sessionDir, 'output.md');

    const crawlScript = `
const { Crawler } = require('./crawler.js');

async function main() {
  const crawler = new Crawler();
  const result = await crawler.crawl('${url}');
  const fs = require('fs');
  fs.writeFileSync('${outputPath}', result);
  console.log('Crawl complete');
}

main().catch(console.error);
`;

    await fs.writeFile(scriptPath, crawlScript);

    const crawl4aiBin = path.join(CRAWL4AI_VENV, 'bin/python');
    const crawlScriptPy = `
import sys
import asyncio
from crawl4ai import AsyncWebCrawler

async def main():
    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(url='${url}')
        print(result.markdown)

if __name__ == '__main__':
    asyncio.run(main())
`;

    const pyScriptPath = path.join(sessionDir, 'crawl.py');
    await fs.writeFile(pyScriptPath, crawlScriptPy);

    try {
      const { stdout, stderr } = await execAsync(
        `"${crawl4aiBin}" "${pyScriptPath}"`,
        { timeout: 120000 }
      );
      
      let extractedData = stdout;
      
      if (!extractedData || extractedData.trim() === '') {
        const fallbackResult = await simpleCrawl(url);
        extractedData = fallbackResult;
      }

      const roomsAndSpaces = extractRoomsAndSpaces(extractedData);

      await fs.rm(sessionDir, { recursive: true, force: true });

      res.json({
        sessionId,
        url,
        rooms: roomsAndSpaces,
        rawContent: extractedData.substring(0, 5000)
      });

    } catch (crawlError) {
      console.error('[ImageRenamer] Crawl error:', crawlError.message);
      
      const fallbackResult = await simpleCrawl(url);
      const roomsAndSpaces = extractRoomsAndSpaces(fallbackResult);

      await fs.rm(sessionDir, { recursive: true, force: true });

      res.json({
        sessionId,
        url,
        rooms: roomsAndSpaces,
        rawContent: fallbackResult.substring(0, 5000)
      });
    }

  } catch (error) {
    console.error('[ImageRenamer] Analyze error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function simpleCrawl(url) {
  try {
    const { stdout } = await execAsync(
      `curl -s "${url}" | head -c 100000`,
      { timeout: 30000 }
    );
    return stdout;
  } catch {
    return '';
  }
}

function extractRoomsAndSpaces(content) {
  const rooms = [];
  const seen = new Set();

  const roomKeywords = ['room', 'rooms', 'suite', 'suites', 'bedroom', 'bedrooms', 'guestroom', 'accommodation'];
  const diningKeywords = ['restaurant', 'bistro', 'lounge', 'bar', 'cafe', 'dining'];
  const eventKeywords = ['ballroom', 'meeting room', 'conference', 'event space', 'banquet', 'venue'];

  const lines = content.split(/\n/);
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (roomKeywords.some(k => lowerLine.includes(k))) {
      const cleanLine = line.replace(/<[^>]+>/g, '').trim();
      const match = cleanLine.match(/(?:Premium|Standard|Deluxe|Executive|Presidential|One\s*bedroom|Two\s*bedroom|Queen|King|Twin|Non-Smoking|Accessible)?\s*(?:Rooms?|Suite|Suites|Bedroom|Bedrooms|Guestroom)/i);
      if (match && match[0].length > 3) {
        let roomName = match[0].trim();
        if (!seen.has(roomName.toLowerCase())) {
          seen.add(roomName.toLowerCase());
          rooms.push({ name: roomName, type: categorizeRoom(roomName) });
        }
      }
    }
    
    if (diningKeywords.some(k => lowerLine.includes(k))) {
      const cleanLine = line.replace(/<[^>]+>/g, '').trim();
      const match = cleanLine.match(/(?:Seaside|Ocean|Garden|Terrace|Rooftop|Poolside|Main|Fine|Casual)?\s*(?:Restaurant|Bistro|Lounge|Bar|Cafe|Dining)(?:\s+(?:and|&)\s+(?:Restaurant|Bistro|Lounge|Bar|Cafe))?/i);
      if (match && match[0].length > 3) {
        let roomName = match[0].trim();
        if (!seen.has(roomName.toLowerCase())) {
          seen.add(roomName.toLowerCase());
          rooms.push({ name: roomName, type: 'dining' });
        }
      }
    }
    
    if (eventKeywords.some(k => lowerLine.includes(k))) {
      const cleanLine = line.replace(/<[^>]+>/g, '').trim();
      const match = cleanLine.match(/(?:Oceanic|Grand|Executive|Celebration|Wedding)?\s*(?:Ballroom|Meeting\s*Room|Conference\s*Room|Event\s*Space|Banquet\s*Hall)/i);
      if (match && match[0].length > 3) {
        let roomName = match[0].trim();
        if (!seen.has(roomName.toLowerCase())) {
          seen.add(roomName.toLowerCase());
          rooms.push({ name: roomName, type: 'event_space' });
        }
      }
    }
  }

  const filtered = rooms.filter(r => {
    const lower = r.name.toLowerCase();
    return !['room', 'rooms', 'suite', 'suites', 'bedroom', 'bedrooms', 'dining', 'restaurant', 'lounge', 'bar', 'accommodation', 'cafe'].includes(lower);
  });

  return filtered.slice(0, 30);
}

function categorizeRoom(name) {
  const lower = name.toLowerCase();
  if (lower.includes('ballroom') || lower.includes('event') || lower.includes('venue')) return 'event_space';
  if (lower.includes('meeting') || lower.includes('conference')) return 'meeting_room';
  if (lower.includes('suite') || lower.includes('penthouse') || lower.includes('villa')) return 'accommodation';
  if (lower.includes('lounge') || lower.includes('bar')) return 'lounge';
  if (lower.includes('restaurant') || lower.includes('dining')) return 'dining';
  if (lower.includes('pool') || lower.includes('spa') || lower.includes('fitness')) return 'amenity';
  return 'other';
}

router.post('/upload', upload.array('images', 20), async (req, res) => {
  try {
    const sessionId = req.body.sessionId;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const files = req.files.map(f => ({
      originalName: f.originalname,
      savedName: f.filename,
      path: f.path,
      size: f.size,
      type: f.mimetype
    }));

    res.json({
      sessionId,
      files
    });
  } catch (error) {
    console.error('[ImageRenamer] Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/rename', async (req, res) => {
  try {
    const { images, websiteData } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Images array is required' });
    }

    if (!websiteData || !websiteData.rooms || websiteData.rooms.length === 0) {
      return res.status(400).json({ error: 'Website data with rooms is required' });
    }

    const roomList = websiteData.rooms.map(r => r.name).join(', ');
    const results = [];

    for (const image of images) {
      try {
        const imageBuffer = await fs.readFile(image.path);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = image.type || 'image/jpeg';

        let suggestedName = image.originalName.split('.')[0];

        try {
          const completion = await openai.chat.completions.create({
            model: DEFAULT_VISION_MODEL,
            messages: [
              {
                role: 'system',
                content: `You are an AI that names hotel/event room images. Given a list of room/space names and an image, choose the best matching name or create a descriptive filename. 
                
Room/space names available: ${roomList}

Rules:
- Choose the most relevant room name from the list if it matches the image
- If no match, create a descriptive filename based on what you see (e.g., "grand-ballroom", "outdoor-pool", "executive-suite")
- Use lowercase with hyphens
- Keep it concise (3-6 words)
- Only output the filename, nothing else`
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'What room or space is shown in this image? Choose from the list or create a descriptive name.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${mimeType};base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 50
          });

          const aiName = completion.choices[0]?.message?.content?.trim();
          console.log('[ImageRenamer] AI response:', aiName);
          if (aiName && aiName.length > 0) {
            suggestedName = aiName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
          }
        } catch (aiError) {
          console.error('[ImageRenamer] AI error:', aiError.message);
          // Fallback: generate name based on room types if available
          if (websiteData.rooms && websiteData.rooms.length > 0) {
            const randomRoom = websiteData.rooms[Math.floor(Math.random() * websiteData.rooms.length)];
            suggestedName = randomRoom.name.toLowerCase().replace(/\s+/g, '-');
          }
        }

        results.push({
          ...image,
          suggestedName,
          extension: image.originalName.split('.').pop()
        });

      } catch (imageError) {
        console.error('[ImageRenamer] Image process error:', imageError);
        results.push({
          ...image,
          suggestedName: image.originalName.split('.')[0],
          extension: image.originalName.split('.').pop(),
          error: imageError.message
        });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error('[ImageRenamer] Rename error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/download/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { files } = req.query;

    if (!files) {
      return res.status(400).json({ error: 'Files parameter is required' });
    }

    const parsedFiles = JSON.parse(decodeURIComponent(files));
    const sessionDir = path.join(TEMP_DIR, sessionId);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="renamed-images-${sessionId}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (const file of parsedFiles) {
      const originalPath = path.join(sessionDir, file.savedName);
      const newName = `${file.suggestedName}.${file.extension}`;
      
      try {
        await fs.access(originalPath);
        archive.file(originalPath, { name: newName });
      } catch {
        console.warn(`[ImageRenamer] File not found: ${originalPath}`);
      }
    }

    await archive.finalize();

    setTimeout(async () => {
      try {
        await fs.rm(sessionDir, { recursive: true, force: true });
        console.log(`[ImageRenamer] Cleaned up session: ${sessionId}`);
      } catch (cleanupError) {
        console.error('[ImageRenamer] Cleanup error:', cleanupError);
      }
    }, 5000);

  } catch (error) {
    console.error('[ImageRenamer] Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

router.delete('/cleanup/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionDir = path.join(TEMP_DIR, sessionId);

    await fs.rm(sessionDir, { recursive: true, force: true });

    res.json({ success: true, message: 'Session cleaned up' });
  } catch (error) {
    console.error('[ImageRenamer] Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
