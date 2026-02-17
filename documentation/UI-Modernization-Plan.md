# Emily's Web App — UI Modernization Plan
## Migration to shadcn/ui + TypeScript + Geist Font

---

## 1. Objective

Modernize the frontend of Emily's Web App (`/var/www/cashflow-manager/frontend/`) by:

- Replacing all hand-built components with **shadcn/ui** primitives
- Converting from **JavaScript (.jsx)** to **TypeScript (.tsx)**
- Replacing the **Exo 2** font with **Geist** (via Google Fonts)
- Introducing a **design token system** with CSS custom properties (OKLCH)
- Supporting **both light and dark mode** with a user toggle
- Migrating the **ChatWidget's 940-line raw CSS** to Tailwind + shadcn/ui
- Keeping all existing functionality and API integrations intact

---

## 2. Current State Summary

| Aspect | Current |
|--------|---------|
| Framework | React 18.2 + Vite 5.1 |
| Language | JavaScript (.jsx) |
| CSS | Tailwind v4.1 (CSS-first, no config file) |
| Font | Exo 2 (Google Fonts) |
| UI Library | None — all hand-built |
| Theme | Dark-only, ~80 hardcoded Tailwind color classes |
| Chat Styling | 940-line raw CSS file (`styles/chat.css`) with hex colors |
| Design Tokens | None |
| Components | 12 custom components, ~1,461 lines |
| Routing | None — `useState` tab switching |
| State Mgmt | Local `useState` / `useEffect` only |

### File Inventory (21 files)

```
src/
├── main.jsx                    (11 lines)  Entry point
├── index.css                   (7 lines)   Exo 2 import + Tailwind import
├── App.jsx                     (144 lines) Root layout, tabs, auth gate
├── api/
│   ├── cashflow.js             (55 lines)  Cashflow REST client
│   ├── tasks.js                (46 lines)  Tasks REST client
│   └── activity.js             (34 lines)  Activity logs REST client
├── hooks/
│   ├── useAuth.js              (36 lines)  Password auth via localStorage
│   └── useChat.js              (447 lines) WebSocket chat + BroadcastChannel
├── components/
│   ├── PasswordGate.jsx        (47 lines)  Login card
│   ├── SummaryCards.jsx        (25 lines)  3 stat cards
│   ├── FilterBar.jsx           (52 lines)  Category/currency/search filters
│   ├── CashflowTable.jsx       (81 lines)  Cashflow data table
│   ├── TaskTable.jsx           (83 lines)  Task data table
│   ├── TaskModal.jsx           (133 lines) Add/edit task dialog
│   ├── ActivityManager.jsx     (133 lines) Sub-tab container
│   ├── ActivityLogs.jsx        (92 lines)  Activity logs page
│   ├── ActivityLogTable.jsx    (92 lines)  Activity log data table
│   ├── ActivityLogSearch.jsx   (154 lines) Advanced search form
│   ├── ChatWidget.jsx          (508 lines) Dual-mode chat (desktop sidebar + mobile FAB)
│   └── ChatMessage.jsx         (73 lines)  Chat message bubble
└── styles/
    └── chat.css                (940 lines) Raw CSS for entire chat widget
```

---

## 3. Target State

| Aspect | Target |
|--------|--------|
| Framework | React 18.2 + Vite 5.1 (unchanged) |
| Language | **TypeScript (.tsx/.ts)** |
| CSS | Tailwind v4 + **shadcn/ui CSS variables** |
| Font | **Geist Sans + Geist Mono** (Google Fonts) |
| UI Library | **shadcn/ui** (Radix UI primitives) |
| Theme | **Light + Dark** with user toggle, OKLCH tokens |
| Chat Styling | **Migrated to Tailwind** — `chat.css` deleted |
| Design Tokens | Full OKLCH variable system (provided theme) |
| Icons | **Lucide React** (bundled with shadcn) |

### Target File Structure

