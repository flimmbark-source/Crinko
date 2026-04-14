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

function duelStatus(state: DuelState): string {
  if (state.winner) return labelWinner(state);
  if (state.fighters.player.hand.length === 0) return `Exchange ${state.exchange} setup`;
  return `Exchange ${state.exchange}`;
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
  if (move > 0) return `+${move}`;
  return `-${Math.abs(move)}`;
}

function moveSummary(move: number): string {
  if (move === 0) return 'Hold';
  if (move > 0) return `Open ${move}`;
  return `Close ${Math.abs(move)}`;
}

function flowDots(flow: number): string {
  const capped = Math.max(0, Math.min(3, flow));
  return '◆'.repeat(capped) + '◇'.repeat(3 - capped);
}

function cardReminder(card: CardDefinition): string {
  return `${card.name} · ${tagMeta[card.tags[0]].short} · SPD ${card.speed} · R${card.rank} · DMG ${card.damage} · GRD ${card.guard} · Move ${moveSummary(card.move)} · Hit ${hitLabel(card.hit)} · ${keywordLabel(card)}`;
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
    if (!lastCards) return state.fighters.player.initiative ? 'You open tie' : 'Rival opens tie';
    if (lastCards.player.speed === lastCards.ai.speed) {
      return state.fighters.player.initiative ? 'You open tie' : 'Rival opens tie';
    }

    return lastCards.player.speed < lastCards.ai.speed ? 'You first' : 'Rival first';
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
    const hpPct = Math.max(0, (fighter.hp / 20) * 100);
    const school = schoolFromPassive(fighter.passive);
    const hasInitiative = fighter.initiative;
    const activeArm = fighter.armed;

    return (
      <article className={`duelist ${id === 'player' ? 'isPlayer' : 'isEnemy'} ${hasInitiative ? 'hasInitiative' : ''}`}>
        <div className="duelistFigure" aria-hidden>
          <div className="duelistHalo" />
          <div className="duelistBody">{school === 'Stone' ? '⛰' : '風'}</div>
          {hasInitiative && <span className="initiativeCrown">♛</span>}
        </div>
        <div className="duelistHud">
          <div className="duelistHead">
            <h2>{id === 'player' ? 'You' : 'Rival'}</h2>
            <span className="duelistSchool" aria-label={`School ${school}`}>
              {school === 'Stone' ? '⛰' : '風'}
            </span>
          </div>
          <div className="hpRail" role="img" aria-label={`${id} hp ${fighter.hp} out of 20`}>
            <div className="hpNow" style={{ width: `${hpPct}%` }} />
            <span>{fighter.hp} / 20</span>
          </div>
          <div className="duelistCompact">
            <span className={`flowGem ${fighter.flow > 0 ? 'active' : ''}`} title={`Flow ${fighter.flow} / 3`}>
              {flowDots(fighter.flow)}
              {fighter.flow > 0 && <em>{fighter.flow}</em>}
            </span>
            {activeArm && <span className="armChip">⌛ {activeArm.name}</span>}
          </div>
        </div>
      </article>
    );
  };

  const renderCard = (cardId: string, selected: boolean, onClick: () => void) => {
    const card = getCard(cardId);
    const leadTag = card.tags[0];

    return (
      <button
        className={`techCard tag${leadTag} ${selected ? 'selected' : ''}`}
        key={cardId}
        onClick={onClick}
        title={cardReminder(card)}
      >
        <div className="cardTopBar">
          <strong>{card.name}</strong>
          <div className="tempoBadges">
            <span>⚡{card.speed}</span>
            <span>R{card.rank}</span>
          </div>
        </div>

        <div className="cardTagRow">
          <span className="tagBadge">
            {tagMeta[leadTag].icon} {tagMeta[leadTag].short}
          </span>
        </div>

        <div className="motifArea" aria-hidden>
          <span>{motifForCard(card)}</span>
        </div>

        <div className="statRow">
          <span>⚔ {card.damage}</span>
          <span>🛡 {card.guard}</span>
          <span>↔ {moveLabel(card.move)}</span>
        </div>

        <div className="metaRow">
          <span>◎ {hitLabel(card.hit)}</span>
          <span>✶ {keywordLabel(card)}</span>
        </div>

        <div className="cardPeek">{cardReminder(card)}</div>
      </button>
    );
  };

  const currentHand = phase === 'keep' ? state.fighters.player.draw : state.fighters.player.hand;

  const selectedCount = phase === 'keep' ? selectedKeep.length : selectedBeatCard ? 1 : 0;

  return (
    <main className="app">
      <section className="duelStage">
        <div className="stageTopline">
          <span className="stageChip">Stormlit Courtyard</span>
          <span className="stageChip stageStatus">{duelStatus(state)}</span>
          <label className="fastResolveToggle">
            <input
              type="checkbox"
              checked={state.fastResolve}
              onChange={(e) => {
                state.fastResolve = e.target.checked;
                setState({ ...state });
              }}
            />
            Fast
          </label>
        </div>

        <div className="sceneField">
          {actorStatus('ai')}

          <div className="rangeTotem" role="status" aria-live="polite">
            <div className="rangeReadout">
              {rangeBands.map((band) => (
                <span key={band} className={`stone ${state.range === band ? 'active' : ''}`}>
                  {band.slice(0, 1)}
                </span>
              ))}
            </div>
            <strong>{state.range}</strong>
            <small>
              Beat {state.beat}/3
            </small>
          </div>

          {actorStatus('player')}
        </div>
      </section>

      <section className="clashLane" aria-live="polite">
        <div className="laneTitle">
          <h3>Clash</h3>
          <span>{latestLog ? `Beat ${latestLog.beat}` : `Beat ${state.beat}`}</span>
        </div>

        <div className="clashCore">
          <article className="revealPane enemy">
            {lastCards ? (
              <>
                <strong>{lastCards.ai.name}</strong>
                <small>
                  {tagMeta[lastCards.ai.tags[0]].icon} ⚡{lastCards.ai.speed} · R{lastCards.ai.rank}
                </small>
              </>
            ) : (
              <div className="facedown" aria-label="Rival card hidden" />
            )}
          </article>

          <div className="clashPulse">
            <span>{firstResolver}</span>
            {latestLog && <small>{latestLog.events.slice(0, 2).join(' · ')}</small>}
          </div>

          <article className="revealPane player">
            {lastCards ? (
              <>
                <strong>{lastCards.player.name}</strong>
                <small>
                  {tagMeta[lastCards.player.tags[0]].icon} ⚡{lastCards.player.speed} · R{lastCards.player.rank}
                </small>
              </>
            ) : (
              <div className="facedown" aria-label="Your card hidden" />
            )}
          </article>
        </div>

        {latestLog && (
          <ul className="eventRibbon">
            {latestLog.events.slice(0, 3).map((event, i) => (
              <li key={`${event}-${i}`}>{event}</li>
            ))}
          </ul>
        )}
      </section>

      {phase !== 'end' && (
        <section className="handZone">
          <div className="handHeader">
            <h2>{phase === 'keep' ? 'Keep 3' : 'Choose 1'}</h2>
            <span>{phase === 'keep' ? `${selectedCount}/3` : `${state.fighters.player.hand.length} cards`}</span>
          </div>

          <div className={`handRail ${phase}`}>
            {currentHand.map((id) =>
              renderCard(id, phase === 'keep' ? selectedKeep.includes(id) : selectedBeatCard === id, () =>
                phase === 'keep' ? pickKeep(id) : setSelectedBeatCard(id)
              )
            )}
          </div>

          <button
            className="primaryButton revealButton"
            disabled={phase === 'keep' ? selectedKeep.length !== 3 : !selectedBeatCard}
            onClick={phase === 'keep' ? onStartExchange : onResolveBeat}
          >
            {phase === 'keep' ? 'Lock In' : 'Reveal'}
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
