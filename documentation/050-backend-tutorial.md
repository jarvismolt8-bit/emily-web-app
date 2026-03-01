# Backend Tutorial Series

A complete guide to learning backend development using the Cashflow app as real-world examples.

---

## Table of Contents

1. [How the Web Works](#tutorial-1-how-the-web-works)
2. [What is a Backend?](#tutorial-2-what-is-a-backend)
3. [REST API Basics](#tutorial-3-rest-api-basics)
4. [Database Fundamentals](#tutorial-4-database-fundamentals)
5. [Server Setup](#tutorial-5-server-setup)
6. [API Routes](#tutorial-6-api-routes)
7. [Database Queries](#tutorial-7-database-queries)
8. [Authentication](#tutorial-8-authentication)
9. [Security Basics](#tutorial-9-security-basics)
10. [Deployment](#tutorial-10-deployment)

---

# Tutorial 1: How the Web Works

## Introduction

Have you ever wondered what happens when you type a website address in your browser and press Enter? Let's break it down in simple terms.

## The Basic Flow

```
[Your Browser]  --request-->  [Website Server]  --response-->  [Your Browser]
     (Client)                     (Backend)                      (Displays website)
```

## Key Concepts

### 1. Client (Frontend)
The client is what you interact with - your browser (Chrome, Safari, Firefox), a mobile app, or even another server. Its job is to:
- Send requests to servers
- Display the information received

### 2. Server (Backend)
A server is a computer that's always running, waiting for requests. When it receives a request, it:
- Processes the request
- May talk to a database
- Sends back a response

### 3. HTTP - The Language

HTTP (HyperText Transfer Protocol) is how clients and servers talk to each other. Think of it as a shared language.

### 4. Request Methods

| Method | What it does | Example |
|--------|-------------|---------|
| GET | Ask for data | Loading a page |
| POST | Send new data | Submitting a form |
| PUT | Update existing data | Editing a profile |
| DELETE | Remove data | Deleting a post |

## Real Example from Cashflow

When you open the Cashflow Manager app:

1. **Your browser (GET)** → Requests `https://your-server/`
2. **Server responds** → Sends HTML, CSS, JavaScript
3. **Browser displays** → You see the login page

When you add a new cashflow entry:

1. **Your browser (POST)** → Sends your entry data as JSON
2. **Server processes** → Saves to database
3. **Server responds** → "Success!" 
4. **Browser updates** → Shows the new entry

## Key Takeaways

- **Client** = What you use to access the web (browser, app)
- **Server** = The computer that serves content
- **HTTP** = The language they use to communicate
- **Request/Response** = The conversation between client and server

---

## Try It!

Open your browser's Developer Tools (F12), go to the "Network" tab, and reload a webpage. You'll see all the requests being made!

---

# Tutorial 2: What is a Backend?

## Introduction

You already know about the frontend - the part of a website you see and interact with. But there's a whole other side called the backend. Let's explore!

## Frontend vs Backend

Think of a restaurant:

| Frontend (What you see) | Backend (What happens behind the scenes) |
|------------------------|---------------------------------------|
| The dining room | The kitchen |
| The menu you read | The chef cooking |
| The waiter who takes your order | The kitchen staff preparing food |
| The food on your table | The recipes and ingredients |

## What Does the Backend Do?

The backend handles all the "invisible" work:

### 1. Process Data
When you submit a form, the backend:
- Receives your data
- Validates (checks if it's correct)
- Processes it
- Stores it (usually in a database)

### 2. Business Logic
The rules of your application:
- "Only logged-in users can see this"
- "Calculate the total: price × quantity"
- "Send an email after purchase"

### 3. Communicate with Databases
The backend is the only thing that can talk to the database. Clients (browsers) never talk directly to databases - it's a security rule.

## The Cashflow Example

Here's how Cashflow Backend works:

```
Frontend (Browser)                    Backend (Server)                    Database
     |                                    |                                |
     |  POST /api/cashflow               |                                |
     |----------------------------------> |                                |
     |                                    |  Validate data                 |
     |                                    |------------------------------> |
     |                                    |                                |
     |                                    |  INSERT INTO cashflow...       |
     |                                    |------------------------------> |
     |                                    |                                |
     |  { success: true }               |                                |
     |<---------------------------------- |                                |
     |                                    |                                |
```

## Why Do We Need a Backend?

### Security
- Passwords are hashed (hidden)
- Database credentials are hidden
- Business rules can't be changed by users

### Data Integrity
- Ensures consistent data
- Prevents duplicate entries
- Validates input

### Scalability
- One server can serve thousands of users
- Can handle complex calculations
- Can connect to multiple databases

## Types of Backends

| Language | Popular Frameworks | Used By |
|----------|-------------------|---------|
| JavaScript | Express, NestJS | Netflix, Uber |
| Python | Django, Flask | Instagram, Pinterest |
| Ruby | Rails | Airbnb, Shopify |
| Go | Gin, Echo | Docker, Kubernetes |

Our Cashflow uses **Node.js** with **Express** - a popular, beginner-friendly framework.

## Key Takeaways

- **Backend** = The server-side of an application
- **Frontend** = The client-side (what users see)
- Backend handles: data processing, business logic, database communication
- Frontend and Backend talk via HTTP (API)

---

## Try It!

In the Cashflow app:
1. Open Developer Tools (F12)
2. Go to Network tab
3. Add a new cashflow entry
4. Watch the request/response between frontend and backend!

---

# Tutorial 3: REST API Basics

## Introduction

API stands for **Application Programming Interface**. It's how two programs talk to each other. REST is a popular style of building APIs.

## What is REST?

REST (Representational State Transfer) is a set of rules for how computers communicate over the web. It's the most common way to build APIs.

## REST API Concepts

### 1. Endpoints (Routes)

An endpoint is a URL where you can access a resource. Think of it like a specific address:

```
https://api.example.com/users
https://api.example.com/cashflow
```

### 2. HTTP Methods

Each endpoint can do different things based on the HTTP method:

| Method | Purpose | Example |
|--------|---------|---------|
| GET | Read/retrieve data | Get all tasks |
| POST | Create new data | Add a new task |
| PUT | Update existing data | Edit a task |
| DELETE | Remove data | Delete a task |

### 3. JSON Data Format

APIs typically send data in JSON (JavaScript Object Notation):

```json
{
  "name": "Groceries",
  "amount": 150.00,
  "type": "expense"
}
```

## Cashflow API Examples

Let's look at the actual Cashflow API:

### Get All Cashflow Entries
```
GET /api/v1/cashflow
```

Response:
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Groceries", "amount": 150 },
    { "id": 2, "name": "Salary", "amount": 5000 }
  ]
}
```

### Add New Entry
```
POST /api/v1/cashflow
```

Request body:
```json
{
  "name": "Gas",
  "amount": 50,
  "type": "expense"
}
```

Response:
```json
{
  "success": true,
  "data": { "id": 3, "name": "Gas", "amount": 50, "type": "expense" }
}
```

### Delete Entry
```
DELETE /api/v1/cashflow/3
```

Response:
```json
{
  "success": true,
  "message": "Deleted successfully"
}
```

## REST Best Practices

| Rule | Example |
|------|---------|
| Use nouns for resources | `/users`, `/tasks` |
| Use plural forms | `/tasks` not `/task` |
| Use proper HTTP methods | GET for reading, POST for creating |
| Return proper status codes | 200 = OK, 201 = Created, 404 = Not Found, 500 = Error |

## Status Codes to Know

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (new resource) |
| 400 | Bad Request (your fault) |
| 401 | Unauthorized (not logged in) |
| 404 | Not Found |
| 500 | Server Error (not your fault) |

## Key Takeaways

- **API** = How two programs talk
- **REST** = A popular style of building APIs
- **Endpoint** = A specific URL
- **JSON** = The data format used
- **HTTP Methods**: GET (read), POST (create), PUT (update), DELETE (remove)

---

## Try It!

In your browser, visit:
```
https://your-server/api/v1/cashflow?password=10716255
```

You'll see the raw JSON response from the Cashflow API!

---

# Tutorial 4: Database Fundamentals

## Introduction

A database is like a highly organized digital filing cabinet. It stores and manages data efficiently.

## Types of Databases

### Relational (SQL)
Data is stored in tables with rows and columns. Like a spreadsheet.

| id | name | amount | type |
|----|------|--------|------|
| 1 | Groceries | 150 | expense |
| 2 | Salary | 5000 | income |

**Popular SQL databases**: MySQL, PostgreSQL, SQLite

### Non-Relational (NoSQL)
Data is stored in flexible documents, key-value pairs, or graphs.

**Popular NoSQL databases**: MongoDB, Redis, Cassandra

Our Cashflow app uses **SQLite** - a simple, file-based SQL database.

## Key Concepts

### 1. Tables
A table is like a single spreadsheet. Each table has:
- **Columns** (fields): The type of data (name, amount, date)
- **Rows** (records): Individual entries

### 2. Records
A row in a table = one record. Example: One cashflow entry.

### 3. Primary Key
A unique identifier for each row. Usually called `id`.

### 4. Queries
Commands to interact with data. The main ones:

| Query | What it does |
|-------|-------------|
| SELECT | Retrieve data |
| INSERT | Add new data |
| UPDATE | Modify existing data |
| DELETE | Remove data |

## SQL Examples from Cashflow

### See all cashflow entries
```sql
SELECT * FROM cashflow;
```

### Add a new entry
```sql
INSERT INTO cashflow (name, amount, type) 
VALUES ('Gas', 50, 'expense');
```

### Update an entry
```sql
UPDATE cashflow 
SET amount = 75 
WHERE id = 3;
```

### Delete an entry
```sql
DELETE FROM cashflow 
WHERE id = 3;
```

### Filter data
```sql
SELECT * FROM cashflow 
WHERE type = 'expense';
```

## The Cashflow Database

Our Cashflow app has these tables:

### cashflow table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Unique ID |
| name | TEXT | Entry name |
| amount | REAL | Money amount |
| type | TEXT | income or expense |
| date | TEXT | Date string |
| created_at | TEXT | Timestamp |

### tasks table
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Task ID (e.g., "001") |
| name | TEXT | Task name |
| description | TEXT | Task details |
| status | TEXT | backlog/in_progress/done |
| priority | TEXT | low/medium/high |
| date | TEXT | Due date |

## Key Takeaways

- **Database** = Organized data storage
- **SQL** = Language to interact with relational databases
- **Table** = A collection of records
- **Row** = One record (like one cashflow entry)
- **Column** = A specific type of data
- **CRUD** = Create, Read, Update, Delete

---

## Try It!

You can actually see the database! In the server:

```bash
sqlite3 /var/www/cashflow-manager/backend/db/cashflow.db
```

Then type:
```sql
SELECT * FROM cashflow LIMIT 5;
```

(Press Ctrl+C to exit)

---

# Tutorial 5: Server Setup

## Introduction

A server is a computer that runs continuously, waiting to handle requests. Let's learn how to set one up!

## What is Node.js?

Node.js is JavaScript that runs on the server (instead of in a browser). It allows you to build backend applications using JavaScript.

### Why Node.js?
- Same language as frontend (JavaScript)
- Fast and efficient
- Great for handling many simultaneous connections
- Huge ecosystem of packages (npm)

## What is Express?

Express is a Node.js framework that makes building APIs easier. It's like a toolkit for creating web servers.

## Setting Up a Simple Server

Here's the simplest Express server:

```javascript
const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

Let's break this down:

### 1. Import Express
```javascript
const express = require('express');
```

### 2. Create the app
```javascript
const app = express();
```

### 3. Define a route (endpoint)
```javascript
app.get('/', (req, res) => {
  res.send('Hello World!');
});
```
- `app.get()` = Handle GET requests
- `'/'` = The URL path
- `(req, res)` = The function that handles the request

### 4. Start the server
```javascript
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## The Cashflow Server Structure

Our Cashflow backend is organized like this:

```
backend/
├── server.js          # Main server file
├── routes/            # API route definitions
│   └── v1/
│       ├── cashflow.js
│       └── tasks.js
├── repositories/     # Database operations
│   ├── cashflow.repository.js
│   └── tasks.repository.js
├── middleware/       # Request processing
├── utils/           # Helper functions
└── db/              # Database files
    ├── cashflow.db
    └── schema.sql
```

## Running the Server

### Development Mode
```bash
cd /var/www/cashflow-manager/backend
node server.js
```

### Production Mode (with PM2)
```bash
pm2 start server.js
```

PM2 keeps the server running even if it crashes!

## Environment Variables

Sensitive information shouldn't be hardcoded. We use `.env` files:

```env
PORT=3001
DATABASE_URL=./db/cashflow.db
SECRET_KEY=your-secret-key-here
```

In code:
```javascript
const PORT = process.env.PORT || 3000;
```

## Key Takeaways

- **Node.js** = JavaScript on the server
- **Express** = Framework for building servers
- **Route** = An endpoint that handles specific requests
- **PM2** = Process manager that keeps servers running
- **Environment variables** = Configuration that changes per environment

---

## Try It!

Create your own simple server:

1. Create a folder: `mkdir my-server`
2. Initialize: `npm init -y`
3. Install Express: `npm install express`
4. Create `index.js` with the code above
5. Run: `node index.js`
6. Visit: `http://localhost:3000`

---

# Tutorial 6: API Routes

## Introduction

Routes define what happens when a specific URL is accessed. Let's see how Cashflow implements API routes!

## Route Structure

In Express, routes follow this pattern:
```javascript
app.METHOD('URL', handlerFunction);
```

Example:
```javascript
app.get('/api/cashflow', getAllCashflow);
app.post('/api/cashflow', createCashflow);
app.put('/api/cashflow/:id', updateCashflow);
app.delete('/api/cashflow/:id', deleteCashflow);
```

## Cashflow Routes Example

Let's look at the actual Cashflow routes:

### Get All Entries
```javascript
// routes/v1/cashflow.js
router.get('/', (req, res) => {
  const cashflow = cashflowRepo.findAll();
  res.json(cashflow);
});
```

### Add New Entry
```javascript
router.post('/', (req, res) => {
  const { name, amount, type, date } = req.body;
  const newEntry = cashflowRepo.create({ name, amount, type, date });
  res.json(newEntry);
});
```

### Update Entry
```javascript
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, amount, type, date } = req.body;
  cashflowRepo.update(id, { name, amount, type, date });
  res.json({ success: true });
});
```

## Understanding req and res

### req (Request)
Contains data sent by the client:

| Property | What's in it |
|----------|-------------|
| req.params | URL parameters (`:id`) |
| req.query | Query string (`?name=value`) |
| req.body | Request body (JSON data) |
| req.headers | HTTP headers |

### res (Response)
What we send back:

| Method | What it does |
|--------|-------------|
| res.json() | Send JSON data |
| res.send() | Send text/HTML |
| res.status(404) | Set status code |
| res.redirect() | Redirect to another URL |

## URL Parameters

The `:id` in the URL is a parameter:

```
PUT /api/cashflow/5
```

In code:
```javascript
router.put('/:id', (req, res) => {
  const id = req.params.id;  // = "5"
  // ...
});
```

## Query Strings

Optional data in the URL:

```
GET /api/cashflow?type=expense&limit=10
```

In code:
```javascript
router.get('/', (req, res) => {
  const type = req.query.type;    // = "expense"
  const limit = req.query.limit; // = "10"
  // ...
});
```

## Middleware

Middleware functions run before routes. They can:
- Validate input
- Check authentication
- Log requests
- Modify request/response

Example:
```javascript
const logger = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next(); // Continue to the route
};

app.use(logger);
```

## Key Takeaways

- **Route** = URL + Handler function
- **req.params** = URL parameters (`:id`)
- **req.query** = Query string data
- **req.body** = JSON data from request
- **Middleware** = Functions that run before routes

---

## Try It!

Open the Cashflow route file:
```bash
cat /var/www/cashflow-manager/backend/routes/v1/cashflow.js
```

Try to identify:
- How many routes are defined?
- What HTTP methods are used?
- What does each route do?

---

# Tutorial 7: Database Queries

## Introduction

Now we know about databases and routes. Let's see how they connect - the repository pattern!

## Repository Pattern

A repository is a layer between routes and the database. It handles all database operations.

```
Routes → Repository → Database
```

## Cashflow Repository

Let's look at the actual Cashflow repository:

### File Location
```
backend/repositories/cashflow.repository.js
```

### Find All Entries
```javascript
findAll() {
  const db = openDb();
  return db.prepare('SELECT * FROM cashflow ORDER BY date DESC').all();
}
```

### Find by ID
```javascript
findById(id) {
  const db = openDb();
  return db.prepare('SELECT * FROM cashflow WHERE id = ?').get(id);
}
```

### Create Entry
```javascript
create({ name, amount, type, date }) {
  const db = openDb();
  const stmt = db.prepare(`
    INSERT INTO cashflow (name, amount, type, date, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);
  const result = stmt.run(name, amount, type, date);
  return this.findById(result.lastInsertRowid);
}
```

### Update Entry
```javascript
update(id, { name, amount, type, date }) {
  const db = openDb();
  const stmt = db.prepare(`
    UPDATE cashflow
    SET name = ?, amount = ?, type = ?, date = ?
    WHERE id = ?
  `);
  return stmt.run(name, amount, type, date, id);
}
```

### Delete Entry
```javascript
delete(id) {
  const db = openDb();
  const stmt = db.prepare('DELETE FROM cashflow WHERE id = ?');
  return stmt.run(id);
}
```

## SQL Commands Explained

### SELECT - Read Data
```sql
SELECT * FROM cashflow
```
`*` means "all columns"

### WHERE - Filter
```sql
SELECT * FROM cashflow WHERE type = 'expense'
```

### ORDER BY - Sort
```sql
SELECT * FROM cashflow ORDER BY date DESC
```
`DESC` = descending (newest first)

### INSERT - Create
```sql
INSERT INTO cashflow (name, amount) VALUES ('Gas', 50)
```

### UPDATE - Modify
```sql
UPDATE cashflow SET amount = 75 WHERE id = 5
```

### DELETE - Remove
```sql
DELETE FROM cashflow WHERE id = 5
```

## Parameterized Queries

Important: Always use `?` placeholders to prevent SQL injection!

```javascript
// ✅ Safe
db.prepare('SELECT * FROM cashflow WHERE id = ?').get(id);

// ❌ Dangerous - Don't do this!
// db.prepare('SELECT * FROM cashflow WHERE id = ' + id)
```

## Using in Routes

Here's how routes use the repository:

```javascript
// routes/v1/cashflow.js
const cashflowRepo = require('../repositories/cashflow.repository');

router.get('/', (req, res) => {
  try {
    const data = cashflowRepo.findAll();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## Key Takeaways

- **Repository** = Handles all database operations
- **CRUD** = Create, Read, Update, Delete
- **Parameterized queries** = Use `?` to prevent SQL injection
- **try/catch** = Always handle errors

---

## Try It!

Check the tasks repository:
```bash
cat /var/www/cashflow-manager/backend/repositories/tasks.repository.js
```

Compare it to the cashflow repository. What similarities do you see?

---

# Tutorial 8: Authentication

## Introduction

Authentication verifies who users are. Let's learn how the Cashflow app handles it!

## How Cashflow Does It

The Cashflow app uses a simple password-based authentication:

### The Password Check
```javascript
// In routes, before processing requests
const { password } = req.query;

if (password !== '10716255') {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

This is a simple approach - not for production, but good for learning!

## Authentication Concepts

### 1. Passwords
Never store passwords as plain text! Use hashing:

```javascript
// Hash a password
const hashed = bcrypt.hash('mypassword', 10);

// Verify
bcrypt.compare('mypassword', hashed); // true
```

### 2. Tokens (JWT)
After login, send a token instead of password:

```
User logs in → Server sends token (JWT)
User requests → "Here my token" → Server verifies
```

JWT structure: `header.payload.signature`

### 3. Sessions
Server remembers logged-in users:

```
Browser → "I'm logged in as Kevin" → Server ✓
```

## Types of Authentication

| Type | How it works | Example |
|------|-------------|---------|
| Basic | Username + password | API key |
| Session | Server remembers user | Web logins |
| Token (JWT) | Token sent with requests | Mobile apps |
| OAuth | Third-party login | "Login with Google" |

## Better Auth in Cashflow

Here's how to make auth more secure:

### 1. Hash Passwords
```javascript
const bcrypt = require('bcrypt');

async function login(password) {
  const storedHash = getUserHash();
  return await bcrypt.compare(password, storedHash);
}
```

### 2. Use JWT Tokens
```javascript
const jwt = require('jsonwebtoken');

function generateToken(user) {
  return jwt.sign(
    { userId: user.id },
    'secret-key',
    { expiresIn: '24h' }
  );
}
```

### 3. Middleware for Protected Routes
```javascript
function authenticate(req, res, next) {
  const token = req.headers.authorization;
  
  try {
    const decoded = jwt.verify(token, 'secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Use middleware
router.get('/protected', authenticate, (req, res) => {
  res.json({ message: 'You are authorized!' });
});
```

## Session vs Token

### Sessions (Stateful)
- Server stores user info
- Good for web apps
- Can scale with session store (Redis)

### Tokens (Stateless)
- No server storage needed
- Good for APIs, mobile apps
- Can't be "logged out" remotely

## Key Takeaways

- **Authentication** = Verifying who you are
- **Password hashing** = Never store plain passwords
- **JWT** = JSON Web Token for stateless auth
- **Middleware** = Protect routes with auth checks

---

## Try It!

Check how the backend handles the password:

```bash
grep -n "password" /var/www/cashflow-manager/backend/routes/v1/cashflow.js
```

Can you find where the password check happens?

---

# Tutorial 9: Security Basics

## Introduction

Security is crucial in backend development. Let's learn common vulnerabilities and how to prevent them!

## Common Security Threats

### 1. SQL Injection

**What it is:** Attackers insert malicious SQL code through input fields.

**Bad code:**
```javascript
// ❌ Never do this!
const query = "SELECT * FROM users WHERE name = '" + name + "'";
```

**Attack:** User enters: `' OR '1'='1`
Results in: `SELECT * FROM users WHERE name = '' OR '1'='1'`
This returns ALL users!

**Fixed code:**
```javascript
// ✅ Use parameterized queries
const stmt = db.prepare('SELECT * FROM users WHERE name = ?');
const user = stmt.get(name);
```

### 2. XSS (Cross-Site Scripting)

**What it is:** Attackers inject JavaScript into web pages.

**Bad code:**
```javascript
// ❌ Never render raw user input
res.send('<h1>Hello ' + userName + '</h1>');
```

**Attack:** User enters: `<script>stealCookies()</script>`

**Fixed code:**
```javascript
// ✅ Escape HTML
const escapeHtml = (str) => {
  return str.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
};
res.send('<h1>Hello ' + escapeHtml(userName) + '</h1>');
```

### 3. Input Validation

**What it is:** Never trust user input - always validate!

```javascript
// ✅ Validate input
function validateCashflow(data) {
  if (typeof data.amount !== 'number' || data.amount < 0) {
    throw new Error('Invalid amount');
  }
  if (!['income', 'expense'].includes(data.type)) {
    throw new Error('Invalid type');
  }
  return true;
}
```

### 4. Rate Limiting

**What it is:** Prevent abuse by limiting requests.

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per window
});

app.use(limiter);
```

### 5. HTTPS

Always use HTTPS in production!

```javascript
// In production, redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (!req.secure) {
    return res.redirect('https://' + req.hostname + req.url);
  }
  next();
});
```

## Security Headers

Add security headers to protect against attacks:

```javascript
const helmet = require('helmet');
app.use(helmet());
```

This adds headers like:
- `X-Frame-Options` - Prevents clickjacking
- `X-Content-Type-Options` - Prevents MIME sniffing
- `X-XSS-Protection` - XSS filter

## Environment Variables

Never commit secrets to code!

```env
# ✅ Good - use .env file
DB_PASSWORD=secret123

# ❌ Bad - never in code!
const password = "secret123";
```

## Security Checklist

| Threat | Protection |
|--------|------------|
| SQL Injection | Parameterized queries |
| XSS | Escape HTML, sanitize input |
| CSRF | Use tokens |
| Rate Limiting | express-rate-limit |
| HTTPS | Use SSL/TLS certificate |
| Secrets | Environment variables |

## Key Takeaways

- **Validate input** = Never trust user data
- **Parameterized queries** = Prevent SQL injection
- **Escape output** = Prevent XSS
- **Use HTTPS** = Encrypt all traffic
- **Environment variables** = Keep secrets safe

---

## Try It!

Check if Cashflow uses any security measures:

```bash
grep -n "helmet\|rateLimit\|validate" /var/www/cashflow-manager/backend/server.js
```

---

# Tutorial 10: Deployment

## Introduction

Deployment is the process of making your application available to users. Let's learn how to deploy the Cashflow app!

## Deployment Overview

```
Development (your computer) → Staging (testing) → Production (live)
```

## Our Server Setup

Here's what runs on our server:

| Component | Purpose |
|-----------|---------|
| PM2 | Keeps Node.js apps running |
| Nginx | Web server, handles HTTPS |
| Ubuntu | Operating system |

## Steps to Deploy

### 1. Build the Frontend
```bash
cd /var/www/cashflow-manager/frontend
npm run build
```

This creates optimized files in `dist/` folder.

### 2. Start/Restart the Backend
```bash
# Using PM2
pm2 restart cashflow-backend

# Or start if not running
pm2 start server.js --name cashflow-backend
```

### 3. PM2 Commands

| Command | What it does |
|---------|-------------|
| `pm2 start app.js` | Start an app |
| `pm2 restart app` | Restart |
| `pm2 stop app` | Stop |
| `pm2 list` | Show all apps |
| `pm2 logs` | View logs |
| `pm2 monit` | Monitor in real-time |

### 4. Nginx Configuration

Nginx serves the frontend and forwards API requests to the backend.

Example config:
```nginx
server {
    listen 80;
    server_name example.com;
    
    # Frontend
    location / {
        root /var/www/cashflow-manager/frontend/dist;
        try_files $uri /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
    }
}
```

### 5. SSL/HTTPS

Using Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Production Best Practices

### 1. Use Environment Variables
```env
NODE_ENV=production
PORT=3001
DB_PATH=/var/www/.../cashflow.db
```

### 2. Logging
```javascript
const logger = require('winston');
logger.add(new logger.transports.File({ filename: 'error.log', level: 'error' }));
```

### 3. Monitoring
```bash
pm2 install pm2-logrotate
pm2 install pm2-axon
pm2 install pm2-cloudwatch
```

### 4. Backups
```bash
# Backup database
cp /var/www/cashflow-manager/backend/db/cashflow.db /backup/cashflow-$(date +%Y%m%d).db
```

## Our Current Setup

```
Server (46.225.69.45)
├── PM2
│   ├── cashflow-backend (port 3001)
│   └── find-your-seat (port 3002)
├── Nginx (ports 80, 443)
│   ├── / → cashflow-frontend
│   ├── /api → cashflow-backend
│   └── /find-your-seat → find-your-seat-frontend
└── SQLite Database
```

## Key Takeaways

- **PM2** = Keeps Node.js apps running and monitors them
- **Nginx** = Web server, handles HTTPS, forwards requests
- **Environment variables** = Configuration for different environments
- **Build** = Optimize frontend for production
- **Backups** = Always have backups!

---

## Try It!

Check what's running on our server:

```bash
pm2 list
```

This shows all the apps PM2 is managing!

---

## Congratulations! 🎉

You've completed the Backend Tutorial Series!

### What You've Learned:
1. ✅ How the web works (HTTP, requests, responses)
2. ✅ What is a backend
3. ✅ REST APIs
4. ✅ Databases (SQL, SQLite)
5. ✅ Server setup (Node.js, Express)
6. ✅ API routes
7. ✅ Database queries
8. ✅ Authentication
9. ✅ Security basics
10. ✅ Deployment

### Next Steps:
- Ask Emily questions anytime!
- Try hands-on exercises
- Explore the actual code
- Build your own small project

Happy learning! 🚀
