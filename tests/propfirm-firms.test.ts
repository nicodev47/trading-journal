import assert from 'node:assert/strict';
import test from 'node:test';
import { FIRMS, getFirm, isIncomplete, rulesForKind } from '../src/lib/propfirm/firms.ts';

test('ogni piano ha dimensioni valide e regole coerenti', () => {
  FIRMS.forEach(firm => {
    assert.ok(firm.ruleSets.length > 0, firm.name);

    firm.ruleSets.forEach(ruleSet => {
      assert.ok(ruleSet.note.length > 0);
      ruleSet.sizes.forEach(size => {
        assert.ok(size.size > 0);
        assert.ok(size.rules.payout.split > 0 && size.rules.payout.split <= 1);

        if (size.rules.drawdown.amount !== null) {
          assert.ok(size.rules.drawdown.amount < size.size);
        }
      });
    });
  });
});

test('Lucid Flex riporta i numeri del centro assistenza', () => {
  const flex = getFirm('lucid')!.ruleSets.find(set => set.id === 'flex')!;
  const by = Object.fromEntries(flex.sizes.map(size => [size.label, size.rules]));

  assert.equal(by['25K'].profitTarget, 1250);
  assert.equal(by['25K'].drawdown.amount, 1000);
  assert.equal(by['50K'].profitTarget, 3000);
  assert.equal(by['50K'].drawdown.amount, 2000);
  assert.equal(by['50K'].maxContracts, '4 Mini OR 40 Micros');
  assert.equal(by['100K'].profitTarget, 6000);
  assert.equal(by['100K'].drawdown.amount, 3000);
  assert.equal(by['150K'].profitTarget, 9000);
  assert.equal(by['150K'].drawdown.amount, 4500);
  assert.equal(by['50K'].dailyLossLimit, null);
  assert.equal(by['50K'].consistency?.maxDayShare, 0.5);
  assert.equal(by['50K'].payout.split, 0.9);
});

test('funded e live non hanno obiettivo di profitto', () => {
  const size = getFirm('topstep')!.ruleSets[0].sizes[0];

  assert.equal(rulesForKind(size, 'evaluation').profitTarget, 3000);
  assert.equal(rulesForKind(size, 'funded').profitTarget, null);
  assert.equal(rulesForKind(size, 'live').profitTarget, null);
});

test('i modelli non vengono condivisi tra conti', () => {
  const size = getFirm('apex')!.ruleSets[0].sizes[0];
  const copy = rulesForKind(size, 'evaluation');

  copy.profitTarget = 1;

  assert.equal(size.rules.profitTarget, 1500);
});

test('Take Profit Trader in funded usa il drawdown intraday', () => {
  const size = getFirm('tpt')!.ruleSets[0].sizes[1];

  assert.equal(rulesForKind(size, 'evaluation').drawdown.type, 'eod-trailing');
  assert.equal(rulesForKind(size, 'funded').drawdown.type, 'intraday-trailing');
});

test('i piani con dati mancanti risultano incompleti', () => {
  const tradeify = getFirm('tradeify')!.ruleSets[0].sizes[0];
  const mffu = getFirm('mffu')!.ruleSets[0].sizes[0];

  assert.equal(isIncomplete(tradeify.rules, 'evaluation'), true);
  assert.equal(isIncomplete(mffu.rules, 'evaluation'), true);
  assert.equal(isIncomplete(mffu.rules, 'funded'), false);
});
