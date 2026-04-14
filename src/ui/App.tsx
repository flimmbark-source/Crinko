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
  return school === 'Stone' ? 'Unmoving form, crushing finish.' : 'Stormlight footwork, cutting reads.';
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
    const isLead = fighter.hp > foe.hp;

    return (
      <article className={`combatantPanel ${id === 'player' ? 'isPlayer' : 'isEnemy'}`}>
        <div className="panelFrame">
          <div className="portrait" aria-hidden>
            <span>{fighter.school === 'Stone' ? '⛰' : '風'}</span>
          </div>
          <div className="combatantMeta">
            <div className="nameRow">
              <h2>{id === 'player' ? 'You' : 'Rival'}</h2>
              <span className="schoolBadge">{fighter.school}</span>
            </div>
            <p className="schoolFlavor">{flavorForSchool(fighter.school)}</p>
            <div className="hpTrack" role="img" aria-label={`${id} hp ${fighter.hp} out of 20`}>
              <div className="hpFill" style={{ width: `${hpPct}%` }} />
              <span>{fighter.hp} / 20</span>
            </div>
            <div className="tokens">
              <span className={`token ${fighter.initiative ? 'active' : ''}`}>Initiative</span>
              <span className="token">Flow {fighter.flow}</span>
              <span className={`token armed ${fighter.armed ? 'active' : ''}`}>
                {fighter.armed ? `Armed: ${fighter.armed.name}` : 'Armed: —'}
              </span>
              <span className={`token ${isLead ? 'active' : ''}`}>{isLead ? 'Pressing' : 'Under Pressure'}</span>
            </div>
          </div>
        </div>
      </article>
    );
  };

  const renderCard = (cardId: string, selected: boolean, onClick: () => void) => {
    const card = getCard(cardId);
    return (
      <button className={`duelCard ${selected ? 'selected' : ''}`} key={cardId} onClick={onClick}>
        <div className="cardTop">
          <span className="rankPip">{card.rank}</span>
          <strong>{card.name}</strong>
          <span className="speedPip">SPD {card.speed}</span>
        </div>
        <div className="tagRow">
          {card.tags.map((tag) => (
            <span key={tag} className="tagChip">
              {tagIcon(tag)} {tag}
            </span>
          ))}
        </div>
        <div className="cardStats">
          <span>DMG {card.damage}</span>
          <span>GRD {card.guard}</span>
          <span>MOV {card.move}</span>
        </div>
        <div className="cardBottom">
          <span className="hitLine">Hit: {card.hit === 'MidOrFar' ? 'Mid or Far' : card.hit}</span>
          <span className="flowLine">Flow: {card.cashOutFlow ? 'Cash Out' : card.flowDamageBonus ? 'Boost' : card.reduceEnemyFlow ? `Disrupt ${card.reduceEnemyFlow}` : '—'}</span>
        </div>
      </button>
    );
  };

  return (
    <main className="app">
      <section className="duelScene">
        <header className="sceneHeader">
          <p className="sceneSubtitle">Shrouded Courtyard Duel</p>
          <h1>Samurai Card Duel</h1>
          <div className="battleMeta">Exchange {state.exchange} • Beat {state.beat} • Simultaneous Reveal</div>
        </header>

        <div className="fightersRow">
          {actorStatus('ai')}
          <div className="rangeBanner" role="status" aria-live="polite">
            <span className="rangeLabel">Shared Range</span>
            <div className="rangeTrack">
              {rangeBands.map((band) => (
                <span key={band} className={`rangeNode ${state.range === band ? 'active' : ''}`}>
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

        <section className="revealLane" aria-live="polite">
          <div className="laneHeader">
            <h3>Clash Lane</h3>
            <span>{latestLog ? `Resolved beat ${latestLog.beat}` : 'Awaiting first reveal'}</span>
          </div>
          <div className="clashCards">
            <article className="revealedCard">
              <h4>Enemy Reveal</h4>
              {lastCards ? (
                <>
                  <p>{lastCards.ai.name}</p>
                  <small>Rank {lastCards.ai.rank} • SPD {lastCards.ai.speed}</small>
                </>
              ) : (
                <p className="placeholder">Unknown technique</p>
              )}
            </article>
            <div className="clashCenter">
              <span>⚡</span>
              <small>{latestLog ? latestLog.events[0] : 'Select a card to force the clash.'}</small>
            </div>
            <article className="revealedCard isPlayer">
              <h4>Your Reveal</h4>
              {lastCards ? (
                <>
                  <p>{lastCards.player.name}</p>
                  <small>Rank {lastCards.player.rank} • SPD {lastCards.player.speed}</small>
                </>
              ) : (
                <p className="placeholder">Ready your first technique</p>
              )}
            </article>
          </div>
          {latestLog && (
            <ul className="eventStrip">
              {latestLog.events.slice(0, 4).map((event, i) => (
                <li key={`${event}-${i}`}>{event}</li>
              ))}
            </ul>
          )}
        </section>
      </section>

      {phase === 'keep' && (
        <section className="panel handPanel">
          <div className="panelHeader">
            <h2>Choose 3 of 5 Techniques</h2>
            <span>Selected: {selectedKeep.length} / 3</span>
          </div>
          <div className="handGrid keepPhase">
            {state.fighters.player.draw.map((id) => renderCard(id, selectedKeep.includes(id), () => pickKeep(id)))}
          </div>
          <div className="preparedRow">
            <span>Prepared:</span>
            {selectedKeep.map((id) => (
              <em key={id}>{getCard(id).name}</em>
            ))}
          </div>
          <button className="primaryButton" disabled={selectedKeep.length !== 3} onClick={onStartExchange}>
            Lock Techniques
          </button>
        </section>
      )}

      {phase === 'battle' && (
        <section className="panel handPanel">
          <div className="panelHeader">
            <h2>Choose Technique for Beat {state.beat}</h2>
            <span>{state.fighters.player.hand.length} techniques remain</span>
          </div>
          <div className="handGrid battlePhase">
            {state.fighters.player.hand.map((id) =>
              renderCard(id, selectedBeatCard === id, () => {
                setSelectedBeatCard(id);
              })
            )}
          </div>
          <button className="primaryButton revealButton" disabled={!selectedBeatCard} onClick={onResolveBeat}>
            Reveal Simultaneously
          </button>

          <details className="combatLog" open>
            <summary>Battle Transcript</summary>
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
        <section className="panel endPanel">
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
