# Supabase Configuration & Security Guide

This document outlines the security and storage configuration required for **PlaylistHub**.

## 1. Access Model

This project is currently set up as a single-user admin dashboard. You do not need producer/client-scoped RLS to get it running.

If you later add multi-user auth, start with a simple `profiles.id = auth.uid()` policy for profile edits and add table-specific policies only after the auth flow is finalized.

The current schema disables RLS on the app tables so the anonymous browser client can load tracks, playlists, clients, and shares without auth.

---

## 2. Storage Buckets

Create the following buckets in the Supabase Dashboard:

### `tracks`
- **Public**: No
- **MIME Types**: `audio/mpeg`, `audio/wav`, `audio/x-wav`, `audio/flac`
- **Max File Size**: 50MB
- **RLS Policy**: Optional for now. The app uploads audio files into this bucket from the client.

### `assets` (Logos, Avatars, Covers)
- **Public**: Yes
- **MIME Types**: `image/png`, `image/jpeg`, `image/svg+xml`
- **Max File Size**: 5MB

---

## 3. Recommended Settings

- **JWT Expiry**: 3600 seconds (1 hour).
- **Rate Limits**: Enable standard Supabase rate limiting for Auth and API.
- **Email Templates**:
  - **Invite Client**: "You've been invited to collaborate on PlaylistHub. View your playlist here: {{ .ShareLink }}"

---

## 4. Setup Instructions (Newbie Breakdown)

### Step 1: Create Your Supabase Project
1.  Go to [supabase.com](https://supabase.com) and sign in (you can use your GitHub account).
2.  Click **"New Project"**.
3.  Choose a **Name** (e.g., `PlaylistHub`), a **Database Password** (save this!), and pick the **Region** closest to you.
4.  Wait a minute or two for Supabase to finish setting up your new database.

### Step 2: Run the SQL Schema (The "Brain" of your App)
This step tells Supabase what tables you need (like `tracks`, `playlists`, and `profiles`).
1.  In your Supabase Dashboard, look for the **"SQL Editor"** icon on the left sidebar (it looks like a `>_` symbol).
2.  Click **"New Query"**.
3.  Open the `schema.sql` file from your project code, copy **everything** inside it, and paste it into the Supabase SQL Editor.
4.  Click **"Run"**. You should see a "Success" message. This creates all your tables and the automatic profile trigger I added for you.

### Step 3: Enable Authentication
This allows your users to sign up and log in.
1.  Go to the **"Authentication"** tab (the user icon on the left).
2.  Click **"Providers"**.
3.  Ensure **"Email"** is enabled.
4.  *(Optional for testing)*: Under **"Auth Settings"**, you can disable **"Confirm Email"** so you don't have to wait for an email to finish signing up while you're still building.

### Step 4: Set Up Storage (For your Audio and Images)
Supabase Storage is where your actual files (MP3s, WAVs, Cover Art) will live.
1.  Go to the **"Storage"** tab (the bucket icon on the left).
2.  Click **"New Bucket"** and create these two:
    *   **`tracks`**: Keep this **Private** if you want to restrict direct file access.
    *   **`assets`**: Make this **Public** (for profile pictures and playlist covers).
3.  *(Advanced)*: You can follow the instructions in `supabase_config.md` later to add "Row Level Security" (RLS) to these buckets so only the right people can download the music.

### Step 5: Connect Supabase to your App
Now you need to tell your app how to talk to your Supabase project.
1.  Go to **"Project Settings"** (the gear icon) -> **"API"**.
2.  Find your **Project URL** and your **`anon` public key**.
3.  In your **AI Studio** environment:
    *   Open the **"Settings"** menu (top right).
    *   Go to **"Secrets"**.
    *   Add two new secrets:
        *   `VITE_SUPABASE_URL`: (Paste your Project URL here)
        *   `VITE_SUPABASE_ANON_KEY`: (Paste your `anon` key here)
