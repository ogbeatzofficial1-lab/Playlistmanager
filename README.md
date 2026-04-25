# OGBeatz Production Hub 🎵

OGBeatz Production Hub is a professional, high-performance web application designed for music producers to manage their tracks, curate playlists for clients, and track engagement analytics in real-time.

![App Preview](https://picsum.photos/seed/studio/1200/400)

## 🚀 Features

### 📊 Professional Dashboard
- **Real-time Analytics**: Track total plays, engagement rates, and monthly growth using interactive Area Charts.
- **Quick Stats**: At-a-glance view of total tracks, active clients, and engagement metrics.
- **Activity Feed**: Stay updated with recent client interactions, downloads, and likes.

### 🎵 Music Library & Management
- **Track Organization**: View and filter your entire catalog with metadata like BPM, Key, and Genre.
- **Instant Playback**: Preview tracks directly from the library with the integrated global player.
- **Status Tracking**: Manage track states from 'Draft' to 'Sent' to 'Ready'.

### 📂 Playlist Curation
- **Client-Specific Playlists**: Create and manage curated collections for specific artists or labels.
- **Visual Organization**: High-quality cover art and track counts for easy navigation.

### 👥 Client Management
- **Relationship Hub**: Manage client contact info and track their active playlists.
- **Presence Indicators**: See which clients are currently online.
- **Direct Messaging**: Integrated chat interface for seamless communication with collaborators.

### 🔊 Global Player Experience
- **Persistent Playback**: Listen to tracks while navigating through different sections of the app.
- **Interactive Controls**: Play/Pause, Skip, and Seek functionality.
- **Social Features**: One-click sharing and downloading for professional workflows.

---

## 🛠️ Technology Stack

- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS 4.0
- **Animations**: Motion (formerly Framer Motion)
- **Icons**: Lucide React
- **Charts**: Recharts
- **Notifications**: Sonner
- **Type Safety**: TypeScript

---

## ⚙️ Setup Instructions

### Prerequisites
- Node.js (v20 or higher recommended)
- npm or yarn

### Installation

1. **Clone the repository** (or download the source):
   ```bash
   git clone <repository-url>
   cd ogbeatz-hub
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Variables**:
   Create a `.env` file in the root directory before building:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GEMINI_API_KEY=your_gemini_key
   VITE_SUPABASE_IMAGE_BUCKET=assets
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

### Building for Production

To create an optimized production build:
```bash
npm run build
```
The output will be in the `dist/` directory.

### InfinityFree Deployment

1. Build the app locally with the `.env` values above in place.
2. Open your InfinityFree account and use FTP or the File Manager.
3. Upload the contents of `dist/` to the `htdocs/` directory.
4. Keep the included `public/.htaccess` file in place so direct page loads resolve to `index.html`.
5. If you ever host the app in a subdirectory instead of the site root, update `base` in `vite.config.ts` before building.

---

## 📁 Project Structure

- `src/App.tsx`: Main application logic and routing.
- `src/components/`: Reusable UI components.
- `src/lib/utils.ts`: Utility functions (Tailwind merging).
- `src/index.css`: Global styles and Tailwind configuration.
- `public/`: Static assets.

---

## 🛡️ Security & Best Practices

- **Responsive Design**: Fully optimized for desktop and mobile workflows.
- **Performance**: Optimized asset loading and smooth transitions using Motion.
- **Accessibility**: Semantic HTML and proper button types for screen readers.

---

Developed with ❤️ for the Music Production Community.
# prohub
# ogbeatz-hub