```
src/
├── main.tsx
├── index.css                    # Full theme variables + Geist font
├── App.tsx
├── api/
│   ├── cashflow.ts
│   ├── tasks.ts
│   └── activity.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useChat.ts
│   └── useTheme.ts             # NEW — light/dark toggle
├── lib/
│   └── utils.ts                # NEW — cn() helper
├── components/
│   ├── ui/                     # NEW — shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── badge.tsx
│   │   ├── scroll-area.tsx
│   │   ├── separator.tsx
│   │   ├── skeleton.tsx
│   │   ├── tooltip.tsx
│   │   └── dropdown-menu.tsx
│   ├── ThemeToggle.tsx         # NEW — dark/light switch button
│   ├── PasswordGate.tsx
│   ├── SummaryCards.tsx
│   ├── FilterBar.tsx
│   ├── CashflowTable.tsx
│   ├── TaskTable.tsx
│   ├── TaskModal.tsx
│   ├── ActivityManager.tsx
│   ├── ActivityLogs.tsx
│   ├── ActivityLogTable.tsx
│   ├── ActivityLogSearch.tsx
│   ├── ChatWidget.tsx
│   └── ChatMessage.tsx
└── (styles/chat.css DELETED)
```

---

## 4. Implementation Phases

### Phase 1: Foundation Setup
**Duration: 2–3 hours | Risk: Low**

This phase sets up all tooling before any component is touched. The app remains fully functional throughout.

#### Step 1.1 — Create feature branch
```bash
cd /var/www/cashflow-manager
git checkout -b feature/shadcn-migration
```

#### Step 1.2 — Convert project to TypeScript
```bash
cd frontend
npm install -D typescript @types/react @types/react-dom
```
- Create `tsconfig.json` with strict mode, JSX preserve, path aliases (`@/*` → `src/*`)
- Create `tsconfig.app.json` for Vite
- Update `vite.config.js` → `vite.config.ts` with `@` path alias:
  ```typescript
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  }
  ```
- Rename all `.jsx` → `.tsx` and `.js` → `.ts` files
- Fix any type errors (minimal — no complex types in current code)

#### Step 1.3 — Install shadcn/ui + dependencies
```bash
npm install clsx tailwind-merge class-variance-authority
npm install lucide-react
npm install @radix-ui/react-slot
npx shadcn@latest init
```
- During init, select: style=new-york, baseColor=neutral, cssVariables=true, tsx=true, rsc=false
- This creates `components.json` and `src/lib/utils.ts` with the `cn()` helper

#### Step 1.4 — Install shadcn/ui components
```bash
npx shadcn@latest add button card dialog input label select \
  table tabs badge scroll-area separator skeleton tooltip dropdown-menu
```
This populates `src/components/ui/` with all needed primitives.

#### Step 1.5 — Replace index.css with full theme
Replace `src/index.css` with:
- Google Fonts import for Geist Sans + Geist Mono
- Tailwind import
- `:root` variables (provided light theme)
- `.dark` variables (provided dark theme)
- `@theme inline` mappings (provided mappings)
- Override `--font-sans` to use Geist:
  ```css
  :root {
    --font-sans: 'Geist', ui-sans-serif, system-ui, ...;
    --font-mono: 'Geist Mono', ui-monospace, ...;
  }
  ```

#### Step 1.6 — Create useTheme hook + ThemeToggle component
- `useTheme.ts`: Reads/writes `localStorage("theme")`, toggles `dark` class on `<html>`, respects `prefers-color-scheme` on first visit
- `ThemeToggle.tsx`: Button with Sun/Moon icons from Lucide, calls `useTheme`

#### Step 1.7 — Verify
- `npm run dev` — app loads, Geist font visible, no errors
- Toggle dark/light mode via dev tools — both themes render
- All existing functionality still works (unchanged components)

---

### Phase 2: Migrate Simple Components
**Duration: 2–3 hours | Risk: Low**

Migrate the 4 simplest components to validate the pattern.

#### Step 2.1 — PasswordGate.tsx (47 lines)
**shadcn components:** Card, CardHeader, CardTitle, CardContent, Input, Button

| Before | After |
|--------|-------|
| `bg-gray-950`, `bg-gray-900`, `border-slate-700` | `bg-background`, Card component |
| `<input className="bg-gray-800 border-slate-600">` | `<Input />` |
| `<button className="border border-slate-600">` | `<Button />` |

#### Step 2.2 — SummaryCards.tsx (25 lines)
**shadcn components:** Card, CardHeader, CardTitle, CardContent

