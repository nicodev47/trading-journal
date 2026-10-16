import assert from 'node:assert/strict';
import test from 'node:test';
import { floorFor } from '../src/lib/propfirm/engine.ts';
import { FIRMS, getFirm, rulesForKind } from '../src/lib/propfirm/firms.ts';

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

test('ogni piano è completo: niente numeri da inserire a mano', () => {
  FIRMS.forEach(firm => {
    firm.ruleSets.forEach(ruleSet => {
      ruleSet.sizes.forEach(size => {
        assert.notEqual(size.rules.drawdown.amount, null, `${firm.name} ${ruleSet.name}`);

        if (!ruleSet.fundedOnly) {
          assert.notEqual(size.rules.profitTarget, null, `${firm.name} ${ruleSet.name}`);
        }
      });
    });
  });
});

test('non esiste più una firm con regole modificabili', () => {
  assert.equal(getFirm('custom'), undefined);
});

test('Lucid: il DLL del Flex è un’opzione, il drawdown si blocca a saldo iniziale + 100', () => {
  const lucid = getFirm('lucid')!;
  const off = lucid.ruleSets.find(set => set.id === 'flex')!.sizes[1].rules;
  const on = lucid.ruleSets.find(set => set.id === 'flex-dll')!.sizes[1].rules;

  assert.equal(off.dailyLossLimit, null);
  assert.equal(on.dailyLossLimit?.amount, 1200);
  assert.equal(on.dailyLossLimit?.effect, 'lock-day');
  assert.equal(off.drawdown.lockOffset, 100);
  assert.equal(floorFor(off, 50000, 60000), 50100);
});

test('Lucid Daily ha le quattro configurazioni e in funded è sempre intraday', () => {
  const daily = getFirm('lucid')!.ruleSets.filter(set => set.id.startsWith('daily-'));

  assert.equal(daily.length, 4);
  daily.forEach(set => {
    assert.equal(rulesForKind(set.sizes[0], 'funded').drawdown.type, 'intraday-trailing');
  });
});

test('i piani senza valutazione sono solo funded', () => {
  const direct = ['lucid', 'alpha'].map(id => getFirm(id)!.ruleSets.find(set => set.id === 'direct')!);
  const lightning = getFirm('tradeify')!.ruleSets.find(set => set.id === 'lightning')!;

  [...direct, lightning].forEach(set => {
    assert.equal(set.fundedOnly, true);
    assert.equal(set.sizes[0].rules.profitTarget, null);
  });
});
