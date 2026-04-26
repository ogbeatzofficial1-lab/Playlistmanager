<?php
declare(strict_types=1);

const SUPABASE_URL = 'https://dahbvlcemaoksgklkgah.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhaGJ2bGNlbWFva3Nna2xrZ2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDk0MDcsImV4cCI6MjA4NjA4NTQwN30.bOAEJqVzLQlo9IxnyIyUM9vvdFLEarijPXECqktpG94';
const SITE_NAME = 'OGBeatz Hub';
const DEFAULT_PREVIEW_IMAGE = '/hero-ogbeatz.jpg';

function h(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function base_url(): string
{
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['SERVER_PORT']) && (string)$_SERVER['SERVER_PORT'] === '443');
    $scheme = $https ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';

    return $scheme . '://' . $host;
}

function absolutize_image_url(?string $url, string $origin): string
{
    if (!$url) {
        return $origin . DEFAULT_PREVIEW_IMAGE;
    }

    if (preg_match('#^https?://#i', $url)) {
        return $url;
    }

    if (strpos($url, '/') === 0) {
        return $origin . $url;
    }

    return $origin . '/' . ltrim($url, '/');
}

function supabase_get_json(string $path): ?array
{
    $url = SUPABASE_URL . $path;
    $headers = [
        'apikey: ' . SUPABASE_ANON_KEY,
        'Authorization: Bearer ' . SUPABASE_ANON_KEY,
        'Accept: application/json',
    ];

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        if ($ch !== false) {
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_TIMEOUT => 5,
            ]);
            $response = curl_exec($ch);
            curl_close($ch);

            if ($response !== false && is_string($response)) {
                $decoded = json_decode($response, true);
                return is_array($decoded) ? $decoded : null;
            }
        }
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", $headers),
            'timeout' => 5,
        ],
    ]);

    $response = @file_get_contents($url, false, $context);
    if ($response === false) {
        return null;
    }

    $decoded = json_decode($response, true);
    return is_array($decoded) ? $decoded : null;
}

function first_row(?array $rows): ?array
{
    if (!$rows || !isset($rows[0]) || !is_array($rows[0])) {
        return null;
    }

    return $rows[0];
}

$origin = base_url();
$shareToken = trim((string)($_GET['share'] ?? $_GET['token'] ?? ''));
$queryString = (string)($_SERVER['QUERY_STRING'] ?? '');
$redirectUrl = $queryString !== '' ? '/index.html?' . $queryString : '/index.html';

$title = SITE_NAME;
$description = 'Listen to shared music from OGBeatz.';
$image = $origin . DEFAULT_PREVIEW_IMAGE;
$pageUrl = $origin . '/';
$clientName = 'Public Link';
$requestedName = trim((string)($_GET['name'] ?? ''));

