import { useMemo, useState } from 'react';
import { chooseAiBeatCard, chooseAiKeep } from '../game/ai/opponent';
import { getCard, initDuel, keepCards, resolveBeat } from '../game/engine/core';
import type { CardDefinition, DuelState, PlayerId, RangeBand, Tag } from '../game/engine/types';

const rewardOptions = [
  { id: 'add', label: 'Add card: Center Cut' },
  { id: 'remove', label: 'Remove weakest card' },
  { id: 'upgrade', label: 'Upgrade one card (+1 dmg)' }
];

const rangeBands: RangeBand[] = ['Near', 'Mid', 'Far'];

const tagMeta: Record<Tag, { icon: string; short: string }> = {
  Attack: { icon: '⚔', short: 'ATK' },
  Defense: { icon: '🛡', short: 'DEF' },
  Trick: { icon: '✦', short: 'TRK' }
};

function labelWinner(state: DuelState): string {
  if (state.winner === 'draw') return 'Draw';
  if (state.winner === 'player') return 'Victory';
  if (state.winner === 'ai') return 'Defeat';
  return '';
}

function schoolFromPassive(passive: 'stone' | 'wind'): 'Stone' | 'Wind' {
  return passive === 'stone' ? 'Stone' : 'Wind';
}

function flowLabel(state: DuelState): string {
  if (state.winner) return labelWinner(state);
  if (state.fighters.player.hand.length === 0) return 'Choose three techniques to begin the exchange.';
  return `Exchange ${state.exchange} · Beat ${state.beat} / 3`;
}

function motifForCard(card: CardDefinition): string {
  if (card.tags.includes('Attack')) return '╱╲';
  if (card.tags.includes('Defense')) return '◈';
  return '↻';
}

function hitLabel(hit: CardDefinition['hit']): string {
  if (hit === 'MidOrFar') return 'Mid/Far';
  return hit;
}

function keywordLabel(card: CardDefinition): string {
  if (card.rank === '*') return 'Bridge';
  if (card.cashOutFlow) return 'Cash Out';
  if (card.reduceEnemyFlow) return `Break ${card.reduceEnemyFlow}`;
  if (card.flowDamageBonus) return 'Flow +1';
  if (card.gainInitiativeOnReveal) return 'Tempo';
  if (card.arm) return `Arm ${card.arm.triggerBeatOffset}`;
  return 'Core';
}

function moveLabel(move: number): string {
  if (move === 0) return '0';
  if (move > 0) return `Open +${move}`;
  return `Close ${Math.abs(move)}`;
}

