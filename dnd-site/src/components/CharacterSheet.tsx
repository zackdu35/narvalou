export const CharacterSheet = ({ char, onClose, getMod }: { char: any, onClose: () => void, getMod: (score: number) => string | number }) => {
  if (!char) return null;

  return (
    <div className="char-sheet-overlay" onClick={onClose}>
      <div className="char-sheet-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" style={{ color: 'var(--accent)', top: '15px', right: '15px', fontSize: '2rem' }} onClick={onClose}>×</button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px', borderBottom: '2px solid var(--accent)', paddingBottom: '10px', position: 'relative' }}>
          <h2 style={{ margin: 0, textAlign: 'left', flex: 1, fontFamily: 'Cinzel', fontSize: '2.5rem', color: 'var(--accent)', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>{char.name}</h2>

          <div style={{ textAlign: 'right', fontSize: '0.85rem', fontFamily: 'Cinzel', color: 'var(--text-secondary)', paddingRight: '40px' }}>
            <div>
              <strong style={{ color: 'var(--accent)' }}>CLASSE & NIVEAU:</strong> <span style={{ color: '#fff' }}>{char.class} {char.level}</span>
            </div>
            <div style={{ marginTop: '4px' }}>
              <strong style={{ color: 'var(--accent)' }}>RACE:</strong> <span style={{ color: '#fff' }}>{char.race}</span>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.65rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 'bold' }}>Expérience : {char.xp.current} / {char.xp.next} XP</span>
              <div style={{ width: '180px', height: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '3px', overflow: 'hidden', marginTop: '5px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
                <div style={{
                  width: `${(char.xp.current / char.xp.next) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #d4af37, #f7d794)',
                  boxShadow: '0 0 10px rgba(212, 175, 55, 0.5)',
                  transition: 'width 1s ease-out'
                }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="dnd-sheet-grid">
          <div className="attributes-col">
            {[
              { n: 'Force', s: char.stats.str, id: 'str' },
              { n: 'Dextérité', s: char.stats.dex, id: 'dex' },
              { n: 'Constitution', s: char.stats.con, id: 'con' },
              { n: 'Intelligence', s: char.stats.int, id: 'int' },
              { n: 'Sagesse', s: char.stats.wis, id: 'wis' },
              { n: 'Charisme', s: char.stats.cha, id: 'cha' }
            ].map(stat => (
              <div className="attribute-item" key={stat.id}>
                <span className="name">{stat.n}</span>
                <span className="modifier">{getMod(stat.s)}</span>
                <div className="score-circle">{stat.s}</div>
              </div>
            ))}
          </div>

          <div className="skills-col">
            <div className="proficiency-bonus">
              <div style={{ width: '22px', height: '22px', border: '2px solid var(--accent)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent)' }}>+2</div>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent)' }}>Bonus de Maîtrise</span>
            </div>

            <div className="skills-list" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', textAlign: 'center', borderBottom: '1px solid var(--accent)', paddingBottom: '3px', fontSize: '0.7rem', color: 'var(--accent)' }}>COMPÉTENCES</div>
              {[
                { n: 'Acrobaties', a: 'dex' },
                { n: 'Arcanes', a: 'int' },
                { n: 'Athlétisme', a: 'str' },
                { n: 'Discrétion', a: 'dex' },
                { n: 'Histoire', a: 'int' },
                { n: 'Intimidation', a: 'cha' },
                { n: 'Investigation', a: 'int' },
                { n: 'Médecine', a: 'wis' },
                { n: 'Nature', a: 'int' },
                { n: 'Perception', a: 'wis' },
                { n: 'Persuasion', a: 'cha' },
                { n: 'Religion', a: 'int' },
                { n: 'Survie', a: 'wis' }
              ].map(s => (
                <div className="skill-row" key={s.n}>
                  <div className="bubble" style={{ borderColor: 'var(--accent)' }}></div>
                  <div className="mod" style={{ borderBottomColor: 'var(--accent)' }}>{getMod(char.stats[s.a as keyof typeof char.stats])}</div>
                  <span style={{ color: 'var(--text-primary)' }}>{s.n} <small style={{ opacity: 0.5, fontSize: '0.6rem' }}>({s.a.toUpperCase()})</small></span>
                </div>
              ))}
            </div>
          </div>

          <div className="combat-col">
            <div className="combat-stats">
              <div className="combat-box">
                <span className="label">CA</span>
                <span className="value">{10 + parseInt(String(getMod(char.stats.dex)))}</span>
              </div>
              <div className="combat-box">
                <span className="label">Init.</span>
                <span className="value">{getMod(char.stats.dex)}</span>
              </div>
              <div className="combat-box">
                <span className="label">Vitesse</span>
                <span className="value" style={{ fontSize: '1.4rem' }}>9m</span>
              </div>
              {char.spellSlots?.max > 0 && (
                <div className="combat-box" style={{ border: '1px solid #4a90e2', background: 'rgba(74, 144, 226, 0.05)' }}>
                  <span className="label" style={{ color: '#4a90e2' }}>Sorts (Lvl 1)</span>
                  <span className="value" style={{ color: '#fff' }}>{char.spellSlots.current} / {char.spellSlots.max}</span>
                </div>
              )}
            </div>

            <div className="hp-box" style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--accent)' }}>
              <div className="hp-value" style={{ fontSize: '2.2rem', color: '#fff' }}>{char.hp.current} / {char.hp.max}</div>
              <div className="hp-label" style={{ fontWeight: 'bold', letterSpacing: '1px', color: 'var(--accent)' }}>Points de Vie Actuels</div>
            </div>

            <div style={{ border: '2px solid var(--accent)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', marginTop: '20px' }}>
              <img src={char.image} alt={char.name} style={{ width: '100%', height: '450px', objectFit: 'cover', objectPosition: 'center 20%', display: 'block', transition: 'all 0.5s' }} />
            </div>
          </div>

          <div className="personality-col">
            <div className="personality-item">
              <span className="label">Traits de Personnalité</span>
              <div className="text">{char.description}</div>
            </div>
            <div className="personality-item">
              <span className="label">Idéaux</span>
              <div className="text">{char.ideals}</div>
            </div>
            <div className="personality-item">
              <span className="label">Liens</span>
              <div className="text">{char.bonds}</div>
            </div>
            <div className="personality-item" style={{ flex: 1 }}>
              <span className="label">Capacités & Traits</span>
              <div className="text" style={{ fontSize: '0.75rem' }}>
                {char.features?.map((f: string, i: number) => (
                  <div key={i}>• {f}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="inventory-col">
            <div style={{ fontWeight: 'bold', marginBottom: '8px', textAlign: 'center', borderBottom: '1px solid var(--accent)', paddingBottom: '3px', fontSize: '0.7rem', color: 'var(--accent)' }}>INVENTAIRE ACTIF</div>
            <div className="inventory-list" style={{ background: 'rgba(0,0,0,0.4)' }}>
              {char.inventory?.map((item: string, i: number) => (
                <div className="inventory-item" key={i} style={{ color: 'var(--text-secondary)' }}>{item}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
