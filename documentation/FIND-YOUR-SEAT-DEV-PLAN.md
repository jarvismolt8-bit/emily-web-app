# Find Your Seat - Wedding Guest Assistant

## Project Overview

- **Project Name**: Find Your Seat
- **Project Type**: Wedding Guest Assistant Web Application
- **Core Functionality**: AI-powered chat assistant that helps wedding guests find their seat/table number and answers wedding-related questions
- **Target Users**: Wedding guests

---

## Live URL

**Access the app at:** https://46.225.69.45/find-your-seat/

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + shadcn/ui |
| Backend | Express.js (Node.js) |
| AI Model | Google Gemini API |
| Deployment | Nginx (subpath) |

### Project Structure

```
/var/www/find-your-seat/
├── frontend/              # React + Vite app
│   ├── src/
│   │   ├── components/   # React components
│   │   │   ├── ui/       # shadcn/ui components
│   │   │   ├── LandingPage.tsx
│   │   │   └── ChatPage.tsx
│   │   ├── lib/          # Utilities
│   │   ├── api/          # API client
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── dist/             # Built files
│   └── package.json
├── backend/              # Express.js API server
│   ├── events/           # Event JSON data files
│   │   └── harrison-miller-wedding.json
│   ├── server.js         # Entry point
│   ├── .env              # Environment variables
│   └── package.json
└── nginx/                # Nginx configuration (archived)
```

---

## Configuration

### Environment Variables

**Backend** (`/var/www/find-your-seat/backend/.env`):
```
PORT=3002
GEMINI_API_KEY=<configured>
```

### Nginx Configuration

The app is served via subpath in `/etc/nginx/sites-available/cashflow-manager.conf`:

```nginx
# Find Your Seat App - Frontend
location /find-your-seat/ {
    alias /var/www/find-your-seat/frontend/dist/;
    try_files $uri $uri/ /find-your-seat/index.html;
}

# Find Your Seat App - API
location /find-your-seat/api/ {
    rewrite ^/find-your-seat/api/(.*)$ /api/$1 break;
    proxy_pass http://localhost:3002;
    ...
}
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/find-your-seat/api/events` | List available events |
| GET | `/find-your-seat/api/events/:name` | Get event details |
| POST | `/find-your-seat/api/chat` | Send message to AI assistant |
| DELETE | `/find-your-seat/api/chat/:sessionId` | Clear chat session |

---

## Managing the Service

### Start/Stop Backend

```bash
# Start backend
cd /var/www/find-your-seat/backend
node server.js

# Or run in background
nohup node server.js > /var/log/find-your-seat-backend.log 2>&1 &

# Check if running
ps aux | grep "node.*server.js" | grep 3002

# View logs
tail -f /var/log/find-your-seat-backend.log
```

### Rebuild Frontend

```bash
cd /var/www/find-your-seat/frontend
npm run build
```

### Reload Nginx

```bash
nginx -t && nginx -s reload
```

---

## Event Data

### Adding New Events

1. Create a new JSON file in `/var/www/find-your-seat/backend/events/`
2. Name it `<event-name>.json` (e.g., `smith-johnson-wedding.json`)
3. Follow the schema below

### Event JSON Schema

```json
{
  "eventId": "unique-id",
  "eventName": "Wedding Name",
  "eventDate": "2026-09-19",
  "eventTime": {
    "ceremony": "16:00",
    "cocktailHour": "17:30",
    "reception": "19:00"
  },
  "weddingCeremony": {
    "venue": "Venue Name",
    "address": "Full Address",
    "coordinates": "lat, lng"
  },
  "weddingReception": {
    "venue": "Reception Venue",
    "address": "Full Address",
    "note": "Any special notes"
  },
  "motif": {
    "themeName": "Theme Name",
    "colors": ["Color 1", "Color 2"]
  },
  "dressCode": {
    "style": "Dress Code Style",
    "description": "Full description",
    "colorRestrictions": "Any color restrictions"
  },
  "menu": {
    "appetizers": ["Item 1", "Item 2"],
    "entrees": ["Item 1", "Item 2"],
    "dessert": "Dessert Name",
    "lateNightSnack": "Snack Name"
  },
  "guests": [
    {
      "name": "Guest Name",
      "table": 1,
      "seat": 1,
      "role": "Role",
      "dietary": "Dietary Info"
    }
  ],
  "faq": [
    {
      "question": "Question?",
      "answer": "Answer."
    }
  ]
}
```

---

## Development Status

| Phase | Status |
|-------|--------|
| Phase 1: Project Setup | ✅ Complete |
| Phase 2: Backend Development | ✅ Complete |
| Phase 3: Frontend Development | ✅ Complete |
| Phase 4: Integration & Testing | ✅ Complete |
| Phase 5: Deployment | ✅ Complete |

---

## Acceptance Criteria

| Criteria | Status |
|----------|--------|
| Landing Page: User can enter name and proceed | ✅ |
| Chat Interface: User can send messages and receive AI responses | ✅ |
| Seat Lookup: AI correctly identifies guest's table/seat | ✅ |
| FAQ: AI can answer wedding-related questions | ✅ |
| Reset: "Start from the top" returns to landing page | ✅ |
| App accessible at URL | ✅ |

---

## Token Tracking

The app displays token usage per message to help understand API costs for pricing research.

### Display Format
```
[AI Message]
1594 input · 25 output = 1619 tokens
```

### Pricing Context (Gemini 2.0 Flash)
- Input: ~$0.10 per 1M tokens
- Output: ~$0.40 per 1M tokens

---

## Ven Agent Notification System

Find Your Seat can notify the OpenClaw Ven agent when specific scenarios are detected.

### Notification Scenarios

| Scenario | Trigger Keywords | Priority |
|----------|-----------------|----------|
| **System Errors** | API failures, timeouts | 🔴 High |
| **Help Requests** | "help", "assist", "support", "human" | 🟡 Medium |
| **Unknown Guest** | Name not found in guest list | 🟡 Medium |
| **Special Requests** | "dietary", "allergy", "wheelchair", "VIP" | 🟡 Medium |
| **Urgent Issues** | "urgent", "emergency", "immediately" | 🔴 High |

### How It Works

1. User message is analyzed for trigger keywords
2. If guest name is provided, checked against guest list
3. When triggers detected, HTTP POST sent to OpenClaw webhook
4. Ven agent receives notification via Telegram

### Configuration

**OpenClaw Webhook** (`~/.openclaw/openclaw.json`):
```json
"hooks": {
  "enabled": true,
  "token": "find-your-seat-webhook-token-2026",
  "path": "/hooks"
}
```

### Test Commands

```bash
# Test help request
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"I need help"}'

# Test unknown guest
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"I am Unknown Person"}'

# Test urgent
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"This is urgent!"}'
```

---

## Next Steps / Improvements

1. **PM2 for process management** - Use PM2 to manage the backend process
2. **Add more events** - Create additional event JSON files
3. **Customize UI** - Match wedding theme colors
4. **Add analytics** - Track usage and common questions
5. **Multi-language support** - Support for non-English guests
6. **Token cost dashboard** - Aggregate token usage analytics
7. **Ven agent responses** - Allow Ven to reply back to guests