| Before | After |
|--------|-------|
| `border-green-500/50 bg-green-500/10` | Card with semantic color classes |
| `border-red-500/50 bg-red-500/10` | Card with destructive variant |
| `text-green-300`, `text-red-300` | Semantic text colors |

#### Step 2.3 — FilterBar.tsx (52 lines)
**shadcn components:** Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input, Label

| Before | After |
|--------|-------|
| `<select className="bg-gray-800 border-r-8 border-transparent outline ...">` | `<Select><SelectTrigger>` (fixes arrow spacing issue permanently) |
| `<input className="bg-gray-800 border-slate-600">` | `<Input />` |

#### Step 2.4 — Verify
- Cashflow tab renders with new components
- Filters work, search works
- Both light and dark mode look correct

---

### Phase 3: Migrate Data Tables
**Duration: 3–4 hours | Risk: Medium**

All 3 tables share similar patterns. Migrate them together for consistency.

#### Step 3.1 — CashflowTable.tsx (81 lines)
**shadcn components:** Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge, Button
**Lucide icons:** Trash2

| Before | After |
|--------|-------|
| `<table className="border border-slate-700 bg-gray-900 min-w-[800px]">` | `<Table>` |
| `<thead className="bg-slate-800/50">` | `<TableHeader>` |
| `<td className="text-green-400">+₱50,000</td>` | `<Badge variant="default">` for income, `<Badge variant="destructive">` for expense |
| `<button className="text-red-400 border border-red-500/50">Delete</button>` | `<Button variant="ghost" size="icon"><Trash2 /></Button>` |

#### Step 3.2 — TaskTable.tsx (83 lines)
**shadcn components:** Table, Badge, Button, DropdownMenu (for edit/delete actions)
**Lucide icons:** Pencil, Trash2, MoreHorizontal

| Before | After |
|--------|-------|
| Priority colors (`text-red-400`, `text-yellow-400`, `text-green-400`) | Badge with color variants |
| Status badges (custom borders) | `<Badge variant="outline">` |
| Edit/Delete buttons | `<DropdownMenu>` with action items |

#### Step 3.3 — ActivityLogTable.tsx (92 lines)
**shadcn components:** Table, Badge, Tooltip

| Before | After |
|--------|-------|
| Source icons (emoji-based) | Lucide icons with Tooltip |
| Action type colors (6 different colors) | Badge with semantic variants |
| Status badges | `<Badge variant="default">` / `<Badge variant="destructive">` |

#### Step 3.4 — Verify
- All 3 tables render correctly
- Delete/edit actions functional
- Responsive horizontal scroll works
- Light and dark mode both correct

---

### Phase 4: Migrate Forms & Complex Components
**Duration: 3–4 hours | Risk: Medium**

#### Step 4.1 — TaskModal.tsx (133 lines)
**shadcn components:** Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label, Select, Button

| Before | After |
|--------|-------|
| `<div className="fixed inset-0 bg-black/70">` overlay | `<Dialog>` (built-in overlay) |
| Manual focus management | Radix Dialog auto-manages focus |
| `<select className="...">` | `<Select>` (fixes arrow spacing) |

#### Step 4.2 — ActivityLogSearch.tsx (154 lines)
**shadcn components:** Input, Select, Button, Label

| Before | After |
|--------|-------|
| 3 `<select>` elements with arrow fix hacks | 3 `<Select>` components |
| 2 `<input type="date">` | `<Input type="date" />` |
| Search + Reset buttons | `<Button variant="outline">` |

#### Step 4.3 — ActivityLogs.tsx (92 lines)
**shadcn components:** Card, Badge, Button, Separator
**Lucide icons:** RefreshCw

#### Step 4.4 — ActivityManager.tsx (133 lines)
**shadcn components:** Tabs, TabsList, TabsTrigger, TabsContent, Button
**Lucide icons:** Plus

| Before | After |
|--------|-------|
| Custom tab buttons with `useState` | `<Tabs>` component (manages state internally) |
| `border-b-2 border-blue-500` active indicator | Built-in TabsTrigger active styles |

