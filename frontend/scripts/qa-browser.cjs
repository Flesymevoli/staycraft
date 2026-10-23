// Playwright is a pinned development dependency. An explicit module path can be
// supplied for an existing managed runtime, without machine-specific source paths.
module.exports=require(process.env.STAYCRAFT_PLAYWRIGHT_MODULE||'playwright');
