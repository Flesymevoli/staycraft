const { chromium } = require("C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const { pathToFileURL } = require("url");
const path = require("path");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  const remoteRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/^https?:/, (route) => {
    remoteRequests.push(route.request().url());
    return route.abort();
  });

  const file = path.resolve(__dirname, "../../deliverables/Homestay-AI-手机直接打开版.html");
  await page.goto(pathToFileURL(file).href);
  await page.getByRole("heading", { name: "Hi, Alex." }).waitFor();

  for (const label of ["Work", "Analysis", "Explore", "Mine", "Home"]) {
    await page.locator(".native-tabbar").getByText(label, { exact: true }).click();
    await page.waitForTimeout(100);
    const brokenImages = await page.locator("img").evaluateAll((images) =>
      images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.alt)
    );
    if (brokenImages.length) throw new Error(`Broken images on ${label}: ${brokenImages.join(", ")}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (overflow) throw new Error(`Horizontal overflow on ${label}`);
  }

  await page.locator(".native-language").click();
  await page.locator(".native-tabbar").getByText("探索", { exact: true }).click();
  await page.locator(".explore-stay-photo").first().scrollIntoViewIfNeeded();
  if (errors.length || remoteRequests.length) {
    throw new Error(JSON.stringify({ errors, remoteRequests }));
  }
  console.log("PASS: single file, five pages, Chinese switch, embedded images, no network requests, no overflow");
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
