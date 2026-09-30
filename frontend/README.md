# Courier — Frontend Application

The frontend is a single-page dashboard built with React 19, Vite, Tailwind CSS v4, and TypeScript. It adheres strictly to the Figma design specification, interacts with the Express backend API, and provides real-time queue visibility with dynamic scheduling workflows.

## Features Implemented

| Feature | Implementation | Description |
|---|---|---|
| Authentication | Google OAuth 2.0 | Hand-rolled OAuth authorization code flow with session persistence via httpOnly cookies. |
| User Profile | Sidebar Profile Row | Renders user avatar, full name, and email with dropdown for Slack connect/disconnect and logout. |
| Dashboard Views | Scheduled & Sent Tabs | Tabbed interface with live item counters, status pills, and empty/loading states. |
| Compose View | Rich Text & Attachments | ContentEditable composer with formatting toolbar, image attachment previews, and modal zoom. |
| Lead Upload | CSV & TXT Parsing | Extracts email addresses automatically, tokenizes into chips, and displays overflow counts. |
| Send Later | DateTime Popover | Custom popover supporting precise datetime-local scheduling and standard presets. |
| Real-time Tracking | Background Polling | 4-second background refresh updating counts and list status without requiring manual page reloads. |
| Notifications | Consolidated Toasts | Distinct warm-orange toast for scheduled events (2s auto-dismiss) and green checkmark toast for deliveries. |
| Search | Elasticsearch Bar | Search input querying the backend Elasticsearch read-projection with instant result filtering. |

## Figma Design Adherence

The UI is built to match the Outbox Labs Figma design tokens without arbitrary styling:

| Token | Value | Usage |
|---|---|---|
| Brand Green | `#00A63E` | Primary action buttons, active navigation accents, success indicators. |
| Text Primary | `#1C1C1C` | Page titles, table rows, message headers. |
| Text Muted | `#636970` | Secondary metadata, placeholders, preview snippets. |
| Border | `#E5E7EB` | Modal wrappers, divider lines, search inputs. |
| Surface Soft | `#FAFAFA` | Rich text composer background, attachment cards. |
| Surface Fill | `#F4F7F5` | Sidebar profile card, input backgrounds. |
| Scheduled Pill | `#FFEDD4` bg, `#FFD6A7` border | Pill badge for pending scheduled emails. |
| Sent Pill | `#F3F4F6` bg, `#E5E7EB` border | Pill badge for delivered emails. |

## Architecture & Folder Structure

```
frontend/
├── public/                 Static assets (favicon.ico, favicon.png)
├── src/
│   ├── api/                Type-safe backend API integration
│   │   ├── client.ts       Fetch wrapper with cookie credential handling
│   │   └── index.ts        Consolidated API service methods
│   ├── assets/             Bundled assets (logo.webp)
│   ├── components/         Reusable UI components
│   │   ├── AccountMenu.tsx Profile dropdown with Slack status and Logout
│   │   ├── DashboardLayout.tsx Main shell with sidebar and mobile drawer
│   │   ├── EmailTable.tsx  Email row rendering, live countdowns, status pills
│   │   ├── ImagePreviewModal.tsx Attachment zoom preview modal
│   │   ├── LoginPage.tsx   Figma-accurate authentication screen
│   │   ├── MessageEditor.tsx ContentEditable rich text editor with toolbar
│   │   ├── RecipientLabel.tsx Dynamic recipient and viewer labeling
│   │   ├── RequireAuth.tsx Route guard verifying authenticated session
│   │   ├── SendLaterPopover.tsx Popover for scheduling future delivery times
│   │   ├── Sidebar.tsx     Sidebar navigation with active tab counters
│   │   ├── SlackConnectPrompt.tsx In-app banner prompting Slack installation
│   │   ├── icons.tsx       Centralized SVG icon library
│   │   └── ui.tsx          Button, Modal, ErrorBanner, and Toast primitives
│   ├── context/
│   │   └── AuthContext.tsx Global user session and sender mailbox state
│   ├── lib/
│   │   ├── format.ts       Date, time, and file size formatting utilities
│   │   └── imageAttachments.ts Client-side image compression and encoding
│   ├── pages/
│   │   ├── ComposePage.tsx Email composer with CSV upload and schedule configuration
│   │   ├── EmailDetailPage.tsx Opened email view with sanitized body and metadata
│   │   └── EmailListPage.tsx Paginated scheduled and sent email table views
│   ├── App.tsx             Application routing and authentication guard
│   ├── index.css           Tailwind theme definitions and base styles
│   ├── main.tsx            React application entrypoint
│   └── types.ts            TypeScript definitions matching backend OpenAPI schemas
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts          Vite build configuration with local API proxy
```

## Running the Frontend

### Prerequisites
* Node.js 20 or newer
* npm

### Step 1: Install Dependencies
```bash
cd frontend
npm ci
```

### Step 2: Start Development Server
```bash
npm run dev
```
Starts the Vite development server on `http://localhost:5173`. Calls to `/api` are automatically proxied to the backend at `http://localhost:4000`.

### Step 3: Production Build
```bash
npm run build
```
Executes TypeScript typechecking (`tsc -b`) and bundles production assets into `dist/`.

### Step 4: Preview Production Build
```bash
npm run preview
```
Serves the built `dist/` directory locally on port 4173.
