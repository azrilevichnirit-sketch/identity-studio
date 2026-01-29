import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft } from 'lucide-react';

interface UndoConfirmPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  disabled?: boolean;
}

export function UndoConfirmPopover({ open, onOpenChange, onConfirm, disabled }: UndoConfirmPopoverProps) {
  const handleConfirm = () => {
    if (!disabled) {
      onConfirm();
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg transition-all duration-200 hover:bg-white hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-slate-800" style={{ transform: 'scaleX(-1)' }} />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        side="bottom" 
        align="end"
        sideOffset={8}
        className="w-auto p-3 bg-slate-800/95 border-slate-600/50 backdrop-blur-sm z-50"
        style={{
          fontFamily: "'Rubik', sans-serif",
          direction: 'rtl',
        }}
      >
        <p className="text-white text-sm mb-3 text-center">רוצה לחזור אחורה?</p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={handleConfirm}
            disabled={disabled}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            כן
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-slate-600 text-white hover:bg-slate-500 transition-colors"
          >
            לא
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Keep old export for backwards compatibility (unused now)
export const UndoConfirmDialog = UndoConfirmPopover;
