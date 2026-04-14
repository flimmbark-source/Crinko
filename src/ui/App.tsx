import { useMemo, useRef, useState } from 'react';
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

const termGlossary: Array<{ term: string; detail: string }> = [
  { term: 'Flow', detail: 'A momentum meter from 0 to 3. Reveal higher ranks in sequence to build it.' },
  { term: 'Armed', detail: 'A delayed effect set by an Arm card. It triggers at end of a later beat.' },
  { term: 'Initiative', detail: 'Wins speed ties. If no one deals damage in a beat, initiative swaps.' },
  { term: 'Rank', detail: 'Card rank (1, 2, 3, or *). Higher effective rank helps build Flow.' },
  { term: 'Speed', detail: 'Lower speed acts first in a beat.' },
  { term: 'Hit', detail: 'Which range this card can strike at: Near, Mid, Far, or Mid/Far.' },
  { term: 'Close / Open', detail: 'Move toward the enemy (Close) or away from the enemy (Open).' },
  { term: 'Cash Out', detail: 'Consumes all current Flow for a stronger effect.' },
  { term: 'Bridge', detail: 'Rank * can count as any rank for Flow sequencing.' },
  { term: 'Break', detail: 'Reduces enemy Flow by the shown amount.' },
  { term: 'Core', detail: 'No special keyword effect. Uses only base stats and hit rules.' }
];

const termLookup = new Map(termGlossary.map((entry) => [entry.term, entry.detail]));

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

function keywordExplanation(card: CardDefinition): string {
  if (card.rank === '*') return termLookup.get('Bridge') ?? '';
  if (card.cashOutFlow) return termLookup.get('Cash Out') ?? '';
  if (card.reduceEnemyFlow) return `Break ${card.reduceEnemyFlow}: Reduce enemy Flow by ${card.reduceEnemyFlow}.`;
  if (card.flowDamageBonus) return 'Flow +1: Deals +1 damage if your Flow is 1 or more.';
  if (card.gainInitiativeOnReveal) return 'Tempo: Gain initiative as soon as this card is revealed.';
  if (card.arm) return `Arm ${card.arm.triggerBeatOffset}: Sets an armed effect to trigger in ${card.arm.triggerBeatOffset} beat(s).`;
  return termLookup.get('Core') ?? '';
}

function moveLabel(move: number): string {
  if (move === 0) return 'Hold';
  if (move > 0) return `Open ${move}`;
  return `Close ${Math.abs(move)}`;
}

function flowDots(flow: number): string {
  const capped = Math.max(0, Math.min(3, flow));
  return '◆'.repeat(capped) + '◇'.repeat(3 - capped);
}

function firstActionLabel(playerCard: CardDefinition, aiCard: CardDefinition, playerHasInitiative: boolean): string {
  if (playerCard.speed === aiCard.speed) {
    return playerHasInitiative ? 'You act first (initiative tie-break).' : 'Rival acts first (initiative tie-break).';
  }

  return playerCard.speed < aiCard.speed ? 'You act first (lower speed).' : 'Rival acts first (lower speed).';
}

