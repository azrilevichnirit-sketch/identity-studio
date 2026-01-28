import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UndoConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  disabled?: boolean;
}

export function UndoConfirmDialog({ open, onOpenChange, onConfirm, disabled }: UndoConfirmDialogProps) {
  const handleConfirm = () => {
    if (!disabled) {
      onConfirm();
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm" dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>לחזור אחורה?</AlertDialogTitle>
          <AlertDialogDescription>
            הבחירה האחרונה תבוטל ותחזרי לשאלה הקודמת.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={disabled}
            className="flex-1"
          >
            כן, חזור
          </AlertDialogAction>
          <AlertDialogCancel className="flex-1">ביטול</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
