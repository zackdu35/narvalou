export const Grimoire = ({ char, onClose, curT }: { char: any, onClose: () => void, curT: any }) => {
  if (!char) return null;
  return (
    <div className="char-sheet-overlay" onClick={onClose} style={{ zIndex: 4000 }}>
      <div className="char-sheet-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <button className="close-btn" onClick={onClose}>×</button>
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <span style={{ fontSize: '2.2rem' }}>📜</span>
          <h2 style={{ margin: '5px 0', fontFamily: 'Cinzel', color: 'var(--accent)', fontSize: '1.8rem' }}>{curT.grimoireHelp} : {char.name}</h2>
          <p style={{ opacity: 0.7, fontStyle: 'italic', marginBottom: '15px', fontSize: '0.85rem' }}>{curT.essential}</p>

          {char.spellSlots?.max > 0 && (
            <div style={{
              display: 'inline-block',
              background: 'rgba(74, 144, 226, 0.1)',
              border: '1px solid #4a90e2',
              padding: '10px 25px',
              borderRadius: '5px',
              marginBottom: '30px',
              boxShadow: '0 0 15px rgba(74, 144, 226, 0.2)'
            }}>
              <span style={{ color: '#4a90e2', fontSize: '0.8rem', letterSpacing: '1px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                ⚡ {curT.spellSlots} :
                <span style={{ color: '#fff', fontSize: '1.2rem', marginLeft: '10px' }}>{char.spellSlots.current} / {char.spellSlots.max}</span>
              </span>
            </div>
          )}
        </div>
        <div className="grimoire-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {char.grimoire?.map((spell: any, i: number) => (
            <div key={i} style={{ borderBottom: '1px solid var(--accent-muted)', paddingBottom: '15px' }}>
              <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--accent)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {spell.name}
              </strong>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-primary)' }}>{spell.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '30px', padding: '15px', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '8px', fontSize: '0.8rem', border: '1px dashed var(--accent)' }}>
          <strong style={{ color: 'var(--accent)' }}>💡 {curT.dmAdvice.split(':')[0]} :</strong> {curT.dmAdvice.split(':')[1]}
        </div>
      </div>
    </div>
  );
};
