interface GameStageProps {
  children: React.ReactNode;
}

/**
 * GameStage - Full viewport container for all screens.
 * Mobile-first portrait layout, scales naturally on desktop/landscape.
 * Always 100vw x 100vh with no letterboxing or white margins.
 */
export function GameStage({ children }: GameStageProps) {
  return (
    <div 
      className="fixed inset-0 overflow-hidden bg-background"
      style={{
        width: '100vw',
        height: '100vh',
        minWidth: '100vw',
        minHeight: '100vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="relative w-full h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}
