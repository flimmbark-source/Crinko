import { useMemo, useState } from 'react';
import { chooseAiBeatCard, chooseAiKeep } from '../game/ai/opponent';
import { getCard, initDuel, keepCards, resolveBeat } from '../game/engine/core';
import type { DuelState, PlayerId, RangeBand, Tag } from '../game/engine/types';

const rewardOptions = [
  { id: 'add', label: 'Add card: Center Cut' },
  { id: 'remove', label: 'Remove weakest card' },
  { id: 'upgrade', label: 'Upgrade one card (+1 dmg)' }
];

const rangeBands: RangeBand[] = ['Near', 'Mid', 'Far'];

function labelWinner(state: DuelState): string {
  if (state.winner === 'draw') return 'Draw';
  if (state.winner === 'player') return 'Victory';
  if (state.winner === 'ai') return 'Defeat';
  return '';
}

function tagIcon(tag: Tag): string {
  if (tag === 'Attack') return '⚔';
  if (tag === 'Defense') return '⛨';
  return '✦';
}

function flavorForSchool(school: string): string {
  return school === 'Stone' ? 'Stone discipline. Endure, then break steel.' : 'Wind school. Read intent and cut first.';
}

function schoolFromPassive(passive: 'stone' | 'wind'): 'Stone' | 'Wind' {
  return passive === 'stone' ? 'Stone' : 'Wind';
}

