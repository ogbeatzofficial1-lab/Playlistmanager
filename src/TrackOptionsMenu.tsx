import React from "react";
import { MoreVertical, Share2, Download, Trash2, Sparkles, Pencil } from "lucide-react";

interface TrackOptionsMenuProps {
  track: any;
  onEdit: () => void;
  onShare: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onCreatePromo: () => void;
}

const TrackOptionsMenu: React.FC<TrackOptionsMenuProps> = ({
  track,
  onEdit,
  onShare,
  onDownload,
  onDelete,
  onCreatePromo,
}) => {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical size={20} />
        <span className="sr-only">Track options</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg z-50 animate-in fade-in slide-in-from-top-2">
          <button
            className="flex items-center w-full px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors gap-3"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <Pencil size={16} /> Edit Track Info
          </button>
          <button
            className="flex items-center w-full px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors gap-3"
            onClick={() => {
              setOpen(false);
              onShare();
            }}
          >
            <Share2 size={16} /> Share
          </button>
          <button
            className="flex items-center w-full px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors gap-3"
            onClick={() => {
              setOpen(false);
              onDownload();
            }}
          >
            <Download size={16} /> Download
          </button>
          <button
            className="flex items-center w-full px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors gap-3"
            onClick={() => {
              setOpen(false);
              onCreatePromo();
            }}
          >
            <Sparkles size={16} /> Create Promo
          </button>
          <button
            className="flex items-center w-full px-4 py-3 text-sm text-red-500 hover:bg-red-600/10 transition-colors gap-3"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default TrackOptionsMenu;
