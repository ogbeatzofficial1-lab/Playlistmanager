import { 
  LayoutDashboard, 
  Music, 
  Users, 
  ListMusic, 
  Activity, 
  MessageSquare, 
  Settings, 
  Plus, 
  Search, 
  Play, 
  Clock, 
  Share2, 
  Download, 
  Heart,
  ChevronRight,
  Bell,
  User,
  Filter,
  ThumbsUp,
  ThumbsDown,
  ArrowUpRight,
  ArrowDownRight,
  Pause,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
  X,
  Upload
} from "lucide-react";
import React, { useState } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";
import { cn } from "./lib/utils";
import { supabase } from "./lib/supabase";
import TrackOptionsMenu from "./TrackOptionsMenu";

// --- Types ---

type View = "dashboard" | "tracks" | "playlists" | "clients" | "activity" | "messages" | "settings" | "profile" | "notifications";

interface Track {
  id: string;
  name: string;
  artist: string;
  duration: number;
  bpm: number;
  key_signature: string;
  file_url: string | null;
  image_url?: string | null;
  size: number;
  type: string;
  plays: number;
  likes: number;
  status: "ready" | "sent" | "processing";
  created_at: string;
}

interface Playlist {
  id: string;
  name: string;
  description: string;
  track_ids: string[];
  color_from: string;
  color_to: string;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  status: "online" | "offline";
  lastActive: string;
  activePlaylists: number;
  created_at: string;
}

interface RawClient {
  id: string;
  name?: string | null;
  email?: string | null;
  client_email?: string | null;
  status?: "online" | "offline" | null;
  lastActive?: string | null;
  last_active?: string | null;
  activePlaylists?: number | null;
  active_playlists?: number | null;
  created_at?: string | null;
}

interface ActivityItem {
  id: string;
  type: string;
  client_name: string | null;
  playlist_name: string | null;
  track_name: string | null;
  share_token: string | null;
  item_type?: ShareItemType | null;
  item_id?: string | null;
  item_name?: string | null;
  allow_download?: boolean | null;
  expires_at?: string | null;
  cover_image_url?: string | null;
  created_at: string;
}

type ShareItemType = "playlist" | "track";

interface SharedLink {
  id: string;
  token?: string | null;
  share_token: string;
  item_type: ShareItemType;
  item_id: string;
  item_name: string | null;
  client_name: string | null;
  allow_download: boolean;
  expires_at: string | null;
  cover_image_url: string | null;
  created_at: string;
}

interface DataLoadIssue {
  summary: string;
  details: string[];
}

interface PromoPack {
  youtubeTitle: string;
  youtubeDescription: string;
  instagramCaption: string;
  hashtags: string[];
}

interface ShareLinkOptions {
  expiresAt: string | null;
  allowDownload: boolean;
}

interface RawPlaylist {
  id: string;
  name?: string | null;
  description?: string | null;
  track_ids?: string[] | null;
  color_from?: string | null;
  color_to?: string | null;
  image_url?: string | null;
  cover_image_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const ANALYTICS_DATA = [
  { name: "Mon", plays: 400, engagement: 240 },
  { name: "Tue", plays: 300, engagement: 139 },
  { name: "Wed", plays: 200, engagement: 980 },
  { name: "Thu", plays: 278, engagement: 390 },
  { name: "Fri", plays: 189, engagement: 480 },
  { name: "Sat", plays: 239, engagement: 380 },
  { name: "Sun", plays: 349, engagement: 430 },
];

import { GoogleGenAI } from "@google/genai";

// --- AI Initialization ---
const geminiApiKey =
  import.meta.env.VITE_GEMINI_API_KEY ||
  import.meta.env.VITE_GOOGLE_GENAI_API_KEY ||
  "";

const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;
const supabaseImageBucket = import.meta.env.VITE_SUPABASE_IMAGE_BUCKET || "assets";
const fallbackImageBucket = "tracks";
const PROMO_BRAND = {
  artistName: "OGBeatz",
  instagramHandle: "@ogbeatzofficial",
  youtubeHandle: "@Og-Beatz-rus",
  callToAction: "Subscribe",
  coreHashtags: ["#NewMusic2026", "#MusicVideos", "#WatchNow", "#OGBeatz", "#NewMusic"],
  tone: "mature professional",
  avoidPhrases: [
    "beatmaking",
    "type beat",
    "lease",
    "buy this beat",
    "beatmaker",
  ],
  focusWords: ["producer", "songwriter", "new music"],
};

const DEFAULT_PLAYLIST_COLOR_FROM = "#8B5CF6";
const DEFAULT_PLAYLIST_COLOR_TO = "#EC4899";
const getFileExtensionFromType = (mimeType: string | null | undefined) => {
  if (!mimeType) return "mp3";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("x-wav")) return "wav";
  if (mimeType.includes("flac")) return "flac";
  if (mimeType.includes("aac")) return "aac";
  if (mimeType.includes("ogg")) return "ogg";
  return "mp3";
};

const deriveDisplayNameFromEmail = (email: string) => {
  const [localPart = "Client"] = email.split("@");
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Client";
};

const normalizeClientRow = (client: RawClient): Client => {
  const email = client.email || client.client_email || "";
  const name = client.name || deriveDisplayNameFromEmail(email);

  return {
    id: client.id,
    name,
    email,
    status: client.status === "offline" ? "offline" : "online",
    lastActive: client.lastActive || client.last_active || "Recently",
    activePlaylists: client.activePlaylists ?? client.active_playlists ?? 0,
    created_at: client.created_at || new Date(0).toISOString(),
  };
};

const normalizePlaylistRow = (playlist: RawPlaylist): Playlist => ({
  id: playlist.id,
  name: playlist.name || "Untitled Playlist",
  description: playlist.description || "",
  track_ids: Array.isArray(playlist.track_ids) ? playlist.track_ids : [],
  color_from: playlist.color_from || DEFAULT_PLAYLIST_COLOR_FROM,
  color_to: playlist.color_to || DEFAULT_PLAYLIST_COLOR_TO,
  image_url: playlist.image_url || playlist.cover_image_url || null,
  created_at: playlist.created_at || new Date(0).toISOString(),
  updated_at: playlist.updated_at || playlist.created_at || new Date(0).toISOString(),
});

const formatSupabaseError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return "Unknown Supabase error.";
  }

  const details = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  return [
    details.message,
    details.details,
    details.hint,
    details.code ? `code ${details.code}` : null,
  ]
    .filter(Boolean)
    .join(" | ") || "Unknown Supabase error.";
};

const createShareToken = () => {
  const bytes = new Uint8Array(8);

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return Math.random().toString(36).slice(2, 14);
};

const createSharedTrackPlaceholder = (trackId: string, trackName: string | null): Track => ({
  id: trackId,
  name: trackName || "Shared Track",
  artist: "OGBeatz",
  duration: 0,
  bpm: 0,
  key_signature: "--",
  file_url: null,
  image_url: null,
  size: 0,
  type: "audio/mpeg",
  plays: 0,
  likes: 0,
  status: "ready",
  created_at: "",
});

// --- Components ---

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
      active 
        ? "bg-orange-500/10 text-orange-500 border-r-2 border-orange-500 rounded-r-none" 
        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
    )}
  >
    <Icon size={20} className={cn("transition-transform group-hover:scale-110", active && "text-orange-500")} />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

