// eBay Partner Network (EPN) affiliate link helpers.
// Every outbound purchase click routes to the yard's live eBay listing wrapped
// with EPN tracking params — the commission is attributed via campid/customid,
// so no eBay API calls are needed at click time (API-terms compliant).

const EPN_MKRID = '711-53200-19255-0'; // eBay Partner Network (US)
const EPN_TOOL_ID = '10001'; // default EPN tool
const EPN_SITE_ID = '0'; // ebay.com (US)
const EPN_MKCID = '1'; // item campaign channel
const EPN_MKEVT = '1'; // custom link event

/**
 * Wrap a synced eBay item URL with EPN affiliate tracking parameters.
 * `customid` carries the yard slug so commissions can be reported per yard.
 * Falls back to the raw URL if it cannot be parsed.
 */
export function buildEpnUrl(rawEbayUrl: string, yardSlug: string): string {
  const campid = process.env.NEXT_PUBLIC_EPN_CAMP_ID;

  try {
    const url = new URL(rawEbayUrl);
    url.searchParams.set('mkcid', EPN_MKCID);
    url.searchParams.set('mkrid', EPN_MKRID);
    url.searchParams.set('siteid', EPN_SITE_ID);
    if (campid) url.searchParams.set('campid', campid);
    url.searchParams.set('customid', yardSlug);
    url.searchParams.set('toolid', EPN_TOOL_ID);
    url.searchParams.set('mkevt', EPN_MKEVT);
    return url.toString();
  } catch {
    return rawEbayUrl;
  }
}

/**
 * Deterministic listing slug: "[slugified-fixed-title]-[ebay-item-id]"
 * e.g. "2019-ford-f-150-headlight-assembly-fl3z13008ac-oem-123456789012"
 */
export function slugifyPart(fixedTitle: string, ebayItemId: string | number): string {
  const base = fixedTitle
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics (U+0300–U+036F)
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics -> dash
    .replace(/-{2,}/g, '-') // collapse dash runs
    .replace(/^-+|-+$/g, ''); // trim edge dashes

  return `${base}-${ebayItemId}`;
}

/** Pull the trailing eBay item id back out of a listing slug. */
export function extractEbayItemId(slug: string): string | null {
  const match = slug.match(/-(\d{6,})$/);
  return match ? match[1] : null;
}
