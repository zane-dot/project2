import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapColor, parseMtrXml } from '../lib/mtr.js';

describe('mtr/mapColor', () => {
  it('maps colors to internal states', () => {
    assert.equal(mapColor('green'), 'normal');
    assert.equal(mapColor('grey'), 'normal');
    assert.equal(mapColor('yellow'), 'delayed');
    assert.equal(mapColor('red'), 'disrupted');
    assert.equal(mapColor(undefined), 'normal');
  });
});

describe('mtr/parseMtrXml', () => {
  const fixture = `<ryg_status>
    <lastBuildDate>Sun, 24 May 2026 01:29:01 GMT</lastBuildDate>
    <line><line_code>ISL</line_code><url_en></url_en><status>green</status></line>
    <line><line_code>TWL</line_code><url_en>https://mtr/x</url_en><status>yellow</status></line>
    <line><line_code>KTL</line_code><url_en>https://mtr/y</url_en><status>red</status></line>
  </ryg_status>`;

  it('always returns the full set of known lines', () => {
    const snap = parseMtrXml(fixture);
    assert.ok(snap.lines.length >= 10);
    assert.ok(snap.lines.every((l) => typeof l.code === 'string'));
  });

  it('maps yellow → delayed and red → disrupted', () => {
    const snap = parseMtrXml(fixture);
    const isl = snap.lines.find((l) => l.code === 'ISL');
    const twl = snap.lines.find((l) => l.code === 'TWL');
    const ktl = snap.lines.find((l) => l.code === 'KTL');
    assert.equal(isl.state, 'normal');
    assert.equal(twl.state, 'delayed');
    assert.equal(ktl.state, 'disrupted');
    assert.match(ktl.message, /mtr\/y/);
  });

  it('parses lastBuildDate into ISO updatedAt', () => {
    const snap = parseMtrXml(fixture);
    assert.equal(snap.updatedAt, '2026-05-24T01:29:01.000Z');
  });
});