const StatCard = ({ label, value, trend, icon: Icon }: { label: string, value: string, trend: string, icon: any }) => (
  <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
        <Icon size={20} />
      </div>
      <div className={cn(
        "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
        trend.startsWith("+") ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
      )}>
        {trend.startsWith("+") ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {trend}
      </div>
    </div>
    <div className="text-2xl font-bold text-white mb-1 tracking-tight">{value}</div>
    <div className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">{label}</div>
  </div>
);

const CreateClientModal = ({ isOpen, onClose, onSubmit }: { isOpen: boolean, onClose: () => void, onSubmit: (client: any) => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-xl font-black text-white tracking-tight">ADD NEW CLIENT</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <form className="p-6 space-y-4" onSubmit={(e) => {
          e.preventDefault();
          onSubmit(formData);
        }}>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Client Name</label>
            <input 
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
              placeholder="e.g. Sarah Jenkins"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Email Address</label>
            <input 
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
              placeholder="e.g. sarah@label.com"
            />
          </div>
          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-3 rounded-xl shadow-xl shadow-orange-500/20 transition-all active:scale-95"
            >
              ADD CLIENT
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const CreatePlaylistModal = ({ isOpen, onClose, onSubmit, tracks }: { isOpen: boolean, onClose: () => void, onSubmit: (playlist: any) => void, tracks: Track[] }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    track_ids: [] as string[],
    color_from: '#8B5CF6',
    color_to: '#EC4899',
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        description: '',
        track_ids: [],
        color_from: '#8B5CF6',
        color_to: '#EC4899',
      });
      setSelectedImage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleTrack = (trackId: string) => {
    setFormData(prev => ({
      ...prev,
      track_ids: prev.track_ids.includes(trackId) 
        ? prev.track_ids.filter(id => id !== trackId)
        : [...prev.track_ids, trackId]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-xl font-black text-white tracking-tight">CREATE PLAYLIST</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <form className="p-6 space-y-4" onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ ...formData, image: selectedImage });
        }}>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Playlist Cover</label>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="w-full border border-dashed border-zinc-800 rounded-xl p-4 bg-zinc-950 hover:border-zinc-700 transition-colors text-left"
            >
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
              />
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 flex items-center justify-center">
                  {selectedImage ? (
                    <img
                      src={URL.createObjectURL(selectedImage)}
                      alt="Playlist cover preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music size={24} className="text-zinc-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{selectedImage ? selectedImage.name : "Upload playlist cover"}</p>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mt-1">
                    PNG or JPG album art
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Playlist Name</label>
              <input 
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
                placeholder="e.g. Summer Vibes"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Description</label>
              <input 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
                placeholder="Optional description"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Select Tracks ({formData.track_ids.length})</label>
            <div className="max-h-48 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg divide-y divide-zinc-900">
              {tracks.map(track => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => toggleTrack(track.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2 hover:bg-zinc-900 transition-colors",
                    formData.track_ids.includes(track.id) ? "bg-orange-500/5" : ""
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center text-zinc-500">
                      <Music size={14} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white">{track.name}</p>
                      <p className="text-[10px] text-zinc-500 uppercase">{track.artist}</p>
                    </div>
                  </div>
                  {formData.track_ids.includes(track.id) && (
                    <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                      <Zap size={10} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Start Color</label>
              <input 
                type="color"
                value={formData.color_from}
                onChange={(e) => setFormData({...formData, color_from: e.target.value})}
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-1 py-1 outline-none cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">End Color</label>
              <input 
                type="color"
                value={formData.color_to}
                onChange={(e) => setFormData({...formData, color_to: e.target.value})}
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-1 py-1 outline-none cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-3 rounded-xl shadow-xl shadow-orange-500/20 transition-all active:scale-95"
            >
              CREATE PLAYLIST
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const EditPlaylistModal = ({
  isOpen,
  onClose,
  playlist,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist | null;
  onSubmit: (playlistId: string, updates: Partial<Playlist> & { image?: File | null }) => void;
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color_from: "#8B5CF6",
    color_to: "#EC4899",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImage]);

  React.useEffect(() => {
    if (!isOpen || !playlist) return;
    setFormData({
      name: playlist.name || "",
      description: playlist.description || "",
      color_from: playlist.color_from || "#8B5CF6",
      color_to: playlist.color_to || "#EC4899",
    });
    setSelectedImage(null);
  }, [isOpen, playlist]);

  if (!isOpen || !playlist) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-xl font-black text-white tracking-tight">EDIT PLAYLIST</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <form
          className="p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(playlist.id, {
              name: formData.name,
              description: formData.description,
              color_from: formData.color_from,
              color_to: formData.color_to,
              image: selectedImage,
            });
          }}
        >
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Playlist Cover</label>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="w-full border border-dashed border-zinc-800 rounded-xl p-4 bg-zinc-950 hover:border-zinc-700 transition-colors text-left"
            >
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
              />
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 flex items-center justify-center">
                  {previewUrl || playlist.image_url ? (
                    <img
                      src={previewUrl || playlist.image_url || ""}
                      alt="Playlist cover preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music size={24} className="text-zinc-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {selectedImage ? selectedImage.name : playlist.image_url ? "Current cover image" : "Upload playlist cover"}
                  </p>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mt-1">
                    Optional PNG or JPG
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Title</label>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Description</label>
              <input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Start Color</label>
              <input
                type="color"
                value={formData.color_from}
                onChange={(e) => setFormData({ ...formData, color_from: e.target.value })}
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-1 py-1 outline-none cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">End Color</label>
              <input
                type="color"
                value={formData.color_to}
                onChange={(e) => setFormData({ ...formData, color_to: e.target.value })}
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-1 py-1 outline-none cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-3 rounded-xl shadow-xl shadow-orange-500/20 transition-all active:scale-95"
          >
            SAVE PLAYLIST
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const ShareModal = ({ 
  isOpen, 
  onClose, 
  playlist, 
  track,
  clients, 
  onSubmit 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  playlist: Playlist | null, 
  track: Track | null,
  clients: Client[], 
  onSubmit: (item: Playlist | Track, clientName: string | null, options: ShareLinkOptions) => Promise<string | null> 
}) => {
  const [selectedClient, setSelectedClient] = useState("");
  const [expiryMode, setExpiryMode] = useState<"never" | "24h" | "7d" | "30d">("never");
  const [allowDownload, setAllowDownload] = useState(true);
  const [generatedLink, setGeneratedLink] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedClient("");
      setExpiryMode("never");
      setAllowDownload(true);
      setGeneratedLink("");
      setIsSharing(false);
    }
  }, [isOpen]);

  if (!isOpen || (!playlist && !track)) return null;

  const item = playlist || track;
  const isPlaylist = !!playlist;
  const shareLabel = isPlaylist ? "playlist" : "track";
  const shareTitle = `Check out this ${shareLabel}: ${item?.name}`;
  const buildExpiryIso = () => {
    if (expiryMode === "never") return null;
    const now = new Date();
    const expiresAt = new Date(now);
    if (expiryMode === "24h") expiresAt.setHours(expiresAt.getHours() + 24);
    if (expiryMode === "7d") expiresAt.setDate(expiresAt.getDate() + 7);
    if (expiryMode === "30d") expiresAt.setDate(expiresAt.getDate() + 30);
    return expiresAt.toISOString();
  };

  const handleShare = async () => {
    setIsSharing(true);
    const shareLink = await onSubmit(item!, selectedClient || null, {
      expiresAt: buildExpiryIso(),
      allowDownload,
    });
    if (shareLink) {
      setGeneratedLink(shareLink);
    }
    setIsSharing(false);
  };

  const openShareWindow = (url: string, appName: string) => {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (opened) {
      toast.success(`Opened ${appName}.`);
    } else {
      toast.error(`${appName} could not be opened. Allow popups and try again.`);
    }
  };

  const shareToGmail = () => {
    if (!generatedLink) {
      toast.error("Generate a share link first.");
      return;
    }

    const body = `${shareTitle}\n\n${generatedLink}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(body)}`;
    openShareWindow(gmailUrl, "Gmail");
  };

  const shareToWhatsApp = () => {
    if (!generatedLink) {
      toast.error("Generate a share link first.");
      return;
    }

    const text = `${shareTitle}\n${generatedLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    openShareWindow(whatsappUrl, "WhatsApp");
  };

  const shareToMessenger = async () => {
    if (!generatedLink) {
      toast.error("Generate a share link first.");
      return;
    }

    const text = `${shareTitle}\n${generatedLink}`;

    try {
      await navigator.clipboard.writeText(text);
      const opened = window.open("https://www.messenger.com/", "_blank", "noopener,noreferrer");
      if (opened) {
        toast.success("Messenger opened. Paste the copied message to send.");
      } else {
        toast.error("Messenger could not be opened. Message copied to clipboard.");
      }
    } catch {
      const opened = window.open("https://www.messenger.com/", "_blank", "noopener,noreferrer");
      if (opened) {
        toast.info("Messenger opened. Copy and paste your share link manually.");
      } else {
        toast.error("Messenger could not be opened. Copy the link manually.");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-xl font-black text-white tracking-tight uppercase">Share {isPlaylist ? 'Playlist' : 'Track'}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
            <div 
              className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center"
              style={isPlaylist && !playlist.image_url ? { background: `linear-gradient(135deg, ${playlist.color_from}, ${playlist.color_to})` } : { backgroundColor: '#27272a' }}
            >
              {isPlaylist ? (
                playlist.image_url ? (
                  <img src={playlist.image_url} alt={playlist.name} className="w-full h-full object-cover" />
                ) : (
                  <Music size={20} className="text-white/40" />
                )
              ) : track?.image_url ? (
                <img src={track.image_url} alt={track.name} className="w-full h-full object-cover" />
              ) : (
                <Music size={20} className="text-white/40" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{item?.name}</p>
              <p className="text-xs text-zinc-500">{isPlaylist ? `${playlist.track_ids.length} Tracks` : track?.artist}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Select Client (Optional)</label>
            <select 
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors appearance-none"
            >
              <option value="">No client selected, create public link</option>
              {clients.map(client => (
                <option key={client.id} value={client.name}>{client.name} ({client.email})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Link Expiration</label>
            <select
              value={expiryMode}
              onChange={(e) => setExpiryMode(e.target.value as "never" | "24h" | "7d" | "30d")}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors appearance-none"
            >
              <option value="never">Never expires</option>
              <option value="24h">Expires in 24 hours</option>
              <option value="7d">Expires in 7 days</option>
              <option value="30d">Expires in 30 days</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setAllowDownload((prev) => !prev)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 flex items-center justify-between text-left hover:border-zinc-700 transition-colors"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white">Allow Downloads</p>
              <p className="text-[11px] text-zinc-500 mt-1">Turn off to hide download buttons on the shared page.</p>
            </div>
            <span className={cn("text-xs font-black", allowDownload ? "text-emerald-400" : "text-zinc-500")}>
              {allowDownload ? "ON" : "OFF"}
            </span>
          </button>

          <div className="pt-4">
            <button 
              onClick={handleShare}
              className={cn(
                "w-full font-black py-3 rounded-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2",
                "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20"
              )}
            >
              <Share2 size={18} />
              {isSharing ? "GENERATING..." : "SHARE NOW"}
            </button>
          </div>

          {generatedLink && (
            <div className="space-y-3 border-t border-zinc-800 pt-4">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Preview Link</label>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-xs text-zinc-300 break-all">
                {generatedLink}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(generatedLink);
                    toast.success("Share link copied.");
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 rounded-xl transition-colors"
                >
                  COPY LINK
                </button>
                <button
                  type="button"
                  onClick={() => window.open(generatedLink, "_blank", "noopener,noreferrer")}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl transition-colors"
                >
                  OPEN LINK
                </button>
              </div>
              <div className="pt-2 space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Share Via</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={shareToMessenger}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 rounded-xl transition-colors text-xs"
                  >
                    MESSENGER
                  </button>
                  <button
                    type="button"
                    onClick={shareToGmail}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 rounded-xl transition-colors text-xs"
                  >
                    GMAIL
                  </button>
                  <button
                    type="button"
                    onClick={shareToWhatsApp}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 rounded-xl transition-colors text-xs"
                  >
                    WHATSAPP
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const CreateTrackModal = ({ isOpen, onClose, onSubmit }: { isOpen: boolean, onClose: () => void, onSubmit: (track: any) => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    artist: 'OGBeatz',
  });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedArtwork, setSelectedArtwork] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const artworkInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        artist: 'OGBeatz',
      });
      setSelectedFile(null);
      setSelectedArtwork(null);
      setIsDragging(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      setSelectedFile(file);
      setFormData(prev => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, "") }));
      toast.success(`File selected: ${file.name}`);
    } else {
      toast.error("Please drop a valid audio file.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFormData(prev => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, "") }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-xl font-black text-white tracking-tight">UPLOAD NEW TRACK</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <form className="p-6 space-y-4" onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ ...formData, file: selectedFile, artwork: selectedArtwork });
        }}>
          {/* Drag & Drop Zone */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
              isDragging ? "border-orange-500 bg-orange-500/10" : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/50",
              selectedFile && "border-green-500/50 bg-green-500/5"
            )}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept="audio/*" 
              className="hidden" 
            />
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
              selectedFile ? "bg-green-500/20 text-green-500" : "bg-zinc-900 text-zinc-500"
            )}>
              {selectedFile ? <Music size={24} /> : <Upload size={24} />}
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-white">
                {selectedFile ? selectedFile.name : "Drop audio file here"}
              </p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1">
                {selectedFile ? "Click to change file" : "or click to browse"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Album Art</label>
            <button
              type="button"
              onClick={() => artworkInputRef.current?.click()}
              className="w-full border border-dashed border-zinc-800 rounded-xl p-4 bg-zinc-950 hover:border-zinc-700 transition-colors text-left"
            >
              <input
                type="file"
                ref={artworkInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => setSelectedArtwork(e.target.files?.[0] || null)}
              />
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 flex items-center justify-center">
                  {selectedArtwork ? (
                    <img
                      src={URL.createObjectURL(selectedArtwork)}
                      alt="Album art preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music size={24} className="text-zinc-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{selectedArtwork ? selectedArtwork.name : "Upload album art"}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1">
                    Optional track cover image
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Track Name</label>
            <input 
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
              placeholder="e.g. Midnight Echoes"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Artist</label>
            <input 
              required
              value={formData.artist}
              onChange={(e) => setFormData({...formData, artist: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
              placeholder="e.g. OGBeatz"
            />
          </div>
          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-3 rounded-xl shadow-xl shadow-orange-500/20 transition-all active:scale-95"
            >
              CREATE TRACK
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const EditTrackModal = ({
  isOpen,
  onClose,
  track,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  onSubmit: (trackId: string, updates: Partial<Track> & { artwork?: File | null }) => void;
}) => {
  const [formData, setFormData] = useState({
    name: "",
    artist: "",
    bpm: "",
    key_signature: "",
    duration: "",
    status: "ready" as Track["status"],
  });
  const [selectedArtwork, setSelectedArtwork] = useState<File | null>(null);
  const artworkInputRef = React.useRef<HTMLInputElement>(null);
  const [artworkPreviewUrl, setArtworkPreviewUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedArtwork) {
      setArtworkPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedArtwork);
    setArtworkPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedArtwork]);

  React.useEffect(() => {
    if (!track || !isOpen) return;
    setFormData({
      name: track.name,
      artist: track.artist,
      bpm: String(track.bpm ?? ""),
      key_signature: track.key_signature ?? "",
      duration: String(track.duration ?? ""),
      status: track.status,
    });
    setSelectedArtwork(null);
  }, [track, isOpen]);

  if (!isOpen || !track) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-xl font-black text-white tracking-tight">EDIT TRACK</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <form
          className="p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(track.id, {
              name: formData.name,
              artist: formData.artist,
              bpm: Number(formData.bpm) || 0,
              key_signature: formData.key_signature,
              duration: Number(formData.duration) || 0,
              status: formData.status,
              artwork: selectedArtwork,
            });
          }}
        >
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Track Artwork</label>
            <button
              type="button"
              onClick={() => artworkInputRef.current?.click()}
              className="w-full border border-dashed border-zinc-800 rounded-xl p-4 bg-zinc-950 hover:border-zinc-700 transition-colors text-left"
            >
              <input
                ref={artworkInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setSelectedArtwork(e.target.files?.[0] || null)}
              />
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 flex items-center justify-center">
                  {artworkPreviewUrl || track.image_url ? (
                    <img
                      src={artworkPreviewUrl || track.image_url || ""}
                      alt="Track artwork preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music size={24} className="text-zinc-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {selectedArtwork ? selectedArtwork.name : track.image_url ? "Current artwork" : "Upload track artwork"}
                  </p>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mt-1">
                    Optional PNG or JPG
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Track Name</label>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Artist</label>
              <input
                required
                value={formData.artist}
                onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">BPM</label>
              <input
                type="number"
                min="0"
                value={formData.bpm}
                onChange={(e) => setFormData({ ...formData, bpm: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Key</label>
              <input
                value={formData.key_signature}
                onChange={(e) => setFormData({ ...formData, key_signature: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Duration (sec)</label>
              <input
                type="number"
                min="0"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Track["status"] })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
              >
                <option value="ready">Ready</option>
                <option value="sent">Sent</option>
                <option value="processing">Processing</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-3 rounded-xl shadow-xl shadow-orange-500/20 transition-all active:scale-95"
          >
            SAVE TRACK
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const AddTrackToPlaylistModal = ({
  isOpen,
  onClose,
  playlist,
  tracks,
  currentTrack,
  isPlaying,
  onPreviewTrack,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist | null;
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPreviewTrack: (track: Track) => void;
  onSubmit: (trackId: string) => void;
}) => {
  const [selectedTrackId, setSelectedTrackId] = useState("");

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedTrackId("");
    }
  }, [isOpen]);

  if (!isOpen || !playlist) return null;

  const availableTracks = tracks.filter((track) => !playlist.track_ids.includes(track.id));
  const selectedTrack = availableTracks.find((track) => track.id === selectedTrackId) || null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-xl font-black text-white tracking-tight">ADD TRACK TO PLAYLIST</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {availableTracks.length > 0 ? (
            <>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Choose Track</label>
                <select
                  value={selectedTrackId}
                  onChange={(e) => setSelectedTrackId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="">Select one track...</option>
                  {availableTracks.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.name} - {track.artist}
                    </option>
                  ))}
                </select>
              </div>
              {selectedTrack && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      {selectedTrack.image_url ? (
                        <img src={selectedTrack.image_url} alt={selectedTrack.name} className="w-full h-full object-cover" />
                      ) : (
                        <Music size={18} className="text-zinc-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{selectedTrack.name}</p>
                      <p className="text-xs text-zinc-500 truncate">
                        {selectedTrack.artist} • {selectedTrack.bpm} BPM • {selectedTrack.key_signature}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPreviewTrack(selectedTrack)}
                      disabled={!selectedTrack.file_url}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2",
                        selectedTrack.file_url
                          ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                          : "bg-zinc-900 text-zinc-600 cursor-not-allowed"
                      )}
                    >
                      {currentTrack?.id === selectedTrack.id && isPlaying ? <Pause size={14} /> : <Play size={14} />}
                      {currentTrack?.id === selectedTrack.id && isPlaying ? "PAUSE" : "PREVIEW"}
                    </button>
                  </div>
                  {!selectedTrack.file_url && (
                    <p className="text-xs text-zinc-500">This track has no playable file URL yet.</p>
                  )}
                </div>
              )}
              <button
                type="button"
                disabled={!selectedTrackId}
                onClick={() => onSubmit(selectedTrackId)}
                className={cn(
                  "w-full font-black py-3 rounded-xl shadow-xl transition-all active:scale-95",
                  selectedTrackId
                    ? "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                )}
              >
                ADD TRACK
              </button>
            </>
          ) : (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 text-center">
              <p className="text-sm font-bold text-white">No more tracks available</p>
              <p className="text-xs text-zinc-500 mt-2">Every track in your library is already in this playlist.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const EditClientModal = ({
  isOpen,
  onClose,
  client,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onSubmit: (clientId: string, updates: Partial<Client>) => void;
}) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    status: "online" as Client["status"],
    activePlaylists: "",
    lastActive: "",
  });

  React.useEffect(() => {
    if (!client || !isOpen) return;
    setFormData({
      name: client.name,
      email: client.email,
      status: client.status,
      activePlaylists: String(client.activePlaylists ?? 0),
      lastActive: client.lastActive,
    });
  }, [client, isOpen]);

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-xl font-black text-white tracking-tight">EDIT CLIENT</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <form
          className="p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(client.id, {
              name: formData.name,
              email: formData.email,
              status: formData.status,
              activePlaylists: Number(formData.activePlaylists) || 0,
              lastActive: formData.lastActive,
            });
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Client Name</label>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Email</label>
              <input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Client["status"] })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Active Playlists</label>
              <input
                type="number"
                min="0"
                value={formData.activePlaylists}
                onChange={(e) => setFormData({ ...formData, activePlaylists: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Last Active</label>
            <input
              value={formData.lastActive}
              onChange={(e) => setFormData({ ...formData, lastActive: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-3 rounded-xl shadow-xl shadow-orange-500/20 transition-all active:scale-95"
          >
            SAVE CLIENT
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const PromoPackModal = ({
  isOpen,
  onClose,
  track,
  promoPack,
  isGenerating,
  onGenerate,
}: {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  promoPack: PromoPack | null;
  isGenerating: boolean;
  onGenerate: (track: Track) => void;
}) => {
  if (!isOpen || !track) return null;

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  const downloadPromoPack = () => {
    if (!promoPack) return;

    const body = [
      `TRACK: ${track.name}`,
      `ARTIST: ${track.artist}`,
      "",
      "YOUTUBE TITLE",
      promoPack.youtubeTitle,
      "",
      "YOUTUBE DESCRIPTION",
      promoPack.youtubeDescription,
      "",
      "INSTAGRAM CAPTION",
      promoPack.instagramCaption,
      "",
      "HASHTAGS",
      promoPack.hashtags.join(" "),
    ].join("\n");

    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${track.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "track"}-promo-pack.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyAllPromoText = async () => {
    if (!promoPack) return;

    await copyText(
      [
        `YOUTUBE TITLE: ${promoPack.youtubeTitle}`,
        "",
        "YOUTUBE DESCRIPTION:",
        promoPack.youtubeDescription,
        "",
        "INSTAGRAM CAPTION:",
        promoPack.instagramCaption,
        "",
        `HASHTAGS: ${promoPack.hashtags.join(" ")}`,
      ].join("\n"),
      "Promo pack"
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">PROMO PACK</h3>
            <p className="text-xs text-zinc-500 mt-1">Generate ready-to-copy YouTube and Instagram text from this track.</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center">
              {track.image_url ? (
                <img src={track.image_url} alt={track.name} className="w-full h-full object-cover" />
              ) : (
                <Music size={24} className="text-zinc-500" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{track.name}</p>
              <p className="text-xs text-zinc-500">
                {track.artist} · {track.bpm || "--"} BPM · {track.key_signature || "--"}
              </p>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-400">
            Uses your existing track metadata so you do not have to type the promo text yourself.
          </div>

          <button
            type="button"
            onClick={() => onGenerate(track)}
            disabled={isGenerating}
            className={cn(
              "w-full font-black py-3 rounded-xl transition-colors",
              isGenerating ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600 text-white"
            )}
          >
            {isGenerating ? "GENERATING..." : "GENERATE PROMO PACK"}
          </button>

          {promoPack && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={copyAllPromoText}
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-black transition-colors"
                >
                  COPY ALL
                </button>
                <button
                  type="button"
                  onClick={downloadPromoPack}
                  className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-200 hover:text-white hover:border-zinc-600 text-sm font-black transition-colors"
                >
                  DOWNLOAD TXT
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="border border-zinc-800 rounded-xl bg-zinc-950 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-white">YOUTUBE TITLE</div>
                    <button type="button" onClick={() => copyText(promoPack.youtubeTitle, "YouTube title")} className="text-xs font-bold text-orange-400 hover:text-orange-300">
                      COPY
                    </button>
                  </div>
                  <p className="text-sm text-zinc-300">{promoPack.youtubeTitle}</p>
                </div>

                <div className="border border-zinc-800 rounded-xl bg-zinc-950 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-white">YOUTUBE DESCRIPTION</div>
                    <button type="button" onClick={() => copyText(promoPack.youtubeDescription, "YouTube description")} className="text-xs font-bold text-orange-400 hover:text-orange-300">
                      COPY
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-sans">{promoPack.youtubeDescription}</pre>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-zinc-800 rounded-xl bg-zinc-950 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-white">INSTAGRAM CAPTION</div>
                    <button type="button" onClick={() => copyText(promoPack.instagramCaption, "Instagram caption")} className="text-xs font-bold text-orange-400 hover:text-orange-300">
                      COPY
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-sans">{promoPack.instagramCaption}</pre>
                </div>

                <div className="border border-zinc-800 rounded-xl bg-zinc-950 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-white">HASHTAGS</div>
                    <button type="button" onClick={() => copyText(promoPack.hashtags.join(" "), "Hashtags")} className="text-xs font-bold text-orange-400 hover:text-orange-300">
                      COPY
                    </button>
                  </div>
                  <p className="text-sm text-zinc-300">{promoPack.hashtags.join(" ")}</p>
                </div>
              </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [playlistTrackSearch, setPlaylistTrackSearch] = useState("");
  const [clientTrackSearch, setClientTrackSearch] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoadIssue, setDataLoadIssue] = useState<DataLoadIssue | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
  const [isEditPlaylistModalOpen, setIsEditPlaylistModalOpen] = useState(false);
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [isAddTrackToPlaylistModalOpen, setIsAddTrackToPlaylistModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPromoPackModalOpen, setIsPromoPackModalOpen] = useState(false);
  const [selectedPlaylistForShare, setSelectedPlaylistForShare] = useState<Playlist | null>(null);
  const [selectedTrackForShare, setSelectedTrackForShare] = useState<Track | null>(null);
  const [selectedTrackForPromo, setSelectedTrackForPromo] = useState<Track | null>(null);
  const [shareLinks, setShareLinks] = useState<SharedLink[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientMessageDraft, setClientMessageDraft] = useState("");
  const [isSendingClientMessage, setIsSendingClientMessage] = useState(false);
  const [selectedClientZip, setSelectedClientZip] = useState<File | null>(null);
  const [clientZipNote, setClientZipNote] = useState("");
  const [isUploadingClientZip, setIsUploadingClientZip] = useState(false);
  const [clientTrackComments, setClientTrackComments] = useState<Record<string, string>>({});
  const [isSubmittingClientFeedbackForTrackId, setIsSubmittingClientFeedbackForTrackId] = useState<string | null>(null);
  const [isGeneratingPromoPack, setIsGeneratingPromoPack] = useState(false);
  const [promoPacks, setPromoPacks] = useState<Record<string, PromoPack>>(() => {
    if (typeof window === "undefined") return {};

    try {
      const saved = window.localStorage.getItem("ogbeatz-promo-packs");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [activeShareToken, setActiveShareToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("share");
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const hasAnyData = tracks.length > 0 || clients.length > 0 || playlists.length > 0 || activities.length > 0;

  const selectedPlaylist = playlists.find((playlist) => playlist.id === selectedPlaylistId) || null;
  const selectedPlaylistTracks = selectedPlaylist
    ? selectedPlaylist.track_ids
        .map((trackId) => tracks.find((track) => track.id === trackId))
        .filter(Boolean) as Track[]
    : [];
  const filteredSelectedPlaylistTracks = selectedPlaylistTracks.filter((track) => {
    const query = playlistTrackSearch.toLowerCase();
    return (
      track.name.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query) ||
      track.key_signature.toLowerCase().includes(query)
    );
  });
  const selectedClient = clients.find((client) => client.id === selectedClientId) || null;
  const selectedClientActivities = selectedClient
    ? activities.filter((item) => item.client_name === selectedClient.name)
    : [];
  const selectedClientTrackActivities = selectedClientActivities.filter((item) => {
    if (!item.track_name) return false;
    const query = clientTrackSearch.toLowerCase();
    return (
      item.track_name.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query)
    );
  });
  const filteredClientTracks = tracks.filter((track) => {
    const query = clientTrackSearch.toLowerCase();
    return (
      track.name.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query) ||
      track.key_signature.toLowerCase().includes(query)
    );
  });
  const getTrackFeedbackCounts = (trackName: string) => {
    const thumbsUp = activities.filter(
      (item) => item.track_name === trackName && item.type === "thumbs_up"
    ).length;
    const thumbsDown = activities.filter(
      (item) => item.track_name === trackName && item.type === "thumbs_down"
    ).length;
    const comments = activities.filter(
      (item) => item.track_name === trackName && item.type === "comment"
    ).length;

    return { thumbsUp, thumbsDown, comments };
  };
  const getClientFeedbackCounts = (clientName: string) => {
    const clientActivities = activities.filter((item) => item.client_name === clientName);

    return {
      thumbsUp: clientActivities.filter((item) => item.type === "thumbs_up").length,
      thumbsDown: clientActivities.filter((item) => item.type === "thumbs_down").length,
      comments: clientActivities.filter((item) => item.type === "comment").length,
    };
  };
  const sharedActivities = activeShareToken
    ? activities.filter((item) => item.share_token === activeShareToken)
    : [];
  const activeShareActivity = sharedActivities[0] || null;
  const activeShareLink = activeShareToken
    ? shareLinks.find((link) => link.share_token === activeShareToken || link.token === activeShareToken) || null
    : null;
  const activeShareParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;
  const activeShareRecord = activeShareActivity || activeShareLink;
  const activeShareRecordPlaylistId = activeShareRecord?.item_type === "playlist" ? activeShareRecord.item_id : null;
  const activeShareRecordTrackId = activeShareRecord?.item_type === "track" ? activeShareRecord.item_id : null;
  const activeShareExpiresAt = activeShareRecord?.expires_at || activeShareParams?.get("expiresAt");
  const activeShareAllowDownloadParam = activeShareParams?.get("allowDownload");
  const activeSharePlaylistId = activeShareRecordPlaylistId || activeShareParams?.get("playlistId");
  const activeShareTrackId = activeShareRecordTrackId || activeShareParams?.get("trackId");
  const activeShareCoverImage = activeShareRecord?.cover_image_url || activeShareParams?.get("coverImage");
  const activeShareAllowDownload = activeShareRecord?.allow_download !== undefined && activeShareRecord?.allow_download !== null
    ? activeShareRecord.allow_download
    : activeShareAllowDownloadParam === null
      ? true
      : activeShareAllowDownloadParam !== "0" && activeShareAllowDownloadParam.toLowerCase() !== "false";
  const activeShareExpiresAtDate =
    activeShareExpiresAt && !Number.isNaN(new Date(activeShareExpiresAt).getTime())
      ? new Date(activeShareExpiresAt)
      : null;
  const isActiveShareExpired = activeShareExpiresAtDate
    ? Date.now() > activeShareExpiresAtDate.getTime()
    : false;
  const sharedPlaylistName = activeShareRecord?.item_type === "playlist"
    ? activeShareRecord.item_name
    : sharedActivities[0]?.playlist_name || null;
  const sharedPlaylistById = activeSharePlaylistId
    ? playlists.find((playlist) => playlist.id === activeSharePlaylistId) || null
    : null;
  const sharedPlaylistByName = sharedPlaylistName
    ? playlists.find((playlist) => playlist.name === sharedPlaylistName) || null
    : null;
  const sharedPlaylist = sharedPlaylistById || sharedPlaylistByName;
  const sharedTrackNames = Array.from(
    new Set(sharedActivities.map((item) => item.track_name).filter(Boolean))
  ) as string[];
  let sharedTracks: Track[] = [];
  if (sharedPlaylist) {
    sharedTracks = sharedPlaylist.track_ids.map((trackId, index) => {
      const matchedTrack = tracks.find((track) => track.id === trackId);
      return matchedTrack || createSharedTrackPlaceholder(trackId, sharedTrackNames[index] || null);
    });
  } else if (activeShareTrackId || activeShareRecord?.item_name || sharedTrackNames.length > 0) {
    const matchedTrackById = activeShareTrackId
      ? tracks.find((track) => track.id === activeShareTrackId) || null
      : null;
    const fallbackTrackName = activeShareRecord?.item_name || sharedTrackNames[0] || null;
    const matchedTrackByName = fallbackTrackName
      ? tracks.find((track) => track.name === fallbackTrackName) || null
      : null;
    const placeholderId = activeShareTrackId || fallbackTrackName || "shared-track";
    sharedTracks = [matchedTrackById || matchedTrackByName || createSharedTrackPlaceholder(placeholderId, fallbackTrackName)];
  }
  const sharedContentTitle = sharedPlaylist?.name || sharedTracks[0]?.name || activeShareRecord?.item_name || "Shared Content";
  const sharedHeroImage = sharedPlaylist?.image_url || sharedTracks[0]?.image_url || activeShareCoverImage || null;

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = activeShareToken ? sharedContentTitle : "OGBeatz Hub";
  }, [activeShareToken, sharedContentTitle]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Playback error:", error);
          setIsPlaying(false);
          if (error.name === 'NotAllowedError') {
            toast.error("Playback blocked. Please click play again.");
          } else {
            toast.error("Audio playback failed. Check your connection.");
          }
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleTrackEnd = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleAudioError = (e: any) => {
    console.error("Audio element error:", e);
    toast.error("Error loading audio file.");
    setIsPlaying(false);
  };

  const uploadAssetImage = async (file: File, folder: "tracks" | "playlists") => {
    if (!supabase) return null;

    if (!file.type.startsWith("image/")) {
      throw new Error(`Invalid file type for image upload: ${file.type || "unknown"}`);
    }

    const fileExt = file.name.includes(".") ? (file.name.split(".").pop() || "jpg") : "jpg";
    const fileName = `${folder}/${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const bucketsToTry = Array.from(new Set([supabaseImageBucket, fallbackImageBucket]));

    let lastError: unknown = null;

    for (const bucket of bucketsToTry) {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (!uploadError) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return data.publicUrl;
      }

      lastError = uploadError;
    }

    throw lastError || new Error("Image upload failed for all configured buckets.");
  };

  const uploadClientDeliveryFile = async (file: File, client: Client) => {
    if (!supabase) return null;

    const fileExt = file.name.split('.').pop() || "zip";
    const safeClientKey = (client.email || client.id).replace(/[^a-zA-Z0-9-_]/g, "-");
    const fileName = `client-deliveries/${safeClientKey}/${Math.random().toString(36).substring(2, 15)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const analyzeTrackMetadata = async (trackName: string) => {
    if (!ai) {
      throw new Error("Missing Gemini API key. Set VITE_GEMINI_API_KEY.");
    }

    const prompt = `Analyze this music track name: "${trackName}".
Guess the most likely BPM (number), Musical Key (string like "Am", "F#m"), and Duration in seconds (number).
Return ONLY a JSON object like {"bpm": 128, "key": "Am", "duration": 180}.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const analysis = JSON.parse(response.text || "{}");

    return {
      bpm: Number(analysis.bpm) || 120,
      key: analysis.key || "C",
      duration: Number(analysis.duration) || 180,
    };
  };

  const buildFallbackPromoPack = (track: Track): PromoPack => {
    const hashtagBase = [
      ...PROMO_BRAND.coreHashtags,
      "#Producer",
      "#Songwriter",
      track.artist.replace(/[^a-zA-Z0-9]/g, "") ? `#${track.artist.replace(/[^a-zA-Z0-9]/g, "")}` : "",
      track.name.replace(/[^a-zA-Z0-9]/g, "") ? `#${track.name.replace(/[^a-zA-Z0-9]/g, "")}` : "",
    ].filter(Boolean);

    const uniqueHashtags = Array.from(new Set(hashtagBase)).slice(0, 8);
    const bpmText = track.bpm ? `${track.bpm} BPM` : "new energy";
    const keyText = track.key_signature || "fresh sound";
    const durationText = track.duration
      ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, "0")}`
      : "full version";

    return {
      youtubeTitle: `${track.artist} - ${track.name} | New Music from ${PROMO_BRAND.artistName}`,
      youtubeDescription: `${track.name} by ${track.artist}.\n\nA new release from ${PROMO_BRAND.artistName} built with ${bpmText}, ${keyText}, and a polished songwriter-focused sound.\n\nTrack length: ${durationText}\n\nFollow ${PROMO_BRAND.instagramHandle} and ${PROMO_BRAND.callToAction.toLowerCase()} on YouTube at ${PROMO_BRAND.youtubeHandle}.\n\n${uniqueHashtags.join(" ")}`,
      instagramCaption: `${track.name} by ${track.artist} is out now.\n\nNew music from ${PROMO_BRAND.artistName} with a clean producer and songwriter focus.\n\nFollow ${PROMO_BRAND.instagramHandle} for more releases and ${PROMO_BRAND.callToAction.toLowerCase()} on YouTube at ${PROMO_BRAND.youtubeHandle}.\n\n${uniqueHashtags.join(" ")}`,
      hashtags: uniqueHashtags,
    };
  };

  const generatePromoPack = async (track: Track) => {
    const fallbackPack = buildFallbackPromoPack(track);

    if (!ai) {
      return fallbackPack;
    }

    const prompt = `Create a music promo pack for this track.
Track title: "${track.name}"
Artist: "${track.artist}"
BPM: "${track.bpm || "unknown"}"
Key: "${track.key_signature || "unknown"}"
Duration seconds: "${track.duration || "unknown"}"
Brand name: "${PROMO_BRAND.artistName}"
Instagram handle: "${PROMO_BRAND.instagramHandle}"
YouTube handle: "${PROMO_BRAND.youtubeHandle}"
Call to action: "${PROMO_BRAND.callToAction}"
Core hashtags: "${PROMO_BRAND.coreHashtags.join(" ")}"
Tone: "${PROMO_BRAND.tone}"
Use words around: "${PROMO_BRAND.focusWords.join(", ")}"
Avoid phrases: "${PROMO_BRAND.avoidPhrases.join(", ")}"

Return ONLY JSON with this shape:
{
  "youtubeTitle": "short title under 100 chars",
  "youtubeDescription": "2 short paragraphs for YouTube",
  "instagramCaption": "short Instagram caption with spacing",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}

Keep it concise, polished, music-focused, and easy to post without edits.
Do not use beatmaking or type-beat language.
Lean toward producer, songwriter, and new music language.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const generated = JSON.parse(response.text || "{}");
      const hashtags = Array.isArray(generated.hashtags)
        ? generated.hashtags.filter((tag: unknown): tag is string => typeof tag === "string" && tag.trim().length > 0)
        : fallbackPack.hashtags;

      return {
        youtubeTitle: generated.youtubeTitle || fallbackPack.youtubeTitle,
        youtubeDescription: generated.youtubeDescription || fallbackPack.youtubeDescription,
        instagramCaption: generated.instagramCaption || fallbackPack.instagramCaption,
        hashtags: hashtags.length > 0 ? hashtags : fallbackPack.hashtags,
      };
    } catch (error) {
      console.warn("Promo pack generation failed, using fallback copy", error);
      return fallbackPack;
    }
  };

  const fetchData = async () => {
    if (!supabase) {
      console.warn('Supabase client not initialized.');
      setDataLoadIssue({
        summary: "Supabase client is not initialized.",
        details: [
          "Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your runtime environment.",
          "Restart the Vite dev server after changing .env so the browser gets the new values.",
        ],
      });
      setTracks([]);
      setClients([]);
      setPlaylists([]);
      setActivities([]);
      setCurrentTrack(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setDataLoadIssue(null);
    try {
      const [tracksResult, clientsResult, playlistsResult, activitiesResult, shareLinksResult] =
        await Promise.allSettled([
          supabase.from('tracks').select('*').order('created_at', { ascending: false }),
          supabase.from('clients').select('*'),
          supabase.from('playlists').select('*'),
          supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(10),
          supabase.from('share_links').select('*').order('created_at', { ascending: false }),
        ]);

      const failures: string[] = [];

      if (tracksResult.status === 'fulfilled') {
        if (tracksResult.value.error) {
          failures.push(`tracks: ${formatSupabaseError(tracksResult.value.error)}`);
          setTracks([]);
          setCurrentTrack(null);
        } else {
          const tracksData = tracksResult.value.data || [];
          setTracks(tracksData);
          setCurrentTrack(tracksData.length > 0 ? tracksData[0] : null);
        }
      } else {
        failures.push(`tracks: ${tracksResult.reason instanceof Error ? tracksResult.reason.message : 'Request failed.'}`);
        setTracks([]);
        setCurrentTrack(null);
      }

      if (clientsResult.status === 'fulfilled') {
        if (clientsResult.value.error) {
          failures.push(`clients: ${formatSupabaseError(clientsResult.value.error)}`);
          setClients([]);
        } else {
          setClients((clientsResult.value.data || []).map((client) => normalizeClientRow(client as RawClient)));
        }
      } else {
        failures.push(`clients: ${clientsResult.reason instanceof Error ? clientsResult.reason.message : 'Request failed.'}`);
        setClients([]);
      }

      if (playlistsResult.status === 'fulfilled') {
        if (playlistsResult.value.error) {
          failures.push(`playlists: ${formatSupabaseError(playlistsResult.value.error)}`);
          setPlaylists([]);
        } else {
          setPlaylists((playlistsResult.value.data || []).map((playlist) => normalizePlaylistRow(playlist as RawPlaylist)));
        }
      } else {
        failures.push(`playlists: ${playlistsResult.reason instanceof Error ? playlistsResult.reason.message : 'Request failed.'}`);
        setPlaylists([]);
      }

      if (activitiesResult.status === 'fulfilled') {
        if (activitiesResult.value.error) {
          failures.push(`activities: ${formatSupabaseError(activitiesResult.value.error)}`);
          setActivities([]);
        } else {
          setActivities(activitiesResult.value.data || []);
        }
      } else {
        failures.push(`activities: ${activitiesResult.reason instanceof Error ? activitiesResult.reason.message : 'Request failed.'}`);
        setActivities([]);
      }

      if (shareLinksResult.status === 'fulfilled') {
        if (shareLinksResult.value.error) {
          console.warn('share_links load issue:', formatSupabaseError(shareLinksResult.value.error));
          setShareLinks([]);
        } else {
          setShareLinks((shareLinksResult.value.data || []) as SharedLink[]);
        }
      } else {
        console.warn('share_links load issue:', shareLinksResult.reason instanceof Error ? shareLinksResult.reason.message : 'Request failed.');
        setShareLinks([]);
      }

      if (failures.length > 0) {
        console.error('Error fetching data from Supabase:', failures);
        setDataLoadIssue({
          summary: "Supabase returned one or more query errors.",
          details: [
            ...failures,
            "If RLS is enabled, this app currently reads data without signing a user in first.",
            "If the tables are empty, this can also be expected until you seed rows in Supabase.",
          ],
        });
        toast.error(`Supabase load issue: ${failures[0]}`);
      } else {
        setDataLoadIssue(null);
      }
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
      setDataLoadIssue({
        summary: "Failed to load data from Supabase.",
        details: [
          formatSupabaseError(error),
          "Verify your Supabase URL/key pair and confirm the API is reachable from the deployed site.",
        ],
      });
      toast.error(`Failed to load data from Supabase: ${formatSupabaseError(error)}`);
      setTracks([]);
      setClients([]);
      setPlaylists([]);
      setActivities([]);
      setCurrentTrack(null);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsLoading(false);
      setDataLoadIssue({
        summary: "Initial data load timed out.",
        details: [
          "Supabase did not respond within 10 seconds.",
          "Check the browser console and Network tab for blocked requests, RLS denials, or CORS issues.",
        ],
      });
      toast.error("Initial data load timed out. Check your Supabase settings.");
    }, 10000);

    fetchData().finally(() => {
      window.clearTimeout(timeoutId);
    });

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem("ogbeatz-promo-packs", JSON.stringify(promoPacks));
    } catch (error) {
      console.warn("Failed to persist promo packs", error);
    }
  }, [promoPacks]);

  const handleCreateTrack = async (newTrack: Partial<Track> & { file?: File; artwork?: File }) => {
    if (!supabase) {
      toast.error('Supabase not connected. Cannot create track.');
      return;
    }

    const analysisToast = toast.loading(`Analyzing ${newTrack.name}...`);

    try {
      // 1. Smart Analysis using Gemini (Guessing BPM/Key based on name/metadata)
      let bpm = 120;
      let key = "C";
      let duration = 180;

      try {
        const analysis = await analyzeTrackMetadata(newTrack.name || "Untitled Track");
        bpm = analysis.bpm;
        key = analysis.key;
        duration = analysis.duration;
      } catch (e) {
        console.warn("AI analysis failed, using defaults", e);
      }

      // 2. Upload track album art if provided
      let artworkUrl = null;
      if ((newTrack as Partial<Track> & { artwork?: File }).artwork) {
        try {
          artworkUrl = await uploadAssetImage((newTrack as Partial<Track> & { artwork?: File }).artwork!, 'tracks');
        } catch (error) {
          console.error('Artwork upload error:', error);
          toast.error(`Failed to upload album art: ${formatSupabaseError(error)}`);
        }
      }

      // 3. Upload to Supabase Storage if file exists
      let fileUrl = null;
      if (newTrack.file) {
        const fileExt = newTrack.file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('tracks')
          .upload(filePath, newTrack.file);

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          toast.error('Failed to upload audio file to storage.');
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('tracks')
            .getPublicUrl(filePath);
          fileUrl = publicUrl;
        }
      }

      // 4. Insert into Supabase
      const { error } = await supabase
        .from('tracks')
        .insert([{
          name: newTrack.name,
          artist: newTrack.artist || 'OGBeatz',
          duration: duration,
          size: newTrack.file?.size || 0,
          type: newTrack.file?.type || 'audio/wav',
          file_url: fileUrl,
          image_url: artworkUrl,
          bpm: bpm,
          key_signature: key,
          status: 'ready'
        }]);

      if (error) throw error;
      
      // 5. Log Activity
      await supabase.from('activities').insert([{
        type: 'upload',
        track_name: newTrack.name,
        client_name: 'System'
      }]);
      
      toast.success('Track analyzed and created!', { id: analysisToast });
      setIsCreateModalOpen(false);
      fetchData(); // Refresh list
    } catch (error) {
      console.error('Error creating track:', error);
      toast.error('Failed to analyze or create track.', { id: analysisToast });
    }
  };

  const handleCreateClient = async (clientData: { name: string, email: string }) => {
    const name = clientData.name.trim();
    const email = clientData.email.trim().toLowerCase();

    if (!supabase) {
      const localClient: Client = {
        id: Date.now().toString(),
        name,
        email,
        status: "online",
        lastActive: "Just now",
        activePlaylists: 0,
        created_at: new Date().toISOString(),
      };
      setClients((prev) => [localClient, ...prev]);
      setIsCreateClientModalOpen(false);
      toast.success('Client added successfully!');
      return;
    }

    try {
      const { data: existingByEmail } = await supabase
        .from('clients')
        .select('*')
        .ilike('email', email)
        .limit(1);

      let existingClientRows = existingByEmail || [];

      if (existingClientRows.length === 0) {
        const { data: existingByAlias } = await supabase
          .from('clients')
          .select('*')
          .ilike('client_email', email)
          .limit(1);

        existingClientRows = existingByAlias || [];
      }

      const existingClient = (existingClientRows[0] || null) as RawClient | null;

      if (existingClient) {
        const { data, error } = await supabase
          .from('clients')
          .update({
            name,
            email,
            client_email: email,
            status: "online",
            last_active: "Recently",
            active_playlists: existingClient.active_playlists ?? 0,
          })
          .eq('id', existingClient.id)
          .select('*')
          .single();

        if (error) throw error;

        if (data) {
          setClients((prev) => [normalizeClientRow(data as RawClient), ...prev.filter((client) => client.id !== existingClient.id)]);
        }

        toast.success('Client added successfully!');
        setIsCreateClientModalOpen(false);
        return;
      }

      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name,
          email,
          client_email: email,
          status: "online",
          last_active: "Recently",
          active_playlists: 0,
        }])
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        setClients((prev) => [normalizeClientRow(data as RawClient), ...prev]);
      }

      toast.success('Client added successfully!');
      setIsCreateClientModalOpen(false);
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error(`Failed to add client: ${formatSupabaseError(error)}`);
    }
  };

  const openClient = (client: Client) => {
    setSelectedClientId(client.id);
    setClientTrackSearch("");
  };

  const closeClient = () => {
    setSelectedClientId(null);
    setClientTrackSearch("");
  };

  const handleUpdateClient = async (clientId: string, updates: Partial<Client>) => {
    if (!supabase) {
      setClients((prev) => prev.map((client) => (client.id === clientId ? { ...client, ...updates } : client)));
      if (selectedClientId === clientId) {
        setEditingClient(null);
      }
      setIsEditClientModalOpen(false);
      toast.success('Client updated.');
      return;
    }

    const { error } = await supabase
      .from('clients')
      .update({
        name: updates.name,
        email: updates.email,
        client_email: updates.email,
        status: updates.status,
        active_playlists: updates.activePlaylists,
        last_active: updates.lastActive,
      })
      .eq('id', clientId);

    if (error) {
      console.error('Error updating client:', error);
      toast.error('Failed to update client.');
      return;
    }

    setClients((prev) => prev.map((client) => (client.id === clientId ? { ...client, ...updates } : client)));
    setEditingClient(null);
    setIsEditClientModalOpen(false);
    toast.success('Client updated.');
  };

  const handleSendClientMessage = async () => {
    if (!selectedClient || !clientMessageDraft.trim()) return;

    if (!supabase) {
      toast.error('Supabase not connected.');
      return;
    }

    setIsSendingClientMessage(true);

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          recipient_id: selectedClient.email,
          content: clientMessageDraft.trim(),
          is_read: false,
        }]);

      if (error) throw error;

      toast.success(`Message sent to ${selectedClient.name}.`);
      setClientMessageDraft("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message.');
    } finally {
      setIsSendingClientMessage(false);
    }
  };

  const handleSendClientZip = async () => {
    if (!selectedClient || !selectedClientZip) return;

    if (!supabase) {
      toast.error('Supabase not connected.');
      return;
    }

    setIsUploadingClientZip(true);

    try {
      const zipUrl = await uploadClientDeliveryFile(selectedClientZip, selectedClient);
      if (!zipUrl) {
        throw new Error("ZIP upload did not return a URL.");
      }

      const messageBody = [
        `ZIP delivery: ${selectedClientZip.name}`,
        clientZipNote.trim(),
        zipUrl,
      ]
        .filter(Boolean)
        .join("\n\n");

      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          recipient_id: selectedClient.email,
          content: messageBody,
          is_read: false,
        }]);

      if (messageError) throw messageError;

      await supabase.from('activities').insert([{
        type: 'zip_upload',
        client_name: selectedClient.name,
        track_name: selectedClientZip.name,
      }]);

      toast.success(`ZIP sent to ${selectedClient.name}.`);
      setSelectedClientZip(null);
      setClientZipNote("");
    } catch (error) {
      console.error('Error uploading ZIP for client:', error);
      toast.error('Failed to upload ZIP.');
    } finally {
      setIsUploadingClientZip(false);
    }
  };

  const handleTrackFeedback = async (
    track: Track,
    type: "thumbs_up" | "thumbs_down" | "comment",
    clientName: string
  ) => {
    if (!supabase) {
      toast.error('Supabase not connected.');
      return;
    }

    const comment = clientTrackComments[track.id]?.trim() || "";
    if (type === "comment" && !comment) {
      toast.error('Write a comment first.');
      return;
    }

    setIsSubmittingClientFeedbackForTrackId(track.id);

    try {
      const typeLabel =
        type === "thumbs_up" ? "liked" : type === "thumbs_down" ? "disliked" : "commented";

      const { error } = await supabase
        .from('activities')
        .insert([{
          type,
          client_name: clientName,
          track_name: track.name,
          playlist_name: type === "comment" ? comment : null,
        }]);

      if (error) throw error;

      if (type === "comment") {
        setClientTrackComments((prev) => ({ ...prev, [track.id]: "" }));
      }

      toast.success(`${clientName} ${typeLabel} ${track.name}.`);
      fetchData();
    } catch (error) {
      console.error('Error saving client feedback:', error);
      toast.error('Failed to save feedback.');
    } finally {
      setIsSubmittingClientFeedbackForTrackId(null);
    }
  };

  const handleCreatePlaylist = async (playlistData: Partial<Playlist>) => {
    if (!supabase) {
      const localPlaylist: Playlist = {
        id: Date.now().toString(),
        name: playlistData.name || "Untitled Playlist",
        description: playlistData.description || "",
        track_ids: playlistData.track_ids || [],
        color_from: playlistData.color_from || "#f97316",
        color_to: playlistData.color_to || "#ea580c",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setPlaylists((prev) => [localPlaylist, ...prev]);
      setIsCreatePlaylistModalOpen(false);
      toast.success('Playlist created successfully!');
      return;
    }

    try {
      let playlistImageUrl = null;
      if ((playlistData as Partial<Playlist> & { image?: File }).image) {
        try {
          playlistImageUrl = await uploadAssetImage((playlistData as Partial<Playlist> & { image?: File }).image!, 'playlists');
        } catch (error) {
          console.error('Playlist cover upload error:', error);
          toast.error(`Failed to upload playlist cover: ${formatSupabaseError(error)}`);
        }
      }

      const { error } = await supabase
        .from('playlists')
        .insert([{
          name: playlistData.name,
          description: playlistData.description,
          track_ids: playlistData.track_ids || [],
          color_from: playlistData.color_from || '#f97316',
          color_to: playlistData.color_to || '#ea580c',
          image_url: playlistImageUrl,
        }]);

      if (error) throw error;
      
      toast.success('Playlist created successfully!');
      setIsCreatePlaylistModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error('Failed to create playlist.');
    }
  };

  const handleUpdatePlaylist = async (playlistId: string, updates: Partial<Playlist> & { image?: File | null }) => {
    let nextImageUrl = updates.image_url;
    if (updates.image) {
      try {
        nextImageUrl = await uploadAssetImage(updates.image, "playlists");
      } catch (error) {
        console.error("Playlist cover upload error:", error);
        toast.error(`Failed to upload playlist cover: ${formatSupabaseError(error)}`);
        return;
      }
    }

    const appliedUpdates: Partial<Playlist> = {
      name: updates.name,
      description: updates.description,
      color_from: updates.color_from,
      color_to: updates.color_to,
      image_url: nextImageUrl,
      updated_at: new Date().toISOString(),
    };

    if (!supabase) {
      setPlaylists((prev) => prev.map((playlist) => (playlist.id === playlistId ? { ...playlist, ...appliedUpdates } : playlist)));
      setIsEditPlaylistModalOpen(false);
      setEditingPlaylist(null);
      toast.success("Playlist updated.");
      return;
    }

    const { error } = await supabase
      .from("playlists")
      .update({
        name: updates.name,
        description: updates.description,
        color_from: updates.color_from,
        color_to: updates.color_to,
        image_url: nextImageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", playlistId);

    if (error) {
      console.error("Error updating playlist:", error);
      toast.error("Failed to update playlist.");
      return;
    }

    setPlaylists((prev) => prev.map((playlist) => (playlist.id === playlistId ? { ...playlist, ...appliedUpdates } : playlist)));
    setIsEditPlaylistModalOpen(false);
    setEditingPlaylist(null);
    toast.success("Playlist updated.");
  };

  const openPlaylist = (playlist: Playlist) => {
    setSelectedPlaylistId(playlist.id);
    setPlaylistTrackSearch("");
  };

  const closePlaylist = () => {
    setSelectedPlaylistId(null);
    setPlaylistTrackSearch("");
  };

  const updatePlaylistTrackIds = async (playlistId: string, trackIds: string[]) => {
    if (!supabase) {
      setPlaylists((prev) =>
        prev.map((playlist) =>
          playlist.id === playlistId
            ? { ...playlist, track_ids: trackIds, updated_at: new Date().toISOString() }
            : playlist
        )
      );
      return true;
    }

    const { error } = await supabase
      .from('playlists')
      .update({ track_ids: trackIds, updated_at: new Date().toISOString() })
      .eq('id', playlistId);

    if (error) {
      console.error('Error updating playlist tracks:', error);
      toast.error('Failed to update playlist tracks.');
      return false;
    }

    setPlaylists((prev) =>
      prev.map((playlist) =>
        playlist.id === playlistId
          ? { ...playlist, track_ids: trackIds, updated_at: new Date().toISOString() }
          : playlist
      )
    );
    return true;
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    const playlist = playlists.find((entry) => entry.id === playlistId);
    const confirmed = window.confirm(
      `Delete playlist${playlist?.name ? ` "${playlist.name}"` : ""}? This cannot be undone.`
    );

    if (!confirmed) return;

    if (!supabase) {
      setPlaylists((prev) => prev.filter((playlist) => playlist.id !== playlistId));
      if (selectedPlaylistId === playlistId) {
        closePlaylist();
      }
      toast.success('Playlist deleted.');
      return;
    }

    const { error } = await supabase.from('playlists').delete().eq('id', playlistId);

    if (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Failed to delete playlist.');
      return;
    }

    setPlaylists((prev) => prev.filter((playlist) => playlist.id !== playlistId));
    if (selectedPlaylistId === playlistId) {
      closePlaylist();
    }
    toast.success('Playlist deleted.');
  };

  const handleAddTrackToPlaylist = async (trackId: string) => {
    if (!selectedPlaylist) return;

    const nextTrackIds = [...selectedPlaylist.track_ids, trackId];
    const success = await updatePlaylistTrackIds(selectedPlaylist.id, nextTrackIds);
    if (!success) return;

    setIsAddTrackToPlaylistModalOpen(false);
    toast.success('Track added to playlist.');
  };

  const handleRemoveTrackFromPlaylist = async (trackId: string) => {
    if (!selectedPlaylist) return;
    const track = tracks.find((entry) => entry.id === trackId);
    const confirmed = window.confirm(
      `Remove${track?.name ? ` "${track.name}"` : " this track"} from "${selectedPlaylist.name}"?`
    );

    if (!confirmed) return;

    const nextTrackIds = selectedPlaylist.track_ids.filter((id) => id !== trackId);
    const success = await updatePlaylistTrackIds(selectedPlaylist.id, nextTrackIds);
    if (!success) return;

    if (currentTrack?.id === trackId && !nextTrackIds.includes(trackId)) {
      setIsPlaying(false);
    }
    toast.success('Track removed from playlist.');
  };

  const handleUpdateTrack = async (trackId: string, updates: Partial<Track> & { artwork?: File | null }) => {
    let nextImageUrl = updates.image_url;
    if (updates.artwork) {
      try {
        nextImageUrl = await uploadAssetImage(updates.artwork, "tracks");
      } catch (error) {
        console.error("Track artwork upload error:", error);
        toast.error(`Failed to upload track artwork: ${formatSupabaseError(error)}`);
        return;
      }
    }

    if (!supabase) {
      const localUpdates: Partial<Track> = {
        name: updates.name,
        artist: updates.artist,
        bpm: updates.bpm,
        key_signature: updates.key_signature,
        duration: updates.duration,
        status: updates.status,
        image_url: nextImageUrl,
      };
      setTracks((prev) => prev.map((track) => (track.id === trackId ? { ...track, ...localUpdates } : track)));
      if (currentTrack?.id === trackId) {
        setCurrentTrack((prev) => (prev ? { ...prev, ...localUpdates } : prev));
      }
      setIsEditTrackModalOpen(false);
      setEditingTrack(null);
      toast.success('Track updated.');
      return;
    }

    const { error } = await supabase
      .from('tracks')
      .update({
        name: updates.name,
        artist: updates.artist,
        bpm: updates.bpm,
        key_signature: updates.key_signature,
        duration: updates.duration,
        status: updates.status,
        image_url: nextImageUrl,
      })
      .eq('id', trackId);

    if (error) {
      console.error('Error updating track:', error);
      toast.error('Failed to update track.');
      return;
    }

    const appliedUpdates: Partial<Track> = {
      name: updates.name,
      artist: updates.artist,
      bpm: updates.bpm,
      key_signature: updates.key_signature,
      duration: updates.duration,
      status: updates.status,
      image_url: nextImageUrl,
    };
    setTracks((prev) => prev.map((track) => (track.id === trackId ? { ...track, ...appliedUpdates } : track)));
    if (currentTrack?.id === trackId) {
      setCurrentTrack((prev) => (prev ? { ...prev, ...appliedUpdates } : prev));
    }
    setIsEditTrackModalOpen(false);
    setEditingTrack(null);
    toast.success('Track updated.');
  };

  const handleDeleteTrack = async (track: Track) => {
    const confirmed = window.confirm(
      `Delete track "${track.name}" from your library? This will also remove it from any playlists.`
    );

    if (!confirmed) return;

    const nextPlaylists = playlists.map((playlist) => ({
      ...playlist,
      track_ids: playlist.track_ids.filter((id) => id !== track.id),
    }));

    if (!supabase) {
      setTracks((prev) => prev.filter((item) => item.id !== track.id));
      setPlaylists(nextPlaylists);
      if (currentTrack?.id === track.id) {
        setCurrentTrack(null);
        setIsPlaying(false);
      }
      toast.success('Track deleted.');
      return;
    }

    const playlistsToUpdate = playlists.filter((playlist) => playlist.track_ids.includes(track.id));

    try {
      if (playlistsToUpdate.length > 0) {
        await Promise.all(
          playlistsToUpdate.map((playlist) =>
            supabase
              .from('playlists')
              .update({
                track_ids: playlist.track_ids.filter((id) => id !== track.id),
                updated_at: new Date().toISOString(),
              })
              .eq('id', playlist.id)
          )
        );
      }

      const { error } = await supabase.from('tracks').delete().eq('id', track.id);
      if (error) throw error;

      setTracks((prev) => prev.filter((item) => item.id !== track.id));
      setPlaylists(nextPlaylists);
      if (currentTrack?.id === track.id) {
        setCurrentTrack(null);
        setIsPlaying(false);
      }
      toast.success('Track deleted.');
    } catch (error) {
      console.error('Error deleting track:', error);
      toast.error('Failed to delete track.');
    }
  };

  const handleDownloadTrack = async (track: Track) => {
    if (!track.file_url) {
      toast.error('No download link available.');
      return;
    }

    const safeName = (track.name || "track").replace(/[^\w.-]+/g, "_");
    const fileName = `${safeName}.${getFileExtensionFromType(track.type)}`;

    try {
      const response = await fetch(track.file_url, { mode: "cors" });
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("Download started.");
      return;
    } catch (error) {
      console.warn("Blob download failed, falling back to direct link.", error);
    }

    const anchor = document.createElement("a");
    anchor.href = track.file_url;
    anchor.download = fileName;
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    toast.success("Download requested.");
  };

  const handleOpenPromoPack = (track: Track) => {
    setSelectedTrackForPromo(track);
    setIsPromoPackModalOpen(true);
  };

  const handleGeneratePromoPack = async (track: Track) => {
    setIsGeneratingPromoPack(true);
    const promoToast = toast.loading(`Generating promo pack for ${track.name}...`);

    try {
      const promoPack = await generatePromoPack(track);
      setPromoPacks((prev) => ({ ...prev, [track.id]: promoPack }));
      toast.success("Promo pack ready.", { id: promoToast });
    } catch (error) {
      console.error("Promo pack generation failed:", error);
      toast.error("Promo pack generation failed.", { id: promoToast });
    } finally {
      setIsGeneratingPromoPack(false);
    }
  };

  const getActivityLabel = (item: ActivityItem) => {
    if (item.type === "comment" && item.track_name && item.playlist_name) {
      return `${item.track_name} - ${item.playlist_name}`;
    }

    if (item.track_name && item.playlist_name) {
      return `${item.track_name} (${item.playlist_name})`;
    }

    return item.track_name || item.playlist_name || 'something';
  };

  const getActivityVerb = (item: ActivityItem) => {
    switch (item.type) {
      case "share":
        return "shared";
      case "thumbs_up":
        return "gave a thumbs up to";
      case "thumbs_down":
        return "gave a thumbs down to";
      case "comment":
        return "commented on";
      case "zip_upload":
        return "sent";
      default:
        return item.type;
    }
  };

  const clearActiveShare = () => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("share");
      url.searchParams.delete("expiresAt");
      url.searchParams.delete("allowDownload");
      url.searchParams.delete("playlistId");
      url.searchParams.delete("trackId");
      url.searchParams.delete("coverImage");
      window.history.replaceState({}, "", url.toString());
    }
    setActiveShareToken(null);
  };

  const handleSharePlaylist = async (item: Playlist | Track, clientName: string | null, options: ShareLinkOptions) => {
    if (!supabase) {
      toast.error('Supabase not connected.');
      return null;
    }

    try {
      const isPlaylist = 'track_ids' in item;
      const shareToken = createShareToken();
      const activityRows = isPlaylist
        ? item.track_ids.map((trackId) => {
            const track = tracks.find((entry) => entry.id === trackId);

            return {
              type: 'share',
              client_name: clientName || 'Public Link',
              playlist_name: item.name,
              track_name: track?.name || null,
              share_token: shareToken,
              item_type: "playlist",
              item_id: item.id,
              item_name: item.name,
              allow_download: options.allowDownload,
              expires_at: options.expiresAt,
              cover_image_url: item.image_url || tracks.find((entry) => item.track_ids.includes(entry.id) && entry.image_url)?.image_url || null,
            };
          })
        : [{
            type: 'share',
            client_name: clientName || 'Public Link',
            playlist_name: null,
            track_name: item.name,
            share_token: shareToken,
            item_type: "track",
            item_id: item.id,
            item_name: item.name,
            allow_download: options.allowDownload,
            expires_at: options.expiresAt,
            cover_image_url: item.image_url || null,
          }];

      const { error: activityError } = await supabase
        .from('activities')
        .insert(activityRows);

      if (activityError) {
        console.warn('Activity log insert failed for share link.', activityError);
      }

      const coverImage =
        item.image_url ||
        (isPlaylist
          ? tracks.find((entry) => item.track_ids.includes(entry.id) && entry.image_url)?.image_url || null
          : null);
      const shareLinkRecord = {
        token: shareToken,
        share_token: shareToken,
        item_type: isPlaylist ? "playlist" : "track",
        item_id: item.id,
        item_name: item.name,
        client_name: clientName || "Public Link",
        allow_download: options.allowDownload,
        expires_at: options.expiresAt,
        cover_image_url: coverImage,
      };

      let shareUrl = `${window.location.origin}/share.php?share=${shareToken}`;

      const { error: shareLinkError } = await supabase
        .from('share_links')
        .insert([shareLinkRecord]);

      if (shareLinkError) {
        console.warn('share_links insert failed, keeping short token link.', shareLinkError);
      }

      if (activityError && shareLinkError) {
        const shareUrlParams = new URLSearchParams();
        shareUrlParams.set("share", shareToken);
        shareUrlParams.set("allowDownload", options.allowDownload ? "1" : "0");
        if (isPlaylist) {
          shareUrlParams.set("playlistId", item.id);
        } else {
          shareUrlParams.set("trackId", item.id);
        }
        if (coverImage) {
          shareUrlParams.set("coverImage", coverImage);
        }
        if (options.expiresAt) {
          shareUrlParams.set("expiresAt", options.expiresAt);
        }
        shareUrl = `${window.location.origin}/share.php?${shareUrlParams.toString()}`;
      }
      
      toast.success(
        clientName
          ? `${isPlaylist ? 'Playlist' : 'Track'} shared with ${clientName}!`
          : `${isPlaylist ? 'Playlist' : 'Track'} public link created!`
      );
      fetchData();
      return shareUrl;
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share.');
      return null;
    }
  };

  const handleAnalyzeTrack = async (track: Track) => {
    if (!supabase) return;
    if (!ai) {
      toast.error('Analysis is not configured. Set VITE_GEMINI_API_KEY.');
      return;
    }
    
    const analysisToast = toast.loading(`Analyzing ${track.name}...`);
    
    try {
      // 1. Update status to processing
      await supabase.from('tracks').update({ status: 'processing' }).eq('id', track.id);
      fetchData();

      // 2. AI Analysis
      const analysis = await analyzeTrackMetadata(track.name);
      
      // 3. Update track with analysis
      const { error } = await supabase
        .from('tracks')
        .update({
          bpm: analysis.bpm,
          key_signature: analysis.key,
          duration: analysis.duration,
          status: 'ready'
        })
        .eq('id', track.id);

      if (error) throw error;
      
      toast.success('Analysis complete!', { id: analysisToast });
      fetchData();
    } catch (error) {
      console.error('Error analyzing track:', error);
      toast.error('Analysis failed.', { id: analysisToast });
      await supabase.from('tracks').update({ status: 'ready' }).eq('id', track.id);
      fetchData();
    }
  };

  const handlePlayTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
      toast.success(`Now playing: ${track.name}`);
    }
  };

  const togglePlay = () => {
    if (!currentTrack) {
      toast.error("No track selected");
      return;
    }
    setIsPlaying(!isPlaying);
  };

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero Section */}
            <div className="relative h-64 rounded-2xl overflow-hidden group">
              <img 
                src="/hero-ogbeatz.jpg" 
                alt="OGBeatz hero banner" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
              <div className="absolute bottom-8 left-8">
                <h2 className="text-4xl font-black text-white tracking-tighter mb-2">OGBEATZ HUB</h2>
                <p className="text-zinc-300 font-medium max-w-md">
                  Manage tracks, playlists, clients, shares, and activity from one place.
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Tracks" value={tracks.length.toString()} trend="+12%" icon={Music} />
              <StatCard label="Active Clients" value={clients.length.toString()} trend="+4%" icon={Users} />
              <StatCard 
                label="Total Plays" 
                value={tracks.reduce((sum, t) => sum + (t.plays || 0), 0).toLocaleString()} 
                trend="+22%" 
                icon={Play} 
              />
              <StatCard 
                label="Engagement" 
                value={`${tracks.reduce((sum, t) => sum + (t.plays || 0), 0) > 0 
                  ? Math.round((tracks.reduce((sum, t) => sum + (t.likes || 0), 0) / tracks.reduce((sum, t) => sum + (t.plays || 0), 0)) * 100) 
                  : 0}%`} 
                trend="-2%" 
                icon={Activity} 
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Performance Overview</h3>
                  <select 
                    onChange={(e) => toast(`View changed to: ${e.target.value}`)}
                    className="bg-zinc-800 border-none text-zinc-400 text-xs rounded-md px-2 py-1 outline-none cursor-pointer hover:bg-zinc-700 transition-colors"
                  >
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                  </select>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ANALYTICS_DATA}>
                      <defs>
                        <linearGradient id="colorPlays" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#71717a" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#71717a" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                        itemStyle={{ color: '#f97316' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="plays" 
                        stroke="#f97316" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorPlays)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-6">Recent Activity</h3>
                <div className="space-y-6">
                  {activities.length > 0 ? (
                    activities.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-orange-500">
                          {(item.client_name || 'S')[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-zinc-300">
                            <span className="font-bold text-white">{item.client_name || 'System'}</span> {getActivityVerb(item)} <span className="text-orange-500 font-medium">{getActivityLabel(item)}</span>
                          </p>
                          <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-zinc-500 text-sm italic">No recent activity</p>
                    </div>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => setActiveView("activity")}
                  className="w-full mt-8 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors border-t border-zinc-800 pt-4"
                >
                  VIEW ALL ACTIVITY
                </button>
              </div>
            </div>
          </div>
        );
      case "tracks":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Music Library</h2>
              <button 
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-lg shadow-orange-500/20"
              >
                <Plus size={18} />
                UPLOAD TRACK
              </button>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-x-auto">
              <div className="p-4 border-bottom border-zinc-800 flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search tracks, genres, keys..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <button 
                  type="button"
                  onClick={() => toast.info("Filters coming soon!")}
                  className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:text-white transition-colors"
                >
                  <Filter size={18} />
                </button>
              </div>

              <table className="w-full min-w-[920px] text-left">
                <thead>
                  <tr className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest border-y border-zinc-800">
                    <th className="px-6 py-4">Track Details</th>
                    <th className="px-6 py-4">BPM / Key</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Stats</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {tracks.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((track) => {
                    const feedbackCounts = getTrackFeedbackCounts(track.name);

                    return (
                    <tr key={track.id} className="group hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 ring-1 ring-zinc-800 shadow-[0_8px_20px_rgba(0,0,0,0.25)] flex-shrink-0">
                            {track.image_url ? (
                              <img src={track.image_url} alt={track.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                <Music size={24} className="text-zinc-500" />
                              </div>
                            )}
                          </div>
                          <button 
                            type="button"
                            onClick={() => handlePlayTrack(track)}
                            className={cn(
                              "w-11 h-11 bg-zinc-800 rounded-full flex items-center justify-center transition-colors cursor-pointer flex-shrink-0",
                              currentTrack?.id === track.id ? "text-orange-500" : "text-zinc-500 group-hover:text-orange-500"
                            )}
                          >
                            {currentTrack?.id === track.id && isPlaying ? <Pause size={20} /> : <Play size={20} />}
                          </button>
                          <div>
                            <div className="text-sm font-bold text-white">{track.name}</div>
                            <div className="text-xs text-zinc-500">{track.artist}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {track.status === 'processing' ? (
                          <div className="flex items-center gap-2 text-orange-500">
                            <Activity size={14} className="animate-pulse" />
                            <span className="text-xs font-bold animate-pulse">ANALYZING...</span>
                          </div>
                        ) : (
                          <>
                            <div className="text-sm text-zinc-300 font-mono">{track.bpm || '--'} BPM</div>
                            <div className="text-xs text-zinc-500 font-mono">{track.key_signature || '--'}</div>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-400 font-mono">
                        {track.status === 'processing' ? '--:--' : `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}`}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          <span className="flex items-center gap-1"><Play size={12} /> {track.plays}</span>
                          <span className="flex items-center gap-1"><ThumbsUp size={12} className="text-emerald-500" /> {feedbackCounts.thumbsUp}</span>
                          <span className="flex items-center gap-1"><ThumbsDown size={12} className="text-rose-500" /> {feedbackCounts.thumbsDown}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider",
                          track.status === "ready" ? "bg-emerald-500/10 text-emerald-500" :
                          track.status === "sent" ? "bg-blue-500/10 text-blue-500" :
                          "bg-zinc-500/10 text-zinc-500"
                        )}>
                          {track.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {track.status !== 'processing' && (
                            <button 
                              type="button"
                              onClick={() => handleAnalyzeTrack(track)}
                              className="p-2 text-zinc-500 hover:text-orange-500 transition-colors"
                              title="Re-analyze track"
                            >
                              <Sparkles size={16} />
                            </button>
                          )}
                          <TrackOptionsMenu
                            track={track}
                            onEdit={() => {
                              setEditingTrack(track);
                              setIsEditTrackModalOpen(true);
                            }}
                            onShare={() => {
                              setSelectedTrackForShare(track);
                              setSelectedPlaylistForShare(null);
                              setIsShareModalOpen(true);
                            }}
                            onDownload={() => handleDownloadTrack(track)}
                            onDelete={() => handleDeleteTrack(track)}
                            onCreatePromo={() => handleOpenPromoPack(track)}
                          />
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "playlists":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedPlaylist ? selectedPlaylist.name : "Playlists"}
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {selectedPlaylist
                    ? "Open a playlist to manage individual tracks."
                    : "Choose a playlist to view, edit, remove, or add tracks."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedPlaylist && (
                  <button
                    type="button"
                    onClick={closePlaylist}
                    className="px-4 py-2 rounded-lg border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
                  >
                    BACK TO PLAYLISTS
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsCreatePlaylistModalOpen(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-lg shadow-orange-500/20"
                >
                  <Plus size={18} />
                  NEW PLAYLIST
                </button>
              </div>
            </div>
            {selectedPlaylist ? (
              <div className="space-y-6">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="grid lg:grid-cols-[320px_1fr]">
                    <div className="relative min-h-[260px]">
                      {selectedPlaylist.image_url ? (
                        <img
                          src={selectedPlaylist.image_url}
                          alt={selectedPlaylist.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: `linear-gradient(135deg, ${selectedPlaylist.color_from}, ${selectedPlaylist.color_to})` }}
                        >
                          <Music size={72} className="text-white/20" />
                        </div>
                      )}
                    </div>
                    <div className="p-6 lg:p-8 flex flex-col justify-between gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-[0.25em] text-orange-500">
                          <ListMusic size={12} />
                          Playlist Detail
                        </div>
                        <div>
                          <h3 className="text-3xl font-black text-white tracking-tight">{selectedPlaylist.name}</h3>
                          <p className="text-zinc-400 mt-2 max-w-2xl">
                            {selectedPlaylist.description || "No description yet."}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-300">
                          {selectedPlaylist.track_ids.length} tracks
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAddTrackToPlaylistModalOpen(true)}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all"
                        >
                          <Plus size={16} />
                          ADD TRACK
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPlaylist(selectedPlaylist);
                            setIsEditPlaylistModalOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors flex items-center gap-2"
                        >
                          <Settings size={16} />
                          EDIT PLAYLIST
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPlaylistForShare(selectedPlaylist);
                            setIsShareModalOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors flex items-center gap-2"
                        >
                          <Share2 size={16} />
                          SHARE
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
                          className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                        >
                          <X size={16} />
                          DELETE PLAYLIST
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-x-auto">
                  <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                      <input
                        type="text"
                        placeholder="Search tracks in this playlist..."
                        value={playlistTrackSearch}
                        onChange={(e) => setPlaylistTrackSearch(e.target.value)}
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                  </div>

                  {filteredSelectedPlaylistTracks.length > 0 ? (
                    <table className="w-full min-w-[900px] text-left">
                      <thead>
                        <tr className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest border-b border-zinc-800">
                          <th className="px-6 py-4">Track</th>
                          <th className="px-6 py-4">Details</th>
                          <th className="px-6 py-4">Stats</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {filteredSelectedPlaylistTracks.map((track) => (
                          <tr key={track.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 ring-1 ring-zinc-800 shadow-[0_8px_20px_rgba(0,0,0,0.25)] flex-shrink-0">
                                  {track.image_url ? (
                                    <img src={track.image_url} alt={track.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                      <Music size={24} className="text-zinc-500" />
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handlePlayTrack(track)}
                                  className={cn(
                                    "w-11 h-11 bg-zinc-800 rounded-full flex items-center justify-center transition-colors flex-shrink-0",
                                    currentTrack?.id === track.id ? "text-orange-500" : "text-zinc-500 hover:text-orange-500"
                                  )}
                                >
                                  {currentTrack?.id === track.id && isPlaying ? <Pause size={18} /> : <Play size={18} />}
                                </button>
                                <div>
                                  <p className="text-sm font-bold text-white">{track.name}</p>
                                  <p className="text-xs text-zinc-500">{track.artist}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-zinc-300 font-mono">{track.bpm} BPM • {track.key_signature}</p>
                              <p className="text-xs text-zinc-500">
                                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')} • {track.status}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4 text-xs text-zinc-500">
                                <span className="flex items-center gap-1"><Play size={12} /> {track.plays}</span>
                                <span className="flex items-center gap-1"><Heart size={12} /> {track.likes}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTrack(track);
                                    setIsEditTrackModalOpen(true);
                                  }}
                                  className="px-3 py-2 rounded-lg border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors text-xs font-bold"
                                >
                                  EDIT
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTrackFromPlaylist(track.id)}
                                  className="px-3 py-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors text-xs font-bold"
                                >
                                  DELETE
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center">
                      <ListMusic size={40} className="mx-auto text-zinc-800 mb-4" />
                      <p className="text-lg font-bold text-white">
                        {selectedPlaylistTracks.length === 0 ? "This playlist is empty" : "No tracks match that search"}
                      </p>
                      <p className="text-sm text-zinc-500 mt-2">
                        {selectedPlaylistTracks.length === 0
                          ? "Add an individual track to start building this playlist."
                          : "Try a different search term."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              playlists.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      type="button"
                      onClick={() => openPlaylist(playlist)}
                      className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden group hover:border-orange-500/50 transition-all text-left"
                    >
                      <div className="relative aspect-square overflow-hidden">
                        {playlist.image_url ? (
                          <img
                            src={playlist.image_url}
                            alt={playlist.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500"
                            style={{ background: `linear-gradient(135deg, ${playlist.color_from}, ${playlist.color_to})` }}
                          >
                            <Music size={64} className="text-white/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-xl">
                            <Play size={24} fill="currentColor" />
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-white mb-1">{playlist.name}</h3>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-500 font-medium">{playlist.track_ids?.length || 0} Tracks</span>
                          <span className="text-[10px] uppercase font-bold text-orange-500 tracking-wider">Open</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-900/50 border border-zinc-800 p-12 rounded-xl text-center">
                  <ListMusic size={48} className="mx-auto text-zinc-800 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">No Playlists Yet</h3>
                  <p className="text-zinc-500 text-sm max-w-xs mx-auto">Create a playlist to start organizing tracks.</p>
                </div>
              )
            )}
          </div>
        );
      case "clients":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedClient ? selectedClient.name : "Clients"}
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {selectedClient
                    ? "Review this client, update their details, and inspect track-level actions."
                    : "Open a client card to view details and track actions."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedClient && (
                  <button
                    type="button"
                    onClick={closeClient}
                    className="px-4 py-2 rounded-lg border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
                  >
                    BACK TO CLIENTS
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => setIsCreateClientModalOpen(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-lg shadow-orange-500/20"
                >
                  <Plus size={18} />
                  ADD CLIENT
                </button>
              </div>
            </div>
            {selectedClient ? (
              <div className="space-y-6">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 lg:p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex items-start gap-5">
                      <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl font-black text-orange-500">
                        {selectedClient.name[0]}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-3xl font-black text-white tracking-tight">{selectedClient.name}</h3>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            selectedClient.status === "online" ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-700 text-zinc-300"
                          )}>
                            {selectedClient.status}
                          </span>
                        </div>
                        <p className="text-zinc-400">{selectedClient.email}</p>
                        <div className="flex flex-wrap gap-3 text-sm">
                          <div className="px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300">
                            {selectedClient.activePlaylists} active playlists
                          </div>
                          <div className="px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300">
                            Last active: {selectedClient.lastActive}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingClient(selectedClient);
                          setIsEditClientModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
                      >
                        EDIT CLIENT
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-bold text-white">Message Client</h4>
                      <p className="text-sm text-zinc-500 mt-1">Send a direct message without leaving this client view.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveView("messages")}
                      className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors text-sm font-bold"
                    >
                      OPEN MESSAGES
                    </button>
                  </div>
                  <div className="space-y-3">
                    <textarea
                      value={clientMessageDraft}
                      onChange={(e) => setClientMessageDraft(e.target.value)}
                      placeholder={`Write a message to ${selectedClient.name}...`}
                      rows={5}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-orange-500 transition-colors resize-none"
                    />
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs text-zinc-500">
                        Messages are sent to {selectedClient.email}.
                      </p>
                      <button
                        type="button"
                        onClick={handleSendClientMessage}
                        disabled={!clientMessageDraft.trim() || isSendingClientMessage}
                        className={cn(
                          "px-5 py-2.5 rounded-xl font-bold transition-colors",
                          clientMessageDraft.trim() && !isSendingClientMessage
                            ? "bg-orange-500 hover:bg-orange-600 text-white"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        )}
                      >
                        {isSendingClientMessage ? "SENDING..." : "SEND MESSAGE"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
                  <div>
                    <h4 className="text-lg font-bold text-white">Send ZIP Delivery</h4>
                    <p className="text-sm text-zinc-500 mt-1">Upload a ZIP file and send its link to this client.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">ZIP File</span>
                      <input
                        type="file"
                        accept=".zip,application/zip,application/x-zip-compressed"
                        onChange={(e) => setSelectedClientZip(e.target.files?.[0] || null)}
                        className="mt-2 block w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-orange-600"
                      />
                    </label>
                    <textarea
                      value={clientZipNote}
                      onChange={(e) => setClientZipNote(e.target.value)}
                      placeholder="Optional note to include with the ZIP delivery..."
                      rows={3}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-orange-500 transition-colors resize-none"
                    />
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs text-zinc-500">
                        {selectedClientZip ? `Selected: ${selectedClientZip.name}` : "Choose a ZIP file to send."}
                      </p>
                      <button
                        type="button"
                        onClick={handleSendClientZip}
                        disabled={!selectedClientZip || isUploadingClientZip}
                        className={cn(
                          "px-5 py-2.5 rounded-xl font-bold transition-colors",
                          selectedClientZip && !isUploadingClientZip
                            ? "bg-orange-500 hover:bg-orange-600 text-white"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        )}
                      >
                        {isUploadingClientZip ? "UPLOADING..." : "UPLOAD ZIP"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-x-auto">
                  <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                      <input
                        type="text"
                        placeholder="Search this client's track actions..."
                        value={clientTrackSearch}
                        onChange={(e) => setClientTrackSearch(e.target.value)}
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                  </div>

                  {selectedClientTrackActivities.length > 0 ? (
                    <table className="w-full min-w-[760px] text-left">
                      <thead>
                        <tr className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest border-b border-zinc-800">
                          <th className="px-6 py-4">Track</th>
                          <th className="px-6 py-4">Action</th>
                          <th className="px-6 py-4">When</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {selectedClientTrackActivities.map((item) => {
                          const relatedTrack = tracks.find((track) => track.name === item.track_name);
                          return (
                            <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                              <td className="px-6 py-4">
                                <div>
                                  <p className="text-sm font-bold text-white">{item.track_name}</p>
                                  <p className="text-xs text-zinc-500">
                                    {relatedTrack ? `${relatedTrack.artist} • ${relatedTrack.bpm} BPM • ${relatedTrack.key_signature}` : "Track activity record"}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400">
                                  {item.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-zinc-400">
                                {new Date(item.created_at).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center">
                      <Music size={40} className="mx-auto text-zinc-800 mb-4" />
                      <p className="text-lg font-bold text-white">
                        {selectedClientActivities.length > 0 ? "No track actions match that search" : "No individual track actions yet"}
                      </p>
                      <p className="text-sm text-zinc-500 mt-2">
                        {selectedClientActivities.length > 0
                          ? "Try a different track name or action."
                          : "Track-level activity will appear here when this client interacts with tracks."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              clients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clients.map((client) => {
                    const feedbackCounts = getClientFeedbackCounts(client.name);

                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => openClient(client)}
                        className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl hover:border-orange-500/40 transition-all text-left"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-orange-500">
                            {client.name[0]}
                          </div>
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            client.status === "online" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-zinc-600"
                          )}></div>
                        </div>
                        <h3 className="font-bold text-white">{client.name}</h3>
                        <p className="text-xs text-zinc-500 mb-4">{client.email}</p>
                        <div className="flex items-center gap-4 mb-4 text-xs text-zinc-500">
                          <span className="flex items-center gap-1"><ThumbsUp size={12} className="text-emerald-500" /> {feedbackCounts.thumbsUp}</span>
                          <span className="flex items-center gap-1"><ThumbsDown size={12} className="text-rose-500" /> {feedbackCounts.thumbsDown}</span>
                          <span>{feedbackCounts.comments} comments</span>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                          <div className="text-center">
                            <p className="text-sm font-bold text-white">{client.activePlaylists}</p>
                            <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Playlists</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-zinc-300">{client.lastActive}</p>
                            <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Last Active</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-zinc-900/50 border border-zinc-800 p-12 rounded-xl text-center">
                  <Users size={48} className="mx-auto text-zinc-800 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">No Clients Yet</h3>
                  <p className="text-zinc-500 text-sm max-w-xs mx-auto">Add a client to start tracking shares and interactions.</p>
                </div>
              )
            )}
          </div>
        );
      case "activity":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-white">Activity Feed</h2>
            <div className="space-y-4">
              {activities.length > 0 ? (
                activities.map((item) => (
                  <div key={item.id} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-orange-500">
                      {(item.client_name || 'S')[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-zinc-300">
                        <span className="font-bold text-white">{item.client_name || 'System'}</span> {getActivityVerb(item)} <span className="text-orange-500 font-medium">{getActivityLabel(item)}</span>
                      </p>
                      <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest mt-1">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-zinc-500">
                      {item.type === "share" && <Share2 size={16} className="text-emerald-500" />}
                      {item.type === "upload" && <Upload size={16} className="text-blue-500" />}
                      {item.type === "analyze" && <Sparkles size={16} className="text-orange-500" />}
                      {item.type === "thumbs_up" && <ThumbsUp size={16} className="text-emerald-500" />}
                      {item.type === "thumbs_down" && <ThumbsDown size={16} className="text-rose-500" />}
                      {item.type === "comment" && <MessageSquare size={16} className="text-orange-500" />}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-zinc-900/50 border border-zinc-800 p-12 rounded-xl text-center">
                  <Activity size={48} className="mx-auto text-zinc-800 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">No Activity Yet</h3>
                  <p className="text-zinc-500 text-sm max-w-xs mx-auto">When you share playlists or upload tracks, they will appear here in your activity feed.</p>
                </div>
              )}
            </div>
          </div>
        );
      case "messages":
        return (
          <div className="h-[calc(100vh-200px)] flex animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-80 border-r border-zinc-900 pr-6 space-y-4">
              <h2 className="text-xl font-bold text-white mb-6">Messages</h2>
              {clients.map((client) => (
                <button 
                  type="button"
                  key={client.id} 
                  onClick={() => toast(`Chat with ${client.name} selected`)}
                  className="w-full text-left p-3 rounded-xl hover:bg-zinc-900 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-orange-500">
                      {client.name[0]}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-white truncate">{client.name}</span>
                        <span className="text-[10px] text-zinc-500">12:45</span>
                      </div>
                      <p className="text-xs text-zinc-500 truncate">Hey OG, the new mix sounds incredible...</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex-1 flex flex-col pl-6">
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
                <MessageSquare size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose a client to start messaging.</p>
              </div>
            </div>
          </div>
        );
      case "settings":
        const isSupabaseConnected = !!supabase;
        return (
          <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-white">Settings</h2>
            <div className="space-y-6">
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Database Connection</h3>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-white">Supabase Status</p>
                    <p className="text-xs text-zinc-500">
                      {isSupabaseConnected 
                        ? "Supabase client initialized from the current environment" 
                        : "Supabase client is not initialized. Check your URL and anon key."}
                    </p>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    isSupabaseConnected ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                  )}>
                    {isSupabaseConnected ? "Active" : "Disconnected"}
                  </div>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-white">Data Load Status</p>
                      <p className="text-xs text-zinc-500">
                        {dataLoadIssue
                          ? "The UI reached Supabase, but at least one startup query did not complete cleanly."
                          : hasAnyData
                            ? "Startup queries completed and returned data."
                            : "Startup queries completed, but no rows were returned yet."}
                      </p>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      dataLoadIssue ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
                    )}>
                      {dataLoadIssue ? "Needs Attention" : "Healthy"}
                    </div>
                  </div>
                  {dataLoadIssue ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-orange-400">{dataLoadIssue.summary}</p>
                      {dataLoadIssue.details.map((detail) => (
                        <p key={detail} className="text-xs text-zinc-400 break-words">{detail}</p>
                      ))}
                    </div>
                  ) : !hasAnyData ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-orange-400">No rows came back from `tracks`, `clients`, `playlists`, or `activities`.</p>
                      <p className="text-xs text-zinc-400">If you expected content here, confirm those tables contain records in your Supabase project.</p>
                    </div>
                  ) : null}
                </div>
              </section>
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Account</h3>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
                  <div className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-white">Email Address</p>
                      <p className="text-xs text-zinc-500">cory.cts.management@gmail.com</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => toast.info("Email change requested")}
                      className="text-xs font-bold text-orange-500 hover:text-orange-400"
                    >
                      Change
                    </button>
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-white">Password</p>
                      <p className="text-xs text-zinc-500">••••••••••••</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => toast.info("Password reset link sent")}
                      className="text-xs font-bold text-orange-500 hover:text-orange-400"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </section>
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Preferences</h3>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
                  <div className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-white">Notifications</p>
                      <p className="text-xs text-zinc-500">Receive alerts for client activity</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => toast.success("Notifications enabled")}
                      className="w-10 h-5 bg-orange-500 rounded-full relative"
                    >
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                    </button>
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-white">Auto-Analysis</p>
                      <p className="text-xs text-zinc-500">Automatically analyze BPM and Key on upload</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => toast.success("Auto-analysis enabled")}
                      className="w-10 h-5 bg-zinc-700 rounded-full relative"
                    >
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        );
      case "profile":
        return (
          <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-orange-500 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-orange-500/20">
                OB
              </div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">OGBeatz Admin</h2>
                <p className="text-orange-500 font-bold text-sm tracking-widest uppercase mt-1">Professional Producer</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
                <p className="text-2xl font-bold text-white">{tracks.length}</p>
                <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Total Tracks</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
                <p className="text-2xl font-bold text-white">{clients.length}</p>
                <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Active Clients</p>
              </div>
            </div>
          </div>
        );
      case "notifications":
        return (
          <div className="max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-white">Notifications</h2>
            <div className="space-y-4">
              {[
                { title: "New Feedback", content: "Elena Rodriguez left a comment on 'Neon Skyline'", time: "2m ago", unread: true },
                { title: "Track Downloaded", content: "Marcus Thorne downloaded 'Urban Pulse'", time: "15m ago", unread: true },
                { title: "System Update", content: "OGBeatz Hub v2.4 is now live with improved waveform analysis.", time: "1h ago", unread: false },
              ].map((notif, i) => (
                <div key={i} className={cn(
                  "p-4 rounded-xl border transition-all",
                  notif.unread ? "bg-orange-500/5 border-orange-500/20" : "bg-zinc-900/50 border-zinc-800"
                )}>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-sm font-bold text-white">{notif.title}</h3>
                    <span className="text-[10px] text-zinc-500 font-bold">{notif.time}</span>
                  </div>
                  <p className="text-xs text-zinc-400">{notif.content}</p>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  if (activeShareToken) {
    const sharedClientName = activeShareLink?.client_name || sharedActivities[0]?.client_name || "Client";
    const hasSharedContent = Boolean(activeShareLink) || sharedActivities.length > 0 || Boolean(activeSharePlaylistId) || Boolean(activeShareTrackId);

    return (
      <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-orange-500/30">
        <Toaster position="top-right" theme="dark" richColors />
        <audio
          ref={audioRef}
          src={currentTrack?.file_url || undefined}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleTrackEnd}
          onError={handleAudioError}
          preload="auto"
        />
        <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-start gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-900 ring-1 ring-zinc-800">
                <img src="/logo.svg" alt="OGBeatz logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                  {sharedContentTitle}
                </h1>
                <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-orange-500 mt-1">Shared Link</p>
              </div>
            </div>
          </div>
          {hasSharedContent && !isActiveShareExpired ? (
            <>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="grid md:grid-cols-[320px_1fr]">
                  <div className="min-h-[280px]">
                    {sharedHeroImage ? (
                      <img
                        src={sharedHeroImage}
                        alt={sharedPlaylist?.name || sharedTracks[0]?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center p-10"
                        style={sharedPlaylist ? { background: `linear-gradient(135deg, ${sharedPlaylist.color_from}, ${sharedPlaylist.color_to})` } : { backgroundColor: "#18181b" }}
                      >
                        <img
                          src="/logo.svg"
                          alt="OGBeatz logo"
                          className="max-w-[220px] w-full h-auto object-contain opacity-95 drop-shadow-2xl"
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-8 space-y-4">
                    <div className="text-sm text-zinc-400">
                      Shared with {sharedClientName}
                    </div>
                    <div className="text-zinc-300">
                      {sharedPlaylist
                        ? `${sharedTracks.length} tracks are available in this shared playlist.`
                        : "A single track has been shared with you."}
                    </div>
                    {!activeShareAllowDownload && (
                      <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Downloads are disabled for this link.
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                      {sharedTracks[0]?.file_url && (
                        <button
                          type="button"
                          onClick={() => handlePlayTrack(sharedTracks[0])}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold transition-colors"
                        >
                          {currentTrack?.id === sharedTracks[0].id && isPlaying ? "PAUSE" : "PLAY"}
                        </button>
                      )}
                      {sharedTracks[0]?.file_url && activeShareAllowDownload && (
                        <button
                          type="button"
                          onClick={() => handleDownloadTrack(sharedTracks[0])}
                          className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
                        >
                          DOWNLOAD
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800">
                  <h2 className="text-lg font-bold text-white">Tracks</h2>
                </div>
                <div className="divide-y divide-zinc-800/50">
                  {sharedTracks.map((track) => {
                    const feedbackCounts = getTrackFeedbackCounts(track.name);

                    return (
                      <div key={track.id} className="px-6 py-5 space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 ring-1 ring-zinc-800 shadow-[0_8px_20px_rgba(0,0,0,0.25)] flex items-center justify-center flex-shrink-0">
                              {track.image_url ? (
                                <img src={track.image_url} alt={track.name} className="w-full h-full object-cover" />
                              ) : (
                                <Music size={24} className="text-zinc-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">{track.name}</p>
                              <p className="text-xs text-zinc-500 truncate">{track.artist}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                                <span className="flex items-center gap-1"><ThumbsUp size={12} className="text-emerald-500" /> {feedbackCounts.thumbsUp}</span>
                                <span className="flex items-center gap-1"><ThumbsDown size={12} className="text-rose-500" /> {feedbackCounts.thumbsDown}</span>
                                <span>{feedbackCounts.comments} comments</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {track.file_url && (
                              <button
                                type="button"
                                onClick={() => handlePlayTrack(track)}
                                className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors"
                              >
                                {currentTrack?.id === track.id && isPlaying ? "PAUSE" : "PLAY"}
                              </button>
                            )}
                            {track.file_url && activeShareAllowDownload && (
                              <button
                                type="button"
                                onClick={() => handleDownloadTrack(track)}
                                className="px-3 py-2 rounded-lg border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 text-xs font-bold transition-colors"
                              >
                                DOWNLOAD
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTrackFeedback(track, "thumbs_up", sharedClientName)}
                            disabled={isSubmittingClientFeedbackForTrackId === track.id}
                            className="px-3 py-2 rounded-lg border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 transition-colors text-xs font-bold flex items-center gap-2"
                          >
                            <ThumbsUp size={14} />
                            THUMBS UP
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTrackFeedback(track, "thumbs_down", sharedClientName)}
                            disabled={isSubmittingClientFeedbackForTrackId === track.id}
                            className="px-3 py-2 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-colors text-xs font-bold flex items-center gap-2"
                          >
                            <ThumbsDown size={14} />
                            THUMBS DOWN
                          </button>
                        </div>
                        <div className="flex items-end gap-3">
                          <textarea
                            value={clientTrackComments[track.id] || ""}
                            onChange={(e) =>
                              setClientTrackComments((prev) => ({ ...prev, [track.id]: e.target.value }))
                            }
                            placeholder={`Add a comment for ${track.name}...`}
                            rows={2}
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-orange-500 transition-colors resize-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleTrackFeedback(track, "comment", sharedClientName)}
                            disabled={!clientTrackComments[track.id]?.trim() || isSubmittingClientFeedbackForTrackId === track.id}
                            className={cn(
                              "px-4 py-3 rounded-xl font-bold transition-colors text-sm",
                              clientTrackComments[track.id]?.trim() && isSubmittingClientFeedbackForTrackId !== track.id
                                ? "bg-orange-500 hover:bg-orange-600 text-white"
                                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                            )}
                          >
                            COMMENT
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : isActiveShareExpired ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
              <h2 className="text-xl font-bold text-white">This share link has expired</h2>
              <p className="text-zinc-500 text-sm mt-2">Ask for a new shared link with a later expiration date.</p>
            </div>
          ) : (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
              <h2 className="text-xl font-bold text-white">Share link not found</h2>
              <p className="text-zinc-500 text-sm mt-2">This share token is invalid or the shared activity could not be loaded.</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-orange-500/30">
      <Toaster position="top-right" theme="dark" richColors />
      
      <audio 
        ref={audioRef}
        src={currentTrack?.file_url || undefined}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleTrackEnd}
        onError={handleAudioError}
        preload="auto"
      />
      
      <CreateTrackModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSubmit={handleCreateTrack} 
      />

      <CreateClientModal 
        isOpen={isCreateClientModalOpen}
        onClose={() => setIsCreateClientModalOpen(false)}
        onSubmit={handleCreateClient}
      />

      <EditClientModal
        isOpen={isEditClientModalOpen}
        onClose={() => {
          setIsEditClientModalOpen(false);
          setEditingClient(null);
        }}
        client={editingClient}
        onSubmit={handleUpdateClient}
      />

      <CreatePlaylistModal 
        isOpen={isCreatePlaylistModalOpen}
        onClose={() => setIsCreatePlaylistModalOpen(false)}
        onSubmit={handleCreatePlaylist}
        tracks={tracks}
      />

      <EditPlaylistModal
        isOpen={isEditPlaylistModalOpen}
        onClose={() => {
          setIsEditPlaylistModalOpen(false);
          setEditingPlaylist(null);
        }}
        playlist={editingPlaylist}
        onSubmit={handleUpdatePlaylist}
      />

      <EditTrackModal
        isOpen={isEditTrackModalOpen}
        onClose={() => {
          setIsEditTrackModalOpen(false);
          setEditingTrack(null);
        }}
        track={editingTrack}
        onSubmit={handleUpdateTrack}
      />

      <AddTrackToPlaylistModal
        isOpen={isAddTrackToPlaylistModalOpen}
        onClose={() => setIsAddTrackToPlaylistModalOpen(false)}
        playlist={selectedPlaylist}
        tracks={tracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPreviewTrack={handlePlayTrack}
        onSubmit={handleAddTrackToPlaylist}
      />

      <ShareModal 
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setSelectedPlaylistForShare(null);
          setSelectedTrackForShare(null);
        }}
        playlist={selectedPlaylistForShare}
        track={selectedTrackForShare}
        clients={clients}
        onSubmit={handleSharePlaylist}
      />

      <PromoPackModal
        isOpen={isPromoPackModalOpen}
        onClose={() => {
          setIsPromoPackModalOpen(false);
          setSelectedTrackForPromo(null);
        }}
        track={selectedTrackForPromo}
        promoPack={selectedTrackForPromo ? promoPacks[selectedTrackForPromo.id] || null : null}
        isGenerating={isGeneratingPromoPack}
        onGenerate={handleGeneratePromoPack}
      />

      {/* Sidebar */}
      <aside className="hidden md:block fixed left-0 top-0 bottom-0 w-64 bg-zinc-950 border-r border-zinc-900 z-50">
        <div className="p-6 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-orange-500/20 ring-1 ring-zinc-800">
              <img src="/logo.svg" alt="OGBeatz logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-lg font-black tracking-tighter text-white uppercase leading-none">
              OGBEATZ<br/><span className="text-orange-500 text-xs tracking-[0.2em]">HUB</span>
            </h1>
          </div>
        </div>

        <nav className="px-4 space-y-2">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={activeView === "dashboard"} 
            onClick={() => setActiveView("dashboard")} 
          />
          <SidebarItem 
            icon={Music} 
            label="Tracks" 
            active={activeView === "tracks"} 
            onClick={() => setActiveView("tracks")} 
          />
          <SidebarItem 
            icon={ListMusic} 
            label="Playlists" 
            active={activeView === "playlists"} 
            onClick={() => setActiveView("playlists")} 
          />
          <SidebarItem 
            icon={Users} 
            label="Clients" 
            active={activeView === "clients"} 
            onClick={() => setActiveView("clients")} 
          />
          <SidebarItem 
            icon={Activity} 
            label="Activity" 
            active={activeView === "activity"} 
            onClick={() => setActiveView("activity")} 
          />
          <SidebarItem 
            icon={MessageSquare} 
            label="Messages" 
            active={activeView === "messages"} 
            onClick={() => setActiveView("messages")} 
          />
        </nav>

        <div className="absolute bottom-8 left-4 right-4 space-y-2">
          <SidebarItem 
            icon={Settings} 
            label="Settings" 
            active={activeView === "settings"} 
            onClick={() => setActiveView("settings")} 
          />
          <button 
            type="button"
            onClick={() => setActiveView("profile")}
            className="w-full p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 mt-4 hover:bg-zinc-800 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white">
                OB
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-white truncate">OGBeatz Admin</p>
                <p className="text-[10px] text-zinc-500 truncate">PRO PRODUCER</p>
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-0 md:ml-64 p-4 md:p-8 pb-28 md:pb-32 transition-all duration-300 relative overflow-x-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
              <p className="text-orange-500 font-bold text-xs tracking-widest uppercase">Syncing with Supabase...</p>
            </div>
          </div>
        )}
        {/* Header */}
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8 md:mb-12">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">
              {activeView.charAt(0).toUpperCase() + activeView.slice(1)}
            </h2>
            <p className="text-zinc-500 text-sm mt-1 font-medium">
              Welcome back, OG. Here's what's happening today.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => setActiveView("notifications")}
              className={cn(
                "p-2 transition-colors relative",
                activeView === "notifications" ? "text-orange-500" : "text-zinc-400 hover:text-white"
              )}
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full border-2 border-black"></span>
            </button>
            <div className="h-8 w-px bg-zinc-800 mx-2"></div>
            <button 
              type="button"
              onClick={() => setActiveView("profile")}
              className={cn(
                "flex items-center gap-2 border px-3 py-1.5 rounded-lg transition-colors",
                activeView === "profile" 
                  ? "bg-orange-500/10 border-orange-500 text-orange-500" 
                  : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white"
              )}
            >
              <User size={18} className={cn(activeView === "profile" ? "text-orange-500" : "text-zinc-400")} />
              <span className="hidden sm:inline text-sm font-bold">Profile</span>
            </button>
          </div>
        </header>

        <div className="md:hidden mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { key: "dashboard", label: "Dashboard" },
              { key: "tracks", label: "Tracks" },
              { key: "playlists", label: "Playlists" },
              { key: "clients", label: "Clients" },
              { key: "activity", label: "Activity" },
              { key: "messages", label: "Messages" },
              { key: "settings", label: "Settings" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveView(item.key as View)}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-colors",
                  activeView === item.key
                    ? "bg-orange-500/15 border-orange-500 text-orange-400"
                    : "bg-zinc-900 border-zinc-800 text-zinc-300"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {dataLoadIssue && (
          <div className="mb-8 border border-rose-500/30 bg-rose-500/10 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] font-bold text-rose-300">Data Load Issue</p>
                <p className="text-sm font-bold text-white mt-1">{dataLoadIssue.summary}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveView("settings")}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-zinc-200 hover:bg-white/10 transition-colors"
              >
                OPEN SETTINGS
              </button>
            </div>
            {dataLoadIssue.details.slice(0, 2).map((detail) => (
              <p key={detail} className="text-sm text-zinc-300 break-words">{detail}</p>
            ))}
          </div>
        )}

        {renderContent()}
      </main>

      {/* Mobile Player Bar */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-900 z-50 px-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center ring-1 ring-zinc-800 flex-shrink-0">
            {currentTrack?.image_url ? (
              <img src={currentTrack.image_url} alt={currentTrack.name} className="w-full h-full object-cover" />
            ) : (
              <img src="/logo.svg" alt="OGBeatz logo" className="w-full h-full object-cover opacity-80" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{currentTrack?.name || "No track selected"}</p>
            <p className="text-[10px] text-zinc-500 truncate">{currentTrack?.artist || "Select a track"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentTrack && (
            <button
              type="button"
              onClick={() => {
                setEditingTrack(currentTrack);
                setIsEditTrackModalOpen(true);
              }}
              className="w-9 h-9 rounded-full border border-zinc-700 text-zinc-300 flex items-center justify-center"
            >
              <Settings size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={togglePlay}
            className="w-9 h-9 bg-white text-black rounded-full flex items-center justify-center"
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <button
            type="button"
            onClick={() => (currentTrack ? handleDownloadTrack(currentTrack) : toast.error("No download link available"))}
            className="w-9 h-9 rounded-full border border-zinc-700 text-zinc-300 flex items-center justify-center"
          >
            <Download size={16} />
          </button>
        </div>
      </footer>

      {/* Desktop Player Bar */}
      <footer className="hidden md:flex fixed bottom-0 left-64 right-0 h-24 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-900 z-50 px-8 items-center justify-between">
        <div className="flex items-center gap-4 w-1/3">
          <div className="w-16 h-16 bg-zinc-800 rounded-xl overflow-hidden flex items-center justify-center ring-1 ring-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            {currentTrack ? (
              currentTrack.image_url ? (
                <img src={currentTrack.image_url} alt={currentTrack.name} className="w-full h-full object-cover" />
              ) : (
                <img src="/logo.svg" alt="OGBeatz logo" className="w-full h-full object-cover" />
              )
            ) : (
              <img src="/logo.svg" alt="OGBeatz logo" className="w-full h-full object-cover opacity-70" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{currentTrack?.name || "No track selected"}</p>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              {currentTrack ? `${currentTrack.artist} • ${currentTrack.bpm} BPM` : "Select a track to play"}
            </p>
          </div>
          <button 
            type="button"
            onClick={() => toast.success("Added to favorites")}
            className="ml-4 text-zinc-500 hover:text-orange-500 transition-colors"
          >
            <Heart size={18} />
          </button>
          {currentTrack && (
            <button
              type="button"
              onClick={() => {
                setEditingTrack(currentTrack);
                setIsEditTrackModalOpen(true);
              }}
              className="ml-2 px-3 py-2 rounded-lg border border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
            >
              Edit Track Info
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 w-1/3">
          <div className="flex items-center gap-6">
            <button 
              type="button"
              onClick={() => toast.info("Previous track")}
              className="text-zinc-500 hover:text-white transition-colors rotate-180"
            >
              <ChevronRight size={20} />
            </button>
            <button 
              type="button"
              onClick={togglePlay}
              className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>
            <button 
              type="button"
              onClick={() => toast.info("Next track")}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="w-full flex items-center gap-3">
            <span className="text-[10px] font-mono text-zinc-500">
              {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}
            </span>
            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 left-0 h-full bg-orange-500 transition-all duration-100" 
                style={{ width: `${(currentTime / (currentTrack?.duration || 1)) * 100}%` }}
              ></div>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">{currentTrack ? `${Math.floor(currentTrack.duration / 60)}:${(currentTrack.duration % 60).toString().padStart(2, '0')}` : "0:00"}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-6 w-1/3">
          <div className="flex items-center gap-2 text-zinc-500">
            <button
              type="button"
              onClick={() => {
                if (currentTrack) {
                  setSelectedTrackForShare(currentTrack);
                  setIsShareModalOpen(true);
                } else {
                  toast.error("Select a track to share");
                }
              }}
              className="p-1 hover:text-white transition-colors"
            >
              <Share2 size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentTrack?.file_url) {
                  handleDownloadTrack(currentTrack);
                } else {
                  toast.error("No download link available");
                }
              }}
              className="p-1 hover:text-white transition-colors"
            >
              <Download size={18} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <div className="w-24 h-1 bg-zinc-800 rounded-full relative group cursor-pointer">
              <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setIsMuted(false);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="h-full bg-orange-500 rounded-full" 
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
