import { useMemo, useState } from 'react';
import { chooseAiBeatCard, chooseAiKeep } from '../game/ai/opponent';
import { getCard, initDuel, keepCards, resolveBeat } from '../game/engine/core';
import type { DuelState, PlayerId } from '../game/engine/types';

const rewardOptions = [
  { id: 'add', label: 'Add card: Center Cut' },
  { id: 'remove', label: 'Remove weakest card' },
  { id: 'upgrade', label: 'Upgrade one card (+1 dmg)' }
];

function labelWinner(state: DuelState): string {
  if (state.winner === 'draw') return 'Draw';
  if (state.winner === 'player') return 'Victory';
  if (state.winner === 'ai') return 'Defeat';
  return '';
}

export function App() {
  const [state, setState] = useState<DuelState>(() => initDuel(Date.now()));
  const [selectedKeep, setSelectedKeep] = useState<string[]>([]);
  const [selectedBeatCard, setSelectedBeatCard] = useState<string | null>(null);
  const [postReward, setPostReward] = useState<string | null>(null);

  const phase = useMemo(() => {
    if (state.winner) return 'end';
    if (state.fighters.player.hand.length === 0) return 'keep';
    return 'battle';
  }, [state]);

  const onStartExchange = () => {
    const aiKeep = chooseAiKeep(state);
    keepCards(state, selectedKeep, aiKeep);
    setState({ ...state });
    setSelectedBeatCard(null);
  };

  const onResolveBeat = () => {
    if (!selectedBeatCard) return;
    const aiCard = chooseAiBeatCard(state);
    resolveBeat(state, selectedBeatCard, aiCard);
    setState({ ...state });
    setSelectedBeatCard(null);
  };

  const restart = () => {
    setState(initDuel(Date.now()));
    setSelectedKeep([]);
    setSelectedBeatCard(null);
    setPostReward(null);
  };

  const pickKeep = (cardId: string) => {
    setSelectedKeep((prev) => {
      if (prev.includes(cardId)) return prev.filter((c) => c !== cardId);
      if (prev.length >= 3) return prev;
      return [...prev, cardId];
    });
  };

  const actorStatus = (id: PlayerId) => {
    const f = state.fighters[id];
    return (
      <div className="statusCard">
        <h3>{id === 'player' ? 'You' : 'AI'}</h3>
        <p>HP: {f.hp}</p>
        <p>Flow: {f.flow}</p>
        <p>Initiative: {f.initiative ? '●' : '○'}</p>
        <p>Armed: {f.armed ? `${f.armed.name} (Beat ${f.armed.triggerBeat})` : 'None'}</p>
      </div>
    );
  };

  return (
    <main className="app">
      <h1>Samurai Duel Prototype</h1>
      <section className="topBar">
        {actorStatus('player')}
        <div className="rangeBox">Range: {state.range}<br />Exchange {state.exchange} • Beat {state.beat}</div>
        {actorStatus('ai')}
      </section>

      {phase === 'keep' && (
        <section className="panel">
          <h2>Choose 3 of 5</h2>
          <div className="cards">
            {state.fighters.player.draw.map((id) => {
              const c = getCard(id);
              const picked = selectedKeep.includes(id);
              return (
                <button className={`card ${picked ? 'picked' : ''}`} key={id} onClick={() => pickKeep(id)}>
                  <strong>{c.name}</strong>
                  <span>Rank {c.rank}</span>
                  <span>Spd {c.speed} Dmg {c.damage} Gd {c.guard}</span>
                  <span>Hit: {c.hit}</span>
                </button>
              );
            })}
          </div>
          <button disabled={selectedKeep.length !== 3} onClick={onStartExchange}>Lock 3 Cards</button>
        </section>
      )}

      {phase === 'battle' && (
        <section className="panel">
          <h2>Beat {state.beat} Reveal</h2>
          <label><input type="checkbox" checked={state.fastResolve} onChange={(e) => { state.fastResolve = e.target.checked; setState({ ...state }); }} /> Fast Resolve</label>
          <div className="cards">
            {state.fighters.player.hand.map((id) => {
              const c = getCard(id);
              return (
                <button className={`card ${selectedBeatCard === id ? 'picked' : ''}`} key={id} onClick={() => setSelectedBeatCard(id)}>
                  <strong>{c.name}</strong>
                  <span>{c.tags.join('/')}</span>
                  <span>Rank {c.rank} • Spd {c.speed}</span>
                  <span>Dmg {c.damage} • Gd {c.guard} • Move {c.move}</span>
                  <span>Hit: {c.hit === 'MidOrFar' ? 'Mid or Far' : c.hit}</span>
                </button>
              );
            })}
          </div>
          <button disabled={!selectedBeatCard} onClick={onResolveBeat}>Reveal Simultaneously</button>

          <div className="log">
            <h3>Combat Log</h3>
            {state.logs.slice(0, 5).map((log, i) => (
              <article key={`${log.beat}-${i}`}>
                <p>Beat {log.beat}: You used {getCard(log.cards.player).name} / AI used {getCard(log.cards.ai).name}</p>
                <ul>{log.events.map((e, idx) => <li key={idx}>{e}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>
      )}

      {phase === 'end' && (
        <section className="panel">
          <h2>{labelWinner(state)}</h2>
          <p>Choose one post-duel reward:</p>
          <div className="rewards">
            {rewardOptions.map((r) => (
              <button key={r.id} onClick={() => setPostReward(r.label)}>{r.label}</button>
            ))}
          </div>
          {postReward && <p className="rewardResult">Selected: {postReward}</p>}
          <button onClick={restart}>Start New Duel</button>
        </section>
      )}
    </main>
  );
}