function flowLabel(state: DuelState): string {
  if (state.winner) return labelWinner(state);
  if (state.fighters.player.hand.length === 0) return 'Choose three techniques to begin the exchange.';
  return `Beat ${state.beat} — simultaneous reveal pending.`;
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

  const latestLog = state.logs[0];
  const lastCards = latestLog
    ? {
        player: getCard(latestLog.cards.player),
        ai: getCard(latestLog.cards.ai)
      }
    : null;

  const firstResolver = useMemo(() => {
    if (!lastCards) return 'Awaiting first clash';
    if (lastCards.player.speed === lastCards.ai.speed) {
      return state.fighters.player.initiative ? 'You acted first (initiative tie-break)' : 'Rival acted first (initiative tie-break)';
    }

    return lastCards.player.speed < lastCards.ai.speed ? 'You acted first (lower speed)' : 'Rival acted first (lower speed)';
  }, [lastCards, state.fighters.player.initiative]);

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
    const fighter = state.fighters[id];
    const foe = id === 'player' ? state.fighters.ai : state.fighters.player;
    const hpPct = Math.max(0, (fighter.hp / 20) * 100);
    const school = schoolFromPassive(fighter.passive);

    return (
      <article className={`duelist ${id === 'player' ? 'isPlayer' : 'isEnemy'}`}>
        <div className="duelistFigure" aria-hidden>
          <div className="duelistHalo" />
          <div className="duelistBody">{school === 'Stone' ? '⛰' : '風'}</div>
        </div>
        <div className="duelistHud">
          <div className="duelistHead">
            <h2>{id === 'player' ? 'You' : 'Rival'}</h2>
            <span className="duelistSchool">{school}</span>
          </div>
          <p>{flavorForSchool(school)}</p>
          <div className="hpRail" role="img" aria-label={`${id} hp ${fighter.hp} out of 20`}>
            <div className="hpNow" style={{ width: `${hpPct}%` }} />
            <span>{fighter.hp} / 20</span>
          </div>
          <div className="duelistChips">
            <span className={`hudChip ${fighter.initiative ? 'active' : ''}`}>Initiative</span>
            <span className="hudChip">Flow {fighter.flow}</span>
            <span className={`hudChip ${fighter.armed ? 'active armed' : ''}`}>{fighter.armed ? `Armed: ${fighter.armed.name}` : 'Armed: —'}</span>
            <span className={`hudChip ${fighter.hp >= foe.hp ? 'active' : ''}`}>{fighter.hp >= foe.hp ? 'Advantage' : 'Pressed'}</span>
          </div>
        </div>
      </article>
    );
  };

  const renderCard = (cardId: string, selected: boolean, onClick: () => void) => {
    const card = getCard(cardId);
    return (
      <button className={`techCard ${selected ? 'selected' : ''}`} key={cardId} onClick={onClick}>
        <div className="cardCrest">
          <span className="medallion rank">{card.rank}</span>
          <span className="medallion speed">SPD {card.speed}</span>
        </div>
        <header className="cardName">{card.name}</header>
        <div className="chipCluster">
          {card.tags.map((tag) => (
            <span key={tag} className="miniChip">
              {tagIcon(tag)} {tag}
            </span>
          ))}
        </div>
        <div className="cardNumbers">
          <span>DMG {card.damage}</span>
          <span>GRD {card.guard}</span>
          <span>MOV {card.move}</span>
        </div>
        <footer className="cardLore">
          <p>Hit band: {card.hit === 'MidOrFar' ? 'Mid or Far' : card.hit}</p>
          <p>
            Flow:{' '}
            {card.cashOutFlow
              ? 'Cash out'
              : card.flowDamageBonus
                ? `Bonus +${card.flowDamageBonus}`
                : card.reduceEnemyFlow
                  ? `Disrupt ${card.reduceEnemyFlow}`
                  : 'Stable'}
          </p>
        </footer>
      </button>
    );
  };

  return (
    <main className="app">
      <section className="duelStage">
        <header className="stageTopline">
          <p>Stormlit Courtyard • Exchange {state.exchange}</p>
          <h1>Samurai Card Duel</h1>
          <span>{flowLabel(state)}</span>
        </header>

        <div className="sceneField">
          {actorStatus('ai')}

          <div className="rangeTotem" role="status" aria-live="polite">
            <p>Shared Range</p>
            <div className="rangeStones">
              {rangeBands.map((band) => (
                <span key={band} className={`stone ${state.range === band ? 'active' : ''}`}>
                  {band}
                </span>
              ))}
            </div>
            <label className="fastResolveToggle">
              <input
                type="checkbox"
                checked={state.fastResolve}
                onChange={(e) => {
                  state.fastResolve = e.target.checked;
                  setState({ ...state });
                }}
              />
              Fast Resolve
            </label>
          </div>

          {actorStatus('player')}
        </div>
      </section>

      <section className="clashLane" aria-live="polite">
        <div className="laneTitle">
          <h3>Clash Reveal Lane</h3>
          <span>{latestLog ? `Resolved beat ${latestLog.beat}` : 'No revealed cards yet'}</span>
        </div>

        <div className="clashCore">
          <article className="revealPane enemy">
            <h4>Rival Reveal</h4>
            {lastCards ? (
              <>
                <strong>{lastCards.ai.name}</strong>
                <small>
                  Rank {lastCards.ai.rank} · Speed {lastCards.ai.speed}
                </small>
              </>
            ) : (
              <small className="placeholder">Hidden technique</small>
            )}
          </article>

          <div className="clashPulse">
            <span>⚡</span>
            <p>{firstResolver}</p>
          </div>

          <article className="revealPane player">
            <h4>Your Reveal</h4>
            {lastCards ? (
              <>
                <strong>{lastCards.player.name}</strong>
                <small>
                  Rank {lastCards.player.rank} · Speed {lastCards.player.speed}
                </small>
              </>
            ) : (
              <small className="placeholder">Choose and reveal</small>
            )}
          </article>
        </div>

        {latestLog && (
          <ul className="eventRibbon">
            {latestLog.events.slice(0, 5).map((event, i) => (
              <li key={`${event}-${i}`}>{event}</li>
            ))}
          </ul>
        )}
      </section>

      {phase === 'keep' && (
        <section className="handZone">
          <div className="handHeader">
            <h2>Draft Your Three Techniques</h2>
            <span>{selectedKeep.length} / 3 selected</span>
          </div>

          <div className="preparedTechniques">
            <p>Prepared Row</p>
            <div>
              {selectedKeep.length > 0 ? selectedKeep.map((id) => <em key={id}>{getCard(id).name}</em>) : <small>No techniques prepared yet.</small>}
            </div>
          </div>

          <div className="handRail keep">{state.fighters.player.draw.map((id) => renderCard(id, selectedKeep.includes(id), () => pickKeep(id)))}</div>

          <button className="primaryButton" disabled={selectedKeep.length !== 3} onClick={onStartExchange}>
            Lock Techniques
          </button>
        </section>
      )}

      {phase === 'battle' && (
        <section className="handZone">
          <div className="handHeader">
            <h2>Hand of Techniques</h2>
            <span>Beat {state.beat} • {state.fighters.player.hand.length} left</span>
          </div>

          <div className="preparedTechniques">
            <p>Prepared Strike</p>
            <div>
              {selectedBeatCard ? <em>{getCard(selectedBeatCard).name}</em> : <small>Select one technique to reveal.</small>}
            </div>
          </div>

          <div className="handRail battle">
            {state.fighters.player.hand.map((id) =>
              renderCard(id, selectedBeatCard === id, () => {
                setSelectedBeatCard(id);
              })
            )}
          </div>

          <button className="primaryButton revealButton" disabled={!selectedBeatCard} onClick={onResolveBeat}>
            Reveal Simultaneously
          </button>

          <details className="combatLog">
            <summary>Transcript</summary>
            {state.logs.slice(0, 5).map((log, i) => (
              <article key={`${log.beat}-${i}`}>
                <p>
                  Beat {log.beat}: You used {getCard(log.cards.player).name} / Rival used {getCard(log.cards.ai).name}
                </p>
                <ul>
                  {log.events.map((event, idx) => (
                    <li key={idx}>{event}</li>
                  ))}
                </ul>
              </article>
            ))}
          </details>
        </section>
      )}

      {phase === 'end' && (
        <section className="endPanel">
          <h2>{labelWinner(state)}</h2>
          <p>Choose one post-duel reward:</p>
          <div className="rewards">
            {rewardOptions.map((reward) => (
              <button key={reward.id} onClick={() => setPostReward(reward.label)}>
                {reward.label}
              </button>
            ))}
          </div>
          {postReward && <p className="rewardResult">Selected: {postReward}</p>}
          <button className="primaryButton" onClick={restart}>
            Start New Duel
          </button>
        </section>
      )}
    </main>
  );
}