if ($requestedName !== '') {
    $title = $requestedName . ' | ' . SITE_NAME;
    $description = 'Shared track or playlist from OGBeatz.';
} elseif ($shareToken !== '') {
    $shareLink = first_row(supabase_get_json('/rest/v1/share_links?select=share_token,token,item_type,item_id,item_name,client_name,allow_download,expires_at,cover_image_url,created_at&share_token=eq.' . rawurlencode($shareToken) . '&limit=1'));
    if (!$shareLink) {
        $shareLink = first_row(supabase_get_json('/rest/v1/share_links?select=share_token,token,item_type,item_id,item_name,client_name,allow_download,expires_at,cover_image_url,created_at&token=eq.' . rawurlencode($shareToken) . '&limit=1'));
    }

    $activity = null;
    if (!$shareLink) {
        $activity = first_row(supabase_get_json('/rest/v1/activities?select=type,client_name,playlist_name,track_name,share_token,item_type,item_id,item_name,allow_download,expires_at,cover_image_url,created_at&share_token=eq.' . rawurlencode($shareToken) . '&order=created_at.desc&limit=1'));
    }

    $itemType = $shareLink['item_type'] ?? $activity['item_type'] ?? null;
    $itemId = $shareLink['item_id'] ?? $activity['item_id'] ?? null;
    $itemName = $shareLink['item_name'] ?? $activity['item_name'] ?? $activity['track_name'] ?? $activity['playlist_name'] ?? null;
    $clientName = $shareLink['client_name'] ?? $activity['client_name'] ?? $clientName;
    $coverImage = $shareLink['cover_image_url'] ?? $activity['cover_image_url'] ?? null;

    if ($itemType === 'playlist' && $itemId) {
        $playlist = first_row(supabase_get_json('/rest/v1/playlists?select=id,name,image_url,cover_image_url,track_ids&id=eq.' . rawurlencode((string)$itemId) . '&limit=1'));
        if ($playlist) {
            $itemName = $playlist['name'] ?? $itemName;
            $coverImage = $playlist['image_url'] ?? $playlist['cover_image_url'] ?? $coverImage;
            $trackCount = is_array($playlist['track_ids'] ?? null) ? count($playlist['track_ids']) : null;
            $description = $trackCount !== null
                ? sprintf('%d-track playlist shared with %s.', $trackCount, $clientName)
                : sprintf('Playlist shared with %s.', $clientName);
        } else {
            $description = sprintf('Playlist shared with %s.', $clientName);
        }
    } elseif ($itemType === 'track' && $itemId) {
        $track = first_row(supabase_get_json('/rest/v1/tracks?select=id,name,image_url,artist&id=eq.' . rawurlencode((string)$itemId) . '&limit=1'));
        if ($track) {
            $itemName = $track['name'] ?? $itemName;
            $coverImage = $track['image_url'] ?? $coverImage;
            $description = sprintf('Track shared with %s.', $clientName);
        } else {
            $description = sprintf('Track shared with %s.', $clientName);
        }
    }

    if ($itemName) {
        $title = $itemName . ' | ' . SITE_NAME;
    }

    $pageUrl = $origin . '/share.php?share=' . rawurlencode($shareToken);
    $image = absolutize_image_url($coverImage, $origin);
}

?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,nofollow" />
    <meta property="og:site_name" content="<?= h(SITE_NAME) ?>" />
    <meta property="og:title" content="<?= h($title) ?>" />
    <meta property="og:description" content="<?= h($description) ?>" />
    <meta property="og:url" content="<?= h($pageUrl) ?>" />
    <meta property="og:image" content="<?= h($image) ?>" />
    <meta property="og:image:alt" content="<?= h($title) ?>" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="<?= h($title) ?>" />
    <meta name="twitter:description" content="<?= h($description) ?>" />
    <meta name="twitter:image" content="<?= h($image) ?>" />
    <title><?= h($title) ?></title>
    <script>
      window.addEventListener('DOMContentLoaded', function () {
        var query = <?= json_encode((string)($_SERVER['QUERY_STRING'] ?? '')) ?>;
        var redirectTarget = query ? '/index.html?' + query : '/index.html';
        window.setTimeout(function () {
          window.location.replace(redirectTarget);
        }, 350);
      });
    </script>
    <style>
      :root {
        color-scheme: dark;
      }
      html, body {
        margin: 0;
        min-height: 100%;
        background: #050505;
        color: #f4f4f5;
        font-family: Arial, Helvetica, sans-serif;
      }
      body {
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: 24px;
      }
      .card {
        width: min(680px, 100%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(24, 24, 27, 0.88);
        backdrop-filter: blur(16px);
        border-radius: 24px;
        padding: 28px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
      }
      .logo {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: #111;
        flex: none;
      }
      .logo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      h1 {
        margin: 0;
        font-size: 28px;
        line-height: 1.15;
      }
      p {
        margin: 0;
        color: #a1a1aa;
        line-height: 1.6;
      }
      .meta {
        margin-top: 22px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .pill {
        border-radius: 999px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #d4d4d8;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      a {
        color: #fb923c;
        text-decoration: none;
      }
      .fallback {
        margin-top: 18px;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="brand">
        <div class="logo">
          <img src="/logo.svg" alt="OGBeatz logo" />
        </div>
        <div>
          <h1><?= h($title) ?></h1>
          <p><?= h($description) ?></p>
        </div>
      </div>
      <div class="meta">
        <span class="pill">Shared Link</span>
        <span class="pill"><?= h($clientName) ?></span>
      </div>
      <p class="fallback">
        Opening the share view.
        <noscript><a href="<?= h($redirectUrl) ?>">Continue</a></noscript>
      </p>
    </main>
  </body>
</html>