#### Step 4.5 — Verify
- Task add/edit modal works
- Activity log search/filter works
- Sub-tab switching works
- All API operations functional

---

### Phase 5: Migrate App Layout
**Duration: 1–2 hours | Risk: Low**

#### Step 5.1 — App.tsx (144 lines)
**shadcn components:** Tabs, TabsList, TabsTrigger, TabsContent, Button, Separator
**Lucide icons:** LogOut, Sun, Moon
**New components:** ThemeToggle

| Before | After |
|--------|-------|
| `bg-gray-950` / `bg-gray-900` root | `bg-background` |
| `text-white` heading | `text-foreground` |
| `text-slate-400` subtitle | `text-muted-foreground` |
| Custom tab buttons | `<Tabs>` with `<TabsList>` |
| 3/4 + 1/4 flex layout | Keep flex layout, use semantic colors |
| Logout button | `<Button variant="outline">` |

#### Step 5.2 — Add ThemeToggle to header
Place next to Logout button.

#### Step 5.3 — Verify
- Full app renders with shadcn components
- Theme toggle works (light / dark)
- Layout intact on all breakpoints

---

### Phase 6: Migrate Chat Widget
**Duration: 4–6 hours | Risk: High (largest component + separate CSS)**

This is the most complex migration: 508 lines of JSX + 940 lines of raw CSS to Tailwind + shadcn.

#### Step 6.1 — ChatMessage.tsx (73 lines)
**shadcn components:** Card (for message bubbles), Badge (for system messages)

| Before | After |
|--------|-------|
| `.emily-message` (CSS class, `#374151` bg) | `bg-muted` with Card |
| `.user-message` (CSS gradient) | `bg-primary text-primary-foreground` |
| `.system-message` (CSS italic) | `text-muted-foreground italic` |
| `.error-message` (`#7f1d1d` bg) | `bg-destructive/10 text-destructive` |
| Inline style link colors (`#c7d2fe`, `#93c5fd`) | `text-primary underline` |

#### Step 6.2 — ChatWidget.tsx (508 lines)
**shadcn components:** Card, Input, Button, ScrollArea, Badge, Separator, Tooltip, Skeleton
**Lucide icons:** Send, MessageCircle, X, ChevronDown, Loader2

Migration strategy for the 940-line `chat.css`:

| CSS Section | Lines | Tailwind Replacement |
|-------------|-------|---------------------|
| Mobile floating button | ~50 | `fixed bottom-4 right-4` + Button with icon |
| Chat window container | ~80 | Card with `fixed` / `sticky` positioning |
| Header bar | ~60 | `flex items-center justify-between p-3 border-b` |
| Messages area | ~100 | `<ScrollArea>` with flex-col |
| Message bubbles | ~120 | Handled in ChatMessage.tsx |
| Input area | ~80 | `flex gap-2 p-3 border-t` with Input + Button |
| Quick actions | ~60 | `flex gap-2 overflow-x-auto` with small Buttons |
| Typing indicator | ~50 | Skeleton or custom animation |
| Scrollbar styles | ~40 | `<ScrollArea>` handles this |
| Desktop sidebar mode | ~100 | `lg:sticky lg:top-0 lg:h-screen` with Card |
| Mobile overlay mode | ~100 | `fixed inset-0 z-50` with Card |
| Animations/transitions | ~50 | Tailwind `transition-all duration-300` |
| Responsive breakpoints | ~50 | Tailwind `md:` / `lg:` prefixes |

#### Step 6.3 — Delete `styles/chat.css`
Remove the import from ChatWidget.tsx.

#### Step 6.4 — Verify
- Desktop sidebar chat works
- Mobile floating button + overlay works
- WebSocket connection works
- Messages render correctly
- Quick action pills work
- Typing indicator animates
- Scroll behavior correct
- Both light and dark mode

---

### Phase 7: Cleanup & Testing
**Duration: 2–3 hours | Risk: Low**

#### Step 7.1 — Remove dead code
- Delete `styles/chat.css`
- Remove old `.jsx` / `.js` files (replaced by `.tsx` / `.ts`)
- Remove unused Tailwind classes from any remaining inline styles

#### Step 7.2 — Fix type errors
- Run `npx tsc --noEmit` and fix any remaining TypeScript errors
- Add proper types to API response interfaces
- Type the hooks properly