export function App() {
  const [state, setState] = useState<DuelState>(() => initDuel(Date.now()));
  const [selectedKeep, setSelectedKeep] = useState<string[]>([]);
  const [selectedBeatCard, setSelectedBeatCard] = useState<string | null>(null);
  const [postReward, setPostReward] = useState<string | null>(null);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [focusTerm, setFocusTerm] = useState<string | null>(null);
  const longPressTimer = useRef<number | null>(null);

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

  const clashSummary = useMemo(() => {
    if (!lastCards) return 'Cards are hidden until reveal.';
    return firstActionLabel(lastCards.player, lastCards.ai, state.fighters.player.initiative);
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
    setFocusedCardId(null);
    setHelpOpen(false);
    setFocusTerm(null);
  };

  const pickKeep = (cardId: string) => {
    setSelectedKeep((prev) => {
      if (prev.includes(cardId)) return prev.filter((c) => c !== cardId);
      if (prev.length >= 3) return prev;
      return [...prev, cardId];
    });
  };

  const openHelp = (term?: string) => {
    setHelpOpen(true);
    setFocusTerm(term ?? null);
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
            <span className="duelistSchool">{school}</span>
          </div>

          <div className="hpRail" role="img" aria-label={`${id} hp ${fighter.hp} out of 20`}>
            <div className="hpNow" style={{ width: `${hpPct}%` }} />
            <span>HP {fighter.hp}/20</span>
          </div>

          <div className="duelistCompact">
            {fighter.flow > 0 && (
              <button className="miniInfoChip" onClick={() => openHelp('Flow')} title="Flow explanation">
                {flowDots(fighter.flow)}
              </button>
            )}
            {activeArm && (
              <button className="miniInfoChip armChip" onClick={() => openHelp('Armed')} title="Armed explanation">
                ⌛ Armed
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  const onCardPointerDown = (cardId: string) => {
    longPressTimer.current = window.setTimeout(() => {
      setFocusedCardId(cardId);
      longPressTimer.current = null;
    }, 450);
  };

  const onCardPointerUp = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const renderCard = (cardId: string, selected: boolean, onSelect: () => void) => {
    const card = getCard(cardId);
    const leadTag = card.tags[0];

    return (
      <button
        className={`techCard tag${leadTag} ${selected ? 'selected' : ''}`}
        key={cardId}
        onClick={onSelect}
        onPointerDown={() => onCardPointerDown(cardId)}
        onPointerUp={onCardPointerUp}
        onPointerLeave={onCardPointerUp}
      >
        <div className="cardTopBar">
          <strong>{card.name}</strong>
          <button
            className="cardInfoButton"
            onClick={(e) => {
              e.stopPropagation();
              setFocusedCardId(cardId);
            }}
            title="Open card details"
          >
            ?
          </button>
        </div>

        <div className="cardIdentityRow">
          <span className="tagBadge">
            {tagMeta[leadTag].icon} {tagMeta[leadTag].short}
          </span>
          <span className="pillButton">
            ⚡ {card.speed}
          </span>
          <span className="pillButton">
            R{card.rank}
          </span>
        </div>

        <div className="motifArea" aria-hidden>
          <span>{motifForCard(card)}</span>
        </div>

        <div className="statRow">
          <span>⚔ {card.damage}</span>
          <span>🛡 {card.guard}</span>
          <span>{moveLabel(card.move)}</span>
        </div>

        <div className="metaRow">
          <span>◎ {hitLabel(card.hit)}</span>
          <span>{keywordLabel(card)}</span>
        </div>
      </button>
    );
  };

  const currentHand = phase === 'keep' ? state.fighters.player.draw : state.fighters.player.hand;
  const selectedCount = phase === 'keep' ? selectedKeep.length : selectedBeatCard ? 1 : 0;
  const focusedCard = focusedCardId ? getCard(focusedCardId) : null;

  return (
    <main className="app">
      <section className="duelStage">
        <div className="stageTopline">
          <span className="stageChip stageStatus">{duelStatus(state)}</span>
          <button className="helpButton" onClick={() => setHelpOpen((prev) => !prev)}>
            ? Help
          </button>
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

        <div className="sceneField">
          {actorStatus('ai')}

          <div className="rangeTotem" role="status" aria-live="polite">
            <button className="miniInfoChip" onClick={() => openHelp('Hit')}>
              Range
            </button>
            <div className="rangeReadout">
              {rangeBands.map((band) => (
                <span key={band} className={`stone ${state.range === band ? 'active' : ''}`}>
                  {band.slice(0, 1)}
                </span>
              ))}
            </div>
            <strong>{state.range}</strong>
            <small>Beat {state.beat}/3</small>
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
                  {tagMeta[lastCards.ai.tags[0]].icon} · ⚡{lastCards.ai.speed} · R{lastCards.ai.rank}
                </small>
              </>
            ) : (
              <div className="facedown" aria-label="Rival card hidden" />
            )}
          </article>

          <div className="clashPulse">
            <span>{clashSummary}</span>
            {latestLog && latestLog.events[0] && <small>{latestLog.events[0]}</small>}
          </div>

          <article className="revealPane player">
            {lastCards ? (
              <>
                <strong>{lastCards.player.name}</strong>
                <small>
                  {tagMeta[lastCards.player.tags[0]].icon} · ⚡{lastCards.player.speed} · R{lastCards.player.rank}
                </small>
              </>
            ) : (
              <div className="facedown" aria-label="Your card hidden" />
            )}
          </article>
        </div>
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

      {focusedCard && (
        <section className="overlayBackdrop" onClick={() => setFocusedCardId(null)} role="dialog" aria-modal="true">
          <article className="cardDetailPanel" onClick={(e) => e.stopPropagation()}>
            <header>
              <h3>{focusedCard.name}</h3>
              <button onClick={() => setFocusedCardId(null)}>Close</button>
            </header>

            <p className="detailMeta">
              {tagMeta[focusedCard.tags[0]].icon} {focusedCard.tags.join(' / ')} · ⚡{focusedCard.speed} · Rank {focusedCard.rank}
            </p>

            <div className="detailGrid">
              <p>
                <strong>Effect:</strong> Deal {focusedCard.damage} damage, gain {focusedCard.guard} guard, and {moveLabel(focusedCard.move).toLowerCase()}.
              </p>
              <p>
                <strong>Hit:</strong> This card can hit at <em>{hitLabel(focusedCard.hit)}</em> range.
              </p>
              <p>
                <strong>Keyword:</strong> {keywordLabel(focusedCard)} — {keywordExplanation(focusedCard)}
              </p>
              {(focusedCard.cashOutFlow || focusedCard.flowDamageBonus || focusedCard.reduceEnemyFlow || focusedCard.arm) && (
                <p>
                  <strong>Flow / Armed:</strong> This card has flow-related timing. Use <em>? Help</em> for exact term definitions.
                </p>
              )}
            </div>
          </article>
        </section>
      )}

      {helpOpen && (
        <section className="overlayBackdrop" onClick={() => setHelpOpen(false)} role="dialog" aria-modal="true">
          <article className="helpPanel" onClick={(e) => e.stopPropagation()}>
            <header>
              <h3>Combat Glossary</h3>
              <button onClick={() => setHelpOpen(false)}>Close</button>
            </header>
            <ul>
              {termGlossary.map((entry) => (
                <li key={entry.term} className={focusTerm === entry.term ? 'focused' : ''}>
                  <strong>{entry.term}</strong>
                  <p>{entry.detail}</p>
                </li>
              ))}
            </ul>
          </article>
        </section>
      )}
    </main>
  );
}
