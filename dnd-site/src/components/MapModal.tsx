import { useState } from 'react'

export const MapModal = ({ isOpen, onClose, curT, mapUrl }: { isOpen: boolean, onClose: () => void, curT: any, mapUrl: string }) => {
  const [zoom, setZoom] = useState(1);
  if (!isOpen) return null;
  return (
    <div className="char-sheet-overlay" onClick={onClose} style={{ zIndex: 5000 }}>
      <div className="char-sheet-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '90%', height: '90vh', background: '#0a0a0c', border: '2px solid var(--accent)', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <button className="close-btn" style={{ color: 'var(--accent)', zIndex: 10 }} onClick={onClose}>×</button>

        <div style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid var(--accent-muted)', position: 'relative', background: 'rgba(0,0,0,0.5)' }}>
          <h2 style={{ margin: 0, fontFamily: 'Cinzel', color: 'var(--accent)' }}>Carte de la Région</h2>

          {/* Zoom Controls */}
          <div style={{ position: 'absolute', right: '60px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--accent)', color: 'var(--accent)', width: '30px', height: '30px', borderRadius: '5px', cursor: 'pointer' }}
            >-</button>
            <span style={{ color: 'var(--accent)', fontSize: '0.8rem', lineHeight: '30px', minWidth: '40px' }}>{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--accent)', color: 'var(--accent)', width: '30px', height: '30px', borderRadius: '5px', cursor: 'pointer' }}
            >+</button>
            <button
              onClick={() => setZoom(1)}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '0 10px', height: '30px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.7rem' }}
            >{curT.reset}</button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: zoom > 1 ? 'grab' : 'default' }}>
          <div style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'inline-block'
          }}>
            <img
              src={mapUrl}
              alt="Carte du monde"
              style={{ display: 'block', maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
