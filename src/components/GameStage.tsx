interface GameStageProps {
  children: React.ReactNode;
}

/**
 * GameStage - Full viewport container for all screens.
 * Mobile-first portrait layout, scales naturally on desktop.
 * No landscape lock, no letterboxing - always 100vw x 100vh.
 */
export function GameStage({ children }: GameStageProps) {
  return (
    <div 
      className="fixed inset-0 w-screen h-screen overflow-hidden bg-background"
      style={{
        minWidth: '100vw',
        minHeight: '100vh',
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