export function App() {
  const [state, setState] = useState<DuelState>(() => initDuel(Date.now()));
  const [selectedKeep, setSelectedKeep] = useState<string[]>([]);
  const [selectedBeatCard, setSelectedBeatCard] = useState<string | null>(null);
  const [inspectedCard, setInspectedCard] = useState<string | null>(null);
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
      return state.fighters.player.initiative ? 'You resolve first (initiative tie-break)' : 'Rival resolves first (initiative tie-break)';
    }

    return lastCards.player.speed < lastCards.ai.speed ? 'You resolve first (lower speed)' : 'Rival resolves first (lower speed)';
  }, [lastCards, state.fighters.player.initiative]);

  const onStartExchange = () => {
    const aiKeep = chooseAiKeep(state);
    keepCards(state, selectedKeep, aiKeep);
    setState({ ...state });
    setSelectedBeatCard(null);
    setInspectedCard(null);
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
    setInspectedCard(null);
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
          <div className="hpRail" role="img" aria-label={`${id} hp ${fighter.hp} out of 20`}>
            <div className="hpNow" style={{ width: `${hpPct}%` }} />
            <span>{fighter.hp} / 20</span>
          </div>
          <div className="duelistChips">
            <span className={`hudChip ${fighter.initiative ? 'active' : ''}`}>⦿ Initiative</span>
            <span className="hudChip">◌ Flow {fighter.flow}</span>
            <span className={`hudChip ${fighter.armed ? 'active armed' : ''}`}>{fighter.armed ? `⌛ ${fighter.armed.name}` : '⌛ Arm —'}</span>
          </div>
        </div>
      </article>
    );
  };

  const renderCard = (cardId: string, selected: boolean, onClick: () => void) => {
    const card = getCard(cardId);
    const leadTag = card.tags[0];
    const isExpanded = inspectedCard === cardId;

    return (
      <button
        className={`techCard tag${leadTag} ${selected ? 'selected' : ''} ${isExpanded ? 'expanded' : ''}`}
        key={cardId}
        onClick={onClick}
        onMouseEnter={() => setInspectedCard(cardId)}
        onFocus={() => setInspectedCard(cardId)}
        onMouseLeave={() => setInspectedCard((prev) => (prev === cardId ? null : prev))}
      >
        <div className="cardTopBar">
          <div className="nameBlock">
            <span className="tagBadge">
              {tagMeta[leadTag].icon} {tagMeta[leadTag].short}
            </span>
            <strong>{card.name}</strong>
          </div>
          <div className="tempoBadges">
            <span>⚡{card.speed}</span>
            <span>R{card.rank}</span>
          </div>
        </div>

        <div className="motifArea" aria-hidden>
          <span>{motifForCard(card)}</span>
        </div>

        <div className="primaryEffectRow">
          <span>⚔ {card.damage}</span>
          <span>🛡 {card.guard}</span>
          <span>↔ {moveLabel(card.move)}</span>
        </div>

        <div className="cardBottomStrips">
          <span>◎ {hitLabel(card.hit)}</span>
          <span>✶ {keywordLabel(card)}</span>
        </div>

        {isExpanded && (
          <div className="expandedText">
            <p>Tags: {card.tags.join(' · ')}</p>
            {card.arm && <p>Armed: {card.arm.name}</p>}
          </div>
        )}
      </button>
    );
  };

  const currentHand = phase === 'keep' ? state.fighters.player.draw : state.fighters.player.hand;

  return (
    <main className="app">
      <section className="duelStage">
        <header className="stageTopline">
          <p>Stormlit Courtyard</p>
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
            <small>Beat {state.beat} / 3</small>
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
          <h3>Clash Lane</h3>
          <span>{latestLog ? `Resolved beat ${latestLog.beat}` : 'No revealed cards yet'}</span>
        </div>

        <div className="clashCore">
          <article className="revealPane enemy">
            <h4>Rival</h4>
            {lastCards ? (
              <>
                <strong>{lastCards.ai.name}</strong>
                <small>
                  {tagMeta[lastCards.ai.tags[0]].icon} · ⚡{lastCards.ai.speed} · R{lastCards.ai.rank}
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
            <h4>You</h4>
            {lastCards ? (
              <>
                <strong>{lastCards.player.name}</strong>
                <small>
                  {tagMeta[lastCards.player.tags[0]].icon} · ⚡{lastCards.player.speed} · R{lastCards.player.rank}
                </small>
              </>
            ) : (
              <small className="placeholder">Choose and reveal</small>
            )}
          </article>
        </div>

        {latestLog && (
          <ul className="eventRibbon">
            {latestLog.events.slice(0, 4).map((event, i) => (
              <li key={`${event}-${i}`}>{event}</li>
            ))}
          </ul>
        )}
      </section>

      {phase !== 'end' && (
        <section className="handZone">
          <div className="handHeader">
            <h2>{phase === 'keep' ? 'Choose 3 Techniques' : 'Hand of Techniques'}</h2>
            <span>{phase === 'keep' ? `${selectedKeep.length} / 3 prepared` : `Beat ${state.beat} · ${state.fighters.player.hand.length} left`}</span>
          </div>

          <div className="preparedRow">
            {phase === 'keep' ? (
              selectedKeep.length > 0 ? (
                selectedKeep.map((id) => <em key={id}>{getCard(id).name}</em>)
              ) : (
                <small>No techniques prepared.</small>
              )
            ) : selectedBeatCard ? (
              <em>{getCard(selectedBeatCard).name}</em>
            ) : (
              <small>Select one technique to reveal.</small>
            )}
          </div>

          <div className={`handRail ${phase}`}>{currentHand.map((id) => renderCard(id, phase === 'keep' ? selectedKeep.includes(id) : selectedBeatCard === id, () => (phase === 'keep' ? pickKeep(id) : setSelectedBeatCard(id))))}</div>

          <button className="primaryButton revealButton" disabled={phase === 'keep' ? selectedKeep.length !== 3 : !selectedBeatCard} onClick={phase === 'keep' ? onStartExchange : onResolveBeat}>
            {phase === 'keep' ? 'Lock Techniques' : 'Reveal Simultaneously'}
          </button>
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
