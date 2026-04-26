# PlaylistHub: Technical Specification & Integration Guide

## 1. Database Diagram (Logical)

```text
[Profiles]
   |
   * --- * [Tracks]
   |
   * --- * [Playlists] (track_ids array)
   |
   * --- * [Clients]
   |
   * --- * [Playlist_Shares]
   |
   * --- * [Messages]
   |
   * --- * [Activity_Log]
```

## 2. API Endpoint Mapping (Supabase Client)

Since we are using the Supabase client directly, these are the primary operations:

### Dashboard
- **Stats**: `rpc('get_dashboard_stats')` or multiple `.select().count()` calls.
- **Recent Activity**: `from('activity_log').select('*').limit(10).order('created_at', { ascending: false })`

### Tracks
- **Upload**: `supabase.storage.from('tracks').upload(path, file)`
- **Save Metadata**: `from('tracks').insert({ ... })`
- **List**: `from('tracks').select('*')`

### Playlists
- **Create**: `from('playlists').insert({ name, track_ids, color_from, color_to, image_url })`
- **Add Track**: update the playlist `track_ids` array
- **Share**: `from('playlist_shares').insert({ playlist_id, client_id })`

### Messaging
- **Send**: `from('messages').insert({ sender_id, recipient_id, content })`
- **Stream**: `supabase.channel('messages').on('postgres_changes', ...).subscribe()`

## 3. Authentication Flow

1. **Admin Sign-up**:
   - Call `supabase.auth.signUp`.
   - Trigger (PostgreSQL) automatically creates a `profiles` entry.
2. **Client Records**:
   - The Clients page stores contact info and activity locally in Supabase tables.

## 4. File Upload & Waveform Workflow

1. **Client-side**: User selects audio file.
2. **Analysis**: Use `Web Audio API` to calculate duration and generate waveform peaks (array of numbers).
3. **Storage**: Upload file to `tracks` bucket.
4. **Database**: Save track record with `file_path` and `waveform_data`.

## 5. Deployment Checklist (InfinityFree)

1. **Build**: Run `npm run build` to generate the `dist/` folder.
2. **FTP**: Upload all files from `dist/` to the `htdocs/` folder on InfinityFree.
3. **Routing**: Keep the generated `.htaccess` file in `dist/` so Apache can route SPA requests back to `index.html`.
4. **Share Preview**: Keep `share.php` in `dist/`. That file renders the Open Graph tags that make pasted share links show the correct playlist or track preview.
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

## 6. Logo Integration

- **Format**: SVG preferred for scalability.
- **Placement**: Top-left of Sidebar and Login screen.
- **Sizing**: 
  - Sidebar: `h-8 w-auto`
  - Login: `h-16 w-auto mb-8`
- **CSS**: Use `object-contain` to ensure aspect ratio.
