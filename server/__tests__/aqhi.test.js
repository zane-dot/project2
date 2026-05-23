import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bandFor, parseAqhiXml } from '../lib/aqhi.js';

describe('aqhi/bandFor', () => {
  for (const [value, expected] of [
    [1, 'low'],
    [3, 'low'],
    [4, 'moderate'],
    [7, 'high'],
    [9, 'veryHigh'],
    [11, 'serious'],
  ]) {
    it(`maps ${value} → ${expected}`, () => {
      assert.equal(bandFor(value), expected);
    });
  }
});

describe('aqhi/parseAqhiXml', () => {
  const fixture = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>EPD AQHI</title>
    <lastBuildDate>Sun, 24 May 2026 03:30:00 +0800</lastBuildDate>
    <item>
      <title>Central/Western</title>
      <description><![CDATA[Central/Western - General Stations: 4 Moderate - Sun, 24 May 2026 03:30]]></description>
    </item>
    <item>
      <title>Eastern</title>
      <description><![CDATA[Eastern - General Stations: 5 Moderate - Sun, 24 May 2026 03:30]]></description>
    </item>
    <item>
      <title>Causeway Bay</title>
      <description><![CDATA[Causeway Bay - Roadside Stations: 7 High - Sun, 24 May 2026 03:30]]></description>
    </item>
    <item>
      <title>Mong Kok</title>
      <description><![CDATA[Mong Kok - Roadside Stations: 10+ Serious - Sun, 24 May 2026 03:30]]></description>
    </item>
    <item>
      <title>Bogus</title>
      <description><![CDATA[no value here]]></description>
    </item>
  </channel>
</rss>`;

  it('parses all station items and skips malformed ones', () => {
    const snap = parseAqhiXml(fixture);
    assert.equal(snap.stations.length, 4);
  });

  it('classifies roadside stations correctly', () => {
    const snap = parseAqhiXml(fixture);
    const causeway = snap.stations.find((s) => s.station === 'Causeway Bay');
    assert.equal(causeway.type, 'roadside');
    assert.equal(causeway.aqhi, 7);
    assert.equal(causeway.band, 'high');
  });

  it('treats "10+" as serious (11)', () => {
    const snap = parseAqhiXml(fixture);
    const mongkok = snap.stations.find((s) => s.station === 'Mong Kok');
    assert.equal(mongkok.aqhi, 11);
    assert.equal(mongkok.band, 'serious');
  });
});
