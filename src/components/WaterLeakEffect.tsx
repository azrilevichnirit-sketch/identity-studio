/**
 * WaterLeakEffect - CSS-based water drip animation for Mission 9
 * Displays 4 water drops falling from the ceiling to simulate a roof leak
 */
export function WaterLeakEffect() {
  return (
    <div 
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 15 }}
      aria-hidden="true"
    >
      {/* Drip 1 - left area */}
      <div 
        className="absolute animate-water-drip"
        style={{ 
          left: '25%', 
          top: '5%',
          animationDelay: '0s',
        }}
      >
        <div className="water-drop" />
        <div className="water-splash" />
      </div>

      {/* Drip 2 - center-left */}
      <div 
        className="absolute animate-water-drip"
        style={{ 
          left: '40%', 
          top: '5%',
          animationDelay: '0.7s',
        }}
      >
        <div className="water-drop" />
        <div className="water-splash" />
      </div>

      {/* Drip 3 - center-right */}
      <div 
        className="absolute animate-water-drip"
        style={{ 
          left: '55%', 
          top: '5%',
          animationDelay: '1.4s',
        }}
      >
        <div className="water-drop" />
        <div className="water-splash" />
      </div>

      {/* Drip 4 - right area */}
      <div 
        className="absolute animate-water-drip"
        style={{ 
          left: '72%', 
          top: '5%',
          animationDelay: '2.1s',
        }}
      >
        <div className="water-drop" />
        <div className="water-splash" />
      </div>
    </div>
  );
}
