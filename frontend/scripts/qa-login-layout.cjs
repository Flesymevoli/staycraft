const {chromium}=require('./qa-browser.cjs');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch();
  try {
    const page=await browser.newPage();
    for(const width of [320,390,768]){
      await page.setViewportSize({width,height:844});
      await page.goto('http://127.0.0.1:3114/login');
      const login=page.getByRole('button',{name:/^登录$|^Sign in$/});
      const demo=page.getByRole('button',{name:/体验演示|Try StayCraft/});
      assert((await demo.boundingBox()).y>(await login.boundingBox()).y);
      await page.getByRole('button',{name:/还没有账号|New here/}).click();
      assert.equal(await page.locator('#password').getAttribute('autocomplete'),'new-password');
      assert.equal(await page.locator('#password').getAttribute('minlength'),'8');
      await page.locator('#email').fill('test@example.invalid');
      await page.locator('#password').fill('test-only-password');
      await page.getByRole('button',{name:/^注册$|^Create account$/}).click();
      await page.getByRole('alert').filter({hasText:/本地预览|local preview/}).waitFor();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      if(width===390)await page.screenshot({path:'qa-login-layout.png',fullPage:true});
    }
    await page.goto('http://127.0.0.1:3114/auth/callback');
    await page.getByRole('alert').filter({hasText:/确认链接|confirmation link/}).waitFor();
    await page.getByRole('button',{name:/体验演示|Try StayCraft/}).click();
    await page.waitForURL('**/app');
    console.log('PASS login/demo order, signup interaction, isolated signup feedback, invalid callback, demo login, 320/390/768 widths. No live signup/email.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
