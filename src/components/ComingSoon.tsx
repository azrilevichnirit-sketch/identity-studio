interface ComingSoonProps {
  onBack: () => void;
}

export function ComingSoon({ onBack }: ComingSoonProps) {
  return (
    <div className="screen-container">
      <div className="card-surface w-full max-w-sm text-center">
        <div className="text-5xl mb-4">🚧</div>
        <h1 className="text-2xl font-bold mb-2">בקרוב!</h1>
        <p className="text-muted-foreground mb-6">
          העולם הזה עדיין בפיתוח. חזור/י בקרוב!
        </p>
        
        <button
          onClick={onBack}
          className="w-full py-4 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-colors"
        >
          חזרה
        </button>
      </div>
    </div>
  );
}
