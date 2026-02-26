# Image Renamer Feature - Documentation

## Overview

The Image Renamer is a web-based tool that helps rename poorly named images by analyzing their content and matching them against information from a related website.

## Use Case

Users have images of rooms/event spaces with poor filenames (e.g., `IMG_001.jpg`, ` DSC_1234.png`). They want to rename these images based on the actual room or space they represent, using information from a venue's website.

## User Flow

### Step 1: Input Website URL
- User enters a URL (e.g., hotel venue website)
- System crawls the website and extracts:
  - Room names
  - Event spaces
  - Venue areas
  - Amenities descriptions

### Step 2: Upload Images
- User drags & drops or selects images (JPG, PNG, WEBP)
- Maximum: ~20 images per session
- Images stored temporarily in server memory/disk

### Step 3: AI Analysis & Renaming
- For each image:
  1. AI vision model analyzes the image content
  2. Compares against website data
  3. Suggests the most appropriate name
- User can edit suggested names before confirming

### Step 4: Download
- User downloads a ZIP file containing renamed images
- Temporary files are automatically deleted after download
- No data persists after session ends

## Technical Architecture

### Frontend (React)
- Route: `/image-renamer`
- Components:
  - URL input form
  - Image upload dropzone
  - Image preview list with editable names
  - Download button
- API Client: `src/api/imageRenamer.js`

### Backend (Express)
- Port: 3001
- Endpoints:
  | Method | Endpoint | Description |
  |--------|----------|-------------|
  | POST | `/api/image-renamer/analyze` | Crawl URL, extract rooms/spaces |
  | POST | `/api/image-renamer/upload` | Handle image uploads |
  | POST | `/api/image-renamer/rename` | AI analysis & suggest names |
  | GET | `/api/image-renamer/download/:sessionId` | Download renamed ZIP |

### External Services

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| OpenRouter (`openrouter/free`) | Vision AI for image analysis | Yes |
| Crawl4ai (existing venv) | Website content extraction | Yes |

### Data Flow

```
[User Input URL]
       ↓
[crawl4ai subprocess] → Extract room/event names
       ↓
[User Uploads Images] → Store in /tmp/image-renamer/{sessionId}/
       ↓
[Vision AI Analysis] → For each image:
  - Analyze image content
  - Match against extracted website data
  - Suggest filename
       ↓
[User Reviews/Edits Names]
       ↓
[Generate ZIP] → Stream to client
       ↓
[Cleanup] → Delete temp files
```

## Configuration

### Environment Variables

```bash
# Backend (.env)
OPENROUTER_API_KEY=your_openrouter_key  # Optional - uses free tier
CRAWL4AI_VENV=/root/.openclaw/workspace/crawl4ai_env
TEMP_DIR=/tmp/image-renamer
```

### Directories

| Path | Purpose |
|------|---------|
| `/tmp/image-renamer/{sessionId}/` | Temporary image storage |
| `/root/.openclaw/workspace/crawl4ai_env/` | Crawl4ai Python environment |

## Security Considerations

1. **No Persistent Storage**: All images deleted after download
2. **Session Isolation**: Each session gets unique ID
3. **File Type Validation**: Only accept image types (jpg, png, webp)
4. **Filename Sanitization**: Strip special characters from AI-generated names
5. **Size Limits**: Max 10MB per image

## Error Handling

| Error | User Message |
|-------|--------------|
| URL unreachable | "Could not access website. Please check the URL." |
| No rooms found | "Could not find room/event information. Try a different URL." |
| Image upload failed | "Failed to upload image. Please try again." |
| AI analysis failed | "Could not analyze image. Please try again or rename manually." |
| Download failed | "Failed to generate download. Please try again." |

## Future Enhancements

- [ ] Bulk URL support (multiple venue websites)
- [ ] Manual room/space entry (bypass crawl)
- [ ] History of recent renames (local storage)
- [ ] Export mapping CSV
- [ ] Support more image formats (GIF, BMP, TIFF)
