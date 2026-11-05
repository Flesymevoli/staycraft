// Exercise the date form rather than the removed 7/28-day shortcut buttons.
const starts=new WeakMap();
module.exports=async function selectPeriod(page,days){
 const form=page.locator('.booking-period-form'),fields=form.locator('input[type="date"]');
 if(!starts.has(page))starts.set(page,await fields.first().inputValue());
 const start=starts.get(page);await fields.first().fill(start);
 const end=new Date(start+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+days-1);
 await fields.nth(1).fill(end.toISOString().slice(0,10));
 const response=page.waitForResponse(r=>r.url().includes('/api/workspace/metrics?start=')&&r.status()===200);
 await form.locator('button[type="submit"]').click();await response;
};
