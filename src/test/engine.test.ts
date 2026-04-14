import { describe, expect, it } from 'vitest';
import { initDuel, resolveBeat } from '../game/engine/core';

function setup() {
  const state = initDuel(123);
  state.fighters.player.hand = [];
  state.fighters.ai.hand = [];
  return state;
}

describe('engine combat rules', () => {
  it('resolves lower speed first', () => {
    const s = setup();
    s.range = 'Mid';
    s.fighters.player.hand = ['wind_step'];
    s.fighters.ai.hand = ['stone_crush'];
    resolveBeat(s, 'wind_step', 'stone_crush');
    expect(s.logs[0].ordering[0]).toBe('player');
  });

  it('uses initiative as tiebreak for speed ties', () => {
    const s = setup();
    s.fighters.player.initiative = false;
    s.fighters.ai.initiative = true;
    s.fighters.player.hand = ['strike_near_1'];
    s.fighters.ai.hand = ['strike_near_1'];
    s.range = 'Near';
    resolveBeat(s, 'strike_near_1', 'strike_near_1');
    expect(s.logs[0].ordering[0]).toBe('ai');
  });

  it('updates shared range from movement', () => {
    const s = setup();
    s.range = 'Mid';
    s.fighters.player.hand = ['close_step_2'];
    s.fighters.ai.hand = ['guard_basic_1'];
    resolveBeat(s, 'close_step_2', 'guard_basic_1');
    expect(s.range).toBe('Near');
  });

  it('validates hit range after movement', () => {
    const s = setup();
    s.range = 'Mid';
    s.fighters.player.hand = ['open_step_1'];
    s.fighters.ai.hand = ['strike_near_1'];
    resolveBeat(s, 'open_step_1', 'strike_near_1');
    expect(s.fighters.player.hp).toBe(20);
  });

  it('guard only lasts current beat', () => {
    const s = setup();
    s.range = 'Near';
    s.fighters.player.hand = ['guard_basic_1'];
    s.fighters.ai.hand = ['strike_near_1'];
    resolveBeat(s, 'guard_basic_1', 'strike_near_1');
    const afterGuardBeatHp = s.fighters.player.hp;
    s.fighters.player.hand = ['any_cut_2'];
    s.fighters.ai.hand = ['strike_near_1'];
    resolveBeat(s, 'any_cut_2', 'strike_near_1');
    expect(s.fighters.player.hp).toBeLessThan(afterGuardBeatHp);
  });

  it('triggers armed effects at end of beat', () => {
    const s = setup();
    s.range = 'Mid';
    s.fighters.player.hand = ['wind_storm'];
    s.fighters.ai.hand = ['bridge_guard'];
    resolveBeat(s, 'wind_storm', 'bridge_guard');
    const hpAfterArm = s.fighters.ai.hp;
    s.fighters.player.hand = ['bridge_guard'];
    s.fighters.ai.hand = ['bridge_guard'];
    resolveBeat(s, 'bridge_guard', 'bridge_guard');
    expect(s.fighters.ai.hp).toBeLessThan(hpAfterArm);
  });

  it('increases flow on ascending ranks', () => {
    const s = setup();
    s.range = 'Near';
    s.fighters.player.hand = ['strike_near_1'];
    s.fighters.ai.hand = ['bridge_guard'];
    resolveBeat(s, 'strike_near_1', 'bridge_guard');
    s.fighters.player.hand = ['any_cut_2'];
    s.fighters.ai.hand = ['bridge_guard'];
    resolveBeat(s, 'any_cut_2', 'bridge_guard');
    expect(s.fighters.player.flow).toBe(1);
  });

  it('lets bridge rank preserve flexible flow line', () => {
    const s = setup();
    s.range = 'Near';
    s.fighters.player.hand = ['strike_near_1'];
    s.fighters.ai.hand = ['bridge_guard'];
    resolveBeat(s, 'strike_near_1', 'bridge_guard');
    s.fighters.player.hand = ['bridge_guard'];
    s.fighters.ai.hand = ['bridge_guard'];
    resolveBeat(s, 'bridge_guard', 'bridge_guard');
    s.fighters.player.hand = ['any_cut_2'];
    s.fighters.ai.hand = ['bridge_guard'];
    resolveBeat(s, 'any_cut_2', 'bridge_guard');
    expect(s.fighters.player.flow).toBeGreaterThanOrEqual(1);
  });

  it('supports flow reduction effects', () => {
    const s = setup();
    s.fighters.player.flow = 3;
    s.range = 'Mid';
    s.fighters.player.hand = ['bridge_guard'];
    s.fighters.ai.hand = ['disrupt_flow'];
    resolveBeat(s, 'bridge_guard', 'disrupt_flow');
    expect(s.fighters.player.flow).toBeLessThan(3);
  });

  it('cleans exchange and redraws after beat 3', () => {
    const s = setup();
    s.range = 'Near';
    s.fighters.player.hand = ['bridge_guard'];
    s.fighters.ai.hand = ['bridge_guard'];
    resolveBeat(s, 'bridge_guard', 'bridge_guard');
    s.fighters.player.hand = ['bridge_feint'];
    s.fighters.ai.hand = ['bridge_feint'];
    resolveBeat(s, 'bridge_feint', 'bridge_feint');
    s.fighters.player.hand = ['guard_basic_1'];
    s.fighters.ai.hand = ['guard_basic_1'];
    resolveBeat(s, 'guard_basic_1', 'guard_basic_1');
    expect(s.exchange).toBe(2);
    expect(s.fighters.player.draw.length).toBe(5);
  });

  it('handles KO and double KO', () => {
    const s = setup();
    s.fighters.player.hp = 1;
    s.fighters.ai.hp = 1;
    s.range = 'Near';
    s.fighters.player.hand = ['near_burst'];
    s.fighters.ai.hand = ['near_burst'];
    resolveBeat(s, 'near_burst', 'near_burst');
    expect(s.winner).toBe('draw');
  });
});
