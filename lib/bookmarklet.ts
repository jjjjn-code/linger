// The "Send to Linger" bookmarklet.
//
// Why this exists: many shops (Zara, for one) answer server-side requests with
// a 403, so Linger's server can't read their pages. Your own browser, though,
// has already loaded the page fine. The bookmarklet runs inside that page,
// copies just the bits we need (<title>, <meta> tags, JSON-LD product data —
// a few KB, not the ~800KB page), and opens Linger with them in the URL
// *fragment*. Fragments are never sent to any server, and the payload is parsed
// in the browser by the same code the server route uses (lib/productParse.ts).
//
// Constraints for the code string below: ES5, no newlines, no '//' comments and
// NO literal '%' characters (javascript: URLs are percent-decoded before they
// run — encodeURIComponent is fine because it contains no literal '%') and no
// literal '#' (it can be parsed as a URL fragment and cut the script short), so
// the hash prefix is written as a \x23 escape inside the generated code.

export const CAPTURE_HASH_PREFIX = "#linger=";
const HASH_ESCAPED = CAPTURE_HASH_PREFIX.replace("#", "\\x23");

/** Soft cap on the encoded URL. Past this we drop the JSON-LD and send meta only. */
const MAX_URL_LENGTH = 150_000;

export function buildBookmarklet(origin: string): string {
  const base = origin.replace(/\/+$/, "");
  const code =
    "(function(){try{" +
    `var O=${JSON.stringify(base)},` +
    "q=function(s){return Array.prototype.map.call(document.querySelectorAll(s),function(e){return e.outerHTML}).join('')}," +
    "t='<title>'+document.title.replace(/</g,'')+'</title>'," +
    "m=q('meta[property],meta[name]')," +
    "j=q('script[type=\"application/ld+json\"]')," +
    `f=function(h){return O+'${HASH_ESCAPED}'+encodeURIComponent(JSON.stringify({u:location.href,h:h}))},` +
    "x=f(t+m+j);" +
    `if(x.length>${MAX_URL_LENGTH})x=f(t+m);` +
    "window.open(x,'_blank')||(location.href=x)" +
    "}catch(e){alert('Linger could not read this page.')}})();";
  return "javascript:" + code;
}
