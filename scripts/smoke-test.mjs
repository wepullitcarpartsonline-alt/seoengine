// Runtime smoke test for the pure helpers (no DB required).
// Run: node scripts/smoke-test.mjs
process.env.NEXT_PUBLIC_EPN_CAMP_ID = '5339123456';

const { buildEpnUrl, slugifyPart, extractEbayItemId } = await import('../lib/ebay-epn.ts');
const { normalizePartNumber, formatPrice, conditionToSchemaOrg, parseImages } = await import(
  '../lib/format.ts'
);

let failures = 0;
const check = (name, actual, expected) => {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`      expected: ${expected}\n      actual:   ${actual}`);
};

// --- EPN URL builder ---
const epn = buildEpnUrl('https://www.ebay.com/itm/123456789012?hash=item123&_trksid=p2342', 'smiths-auto-salvage');
const u = new URL(epn);
check('epn keeps ebay origin+path', `${u.origin}${u.pathname}`, 'https://www.ebay.com/itm/123456789012');
check('epn mkcid=1', u.searchParams.get('mkcid'), '1');
check('epn mkrid', u.searchParams.get('mkrid'), '711-53200-19255-0');
check('epn siteid=0', u.searchParams.get('siteid'), '0');
check('epn campid from env', u.searchParams.get('campid'), '5339123456');
check('epn customid = yard slug', u.searchParams.get('customid'), 'smiths-auto-salvage');
check('epn toolid=10001', u.searchParams.get('toolid'), '10001');
check('epn mkevt=1', u.searchParams.get('mkevt'), '1');
check('epn preserves existing params', u.searchParams.get('hash'), 'item123');
check('epn invalid URL falls back', buildEpnUrl('not-a-url', 'yard'), 'not-a-url');

// --- Slug generator ---
check(
  'slugifyPart format',
  slugifyPart('2019 Ford F-150 Headlight Assembly FL3Z-13008-AC OEM', '123456789012'),
  '2019-ford-f-150-headlight-assembly-fl3z-13008-ac-oem-123456789012',
);
check('slugifyPart strips punctuation', slugifyPart('A/C Compressor (New!)', '99'), 'a-c-compressor-new-99');
check('extractEbayItemId', extractEbayItemId('2019-ford-f-150-headlight-oem-123456789012'), '123456789012');
check('extractEbayItemId no id', extractEbayItemId('no-id-here'), null);

// --- Format helpers ---
check('normalizePartNumber', normalizePartNumber('fl3z 13008-ac'), 'FL3Z13008AC');
check('formatPrice number', formatPrice(1234.5), '$1,234.50');
check('formatPrice string (pg NUMERIC)', formatPrice('89.99'), '$89.99');
check('formatPrice null', formatPrice(null), '—');
check('condition Used', conditionToSchemaOrg('Used'), 'https://schema.org/UsedCondition');
check('condition New', conditionToSchemaOrg('New other (see details)'), 'https://schema.org/NewCondition');
check('condition Reman', conditionToSchemaOrg('Remanufactured'), 'https://schema.org/RefurbishedCondition');
check('condition For parts', conditionToSchemaOrg('For parts or not working'), 'https://schema.org/DamagedCondition');
check('parseImages strings', JSON.stringify(parseImages(['https://i.ebayimg.com/a.jpg'])), '["https://i.ebayimg.com/a.jpg"]');
check('parseImages objects', JSON.stringify(parseImages([{ url: 'https://i.ebayimg.com/b.jpg' }])), '["https://i.ebayimg.com/b.jpg"]');

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