#### Step 7.3 — Build verification
```bash
npm run build
```
Ensure zero errors, check bundle size.

#### Step 7.4 — Visual regression testing
Test every view in both light and dark mode:

| View | Light | Dark |
|------|-------|------|
| Password gate | [ ] | [ ] |
| Cashflow tab (summary + filters + table) | [ ] | [ ] |
| Activity Manager > Tasks tab | [ ] | [ ] |
| Activity Manager > Tasks > Add modal | [ ] | [ ] |
| Activity Manager > Tasks > Edit modal | [ ] | [ ] |
| Activity Manager > Activity Logs tab | [ ] | [ ] |
| Activity Manager > Activity Logs > Search | [ ] | [ ] |
| Chat (desktop sidebar) | [ ] | [ ] |
| Chat (mobile floating) | [ ] | [ ] |
| Chat (mobile expanded) | [ ] | [ ] |

#### Step 7.5 — Functional testing

| Feature | Status |
|---------|--------|
| Login / Logout | [ ] |
| View cashflow entries | [ ] |
| Filter by category / currency / search | [ ] |
| Delete cashflow entry | [ ] |
| View tasks | [ ] |
| Add task | [ ] |
| Edit task | [ ] |
| Delete task | [ ] |
| View activity logs | [ ] |
| Search activity logs | [ ] |
| Filter activity logs by type / status / source / date | [ ] |
| Send chat message | [ ] |
| Receive chat response | [ ] |
| Chat quick actions | [ ] |
| Theme toggle persists after refresh | [ ] |

#### Step 7.6 — Responsive testing
- Mobile (375px)
- Tablet (768px)
- Desktop (1280px+)

#### Step 7.7 — Deploy
```bash
cd /var/www/cashflow-manager/frontend
npm run build
nginx -s reload
```

#### Step 7.8 — Merge
```bash
git add -A
git commit -m "feat: migrate UI to shadcn/ui + TypeScript + Geist font"
git checkout main
git merge feature/shadcn-migration
```

---

## 5. New Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-scroll-area": "^1.2.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.460.0",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.7.0",
    "vite": "^5.1.0"
  }
}
```

---

## 6. Timeline Summary

| Phase | Duration | What Changes |
|-------|----------|-------------|
| **1. Foundation** | 2–3 hrs | TypeScript, shadcn init, Geist font, theme variables, useTheme |
| **2. Simple Components** | 2–3 hrs | PasswordGate, SummaryCards, FilterBar |
| **3. Data Tables** | 3–4 hrs | CashflowTable, TaskTable, ActivityLogTable |
| **4. Forms & Complex** | 3–4 hrs | TaskModal, ActivityLogSearch, ActivityLogs, ActivityManager |
| **5. App Layout** | 1–2 hrs | App.tsx, ThemeToggle, navigation |
| **6. Chat Widget** | 4–6 hrs | ChatWidget, ChatMessage, delete chat.css |
| **7. Cleanup & Test** | 2–3 hrs | TypeScript fixes, visual/functional testing, deploy |
| **Total** | **17–25 hrs** | **~3 working days** |

---

## 7. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| shadcn/ui + Tailwind v4 compatibility | Low | High | shadcn v4 docs confirm support; test in Phase 1 |
| TypeScript conversion breaks runtime | Medium | Medium | Incremental rename + `tsc --noEmit` after each file |
| Chat widget CSS migration misses edge cases | Medium | High | Test all 3 modes (desktop, mobile FAB, mobile expanded) |
| Radix Select breaks existing form logic | Low | Medium | shadcn Select is a drop-in; onValueChange replaces onChange |
| Bundle size increase from Radix | Low | Low | Tree-shaking handles this; monitor with `npm run build` |
| Font loading flash (FOUT) | Low | Low | Use `font-display: swap` in Google Fonts URL |

---

## 8. Rollback Plan

At any point, revert to the working state:
```bash
git checkout main
cd frontend && npm run build
nginx -s reload
```
The feature branch preserves all work for retry.

---

*Document Version: 2.0*
*Created: February 17, 2026*
*Target Completion: February 20, 2026*
