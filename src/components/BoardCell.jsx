import { useState } from 'react';

function BoardCell({
  shipPart,
  showShip,
  shotStatus,
  onClick,
  disabled,
}) {
  // Falls back to a simple grey ship block if the PNG file isn't in public/ships/ yet
  const [imgError, setImgError] = useState(false);

  let className = 'cell';
  if (showShip && shipPart) className += ' has-ship';
  if (shotStatus === 'hit') className += ' hit';
  if (shotStatus === 'miss') className += ' miss';

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {/* Render the ship slice if this square has a visible ship */}
      {showShip && shipPart && (
        <div
          className={
            shipPart.horizontal ? 'ship-slice' : 'ship-slice vertical'
          }
        >
          {!imgError ? (
            <img
              src={shipPart.image}
              alt={shipPart.name}
              style={{
                width: `${shipPart.length * 100}%`,
                left: `-${shipPart.partIndex * 100}%`,
              }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="ship-fallback">{shipPart.short}</div>
          )}
        </div>
      )}

      {/* Hit or Miss marker */}
      {shotStatus === 'hit' && <span className="marker hit-marker">X</span>}
      {shotStatus === 'miss' && <span className="marker miss-marker">•</span>}
    </button>
  );
}

export default BoardCell;