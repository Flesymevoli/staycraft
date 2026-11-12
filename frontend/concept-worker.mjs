import application from './.open-next/worker.js';
export * from './.open-next/worker.js';

const policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/try' || url.pathname === '/try/' || url.pathname.startsWith('/concept/')) {
      if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {status: 405, headers: {Allow: 'GET, HEAD'}});
      if (url.pathname === '/try' || url.pathname === '/try/') url.pathname = '/concept/';
      const asset = await env.ASSETS.fetch(new Request(url, request));
      const response = new Response(asset.body, asset);
      response.headers.set('Content-Security-Policy', policy);
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
      return response;
    }
    const response = await application.fetch(request, env, ctx);
    if (url.pathname === '/' && request.method === 'GET' && response.headers.get('Content-Type')?.includes('text/html')) {
      return new HTMLRewriter().on('head', {
        element(element) { element.append('<script src="/concept/entry.js"></script>', {html: true}); }
      }).transform(response);
    }
    return response;
  }
};
