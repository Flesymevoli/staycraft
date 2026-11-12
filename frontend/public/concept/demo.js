(() => {
  const draftKey = 'staycraft:concept:draft:v1';
  const editor = document.getElementById('promoDraftBox');
  try { const draft = localStorage.getItem(draftKey); if (draft !== null && editor) editor.value = draft; } catch {}
  window.savePromoDraft = () => {
    try {
      localStorage.setItem(draftKey, editor.value);
      document.getElementById('saveStatusBadge').textContent = lang === 'zh' ? '已保存' : 'Saved';
      showToast('已保存到此浏览器', 'Saved in this browser');
    } catch { showToast('浏览器未能保存，请复制文案', 'Could not save; copy your draft instead'); }
  };
  window.copyPromoText = async () => {
    try { await navigator.clipboard.writeText(editor.value); showToast('文案已复制', 'Copy ready'); }
    catch { editor.focus(); editor.select(); showToast('已选中文案，可按 Ctrl+C 复制', 'Text selected; press Ctrl+C to copy'); }
  };
  editor?.addEventListener('input', () => { document.getElementById('saveStatusBadge').textContent = lang === 'zh' ? '未保存' : 'Unsaved'; });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeDrawer();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault(); document.getElementById('quickSearchInput').focus();
    }
  });
  const baseSwitch = window.switchView;
  window.switchView = view => {
    baseSwitch(view);
    document.querySelectorAll('.concept-mobile-nav button').forEach(button => {
      button.setAttribute('aria-current', button.dataset.sec === view ? 'page' : 'false');
    });
  };
  const nav = document.createElement('nav');
  nav.className = 'concept-mobile-nav'; nav.setAttribute('aria-label', '页面导航');
  document.querySelectorAll('#mainNav .nav-btn').forEach(original => {
    const button = original.cloneNode(true);
    button.classList.remove('is-active'); button.querySelector('.nav-count')?.remove();
    button.setAttribute('aria-current', button.dataset.sec === 'workbench' ? 'page' : 'false');
    nav.append(button);
  });
  document.body.append(nav);
  const style = document.createElement('style');
  style.textContent = `.concept-mobile-nav{display:none}@media(max-width:760px){.concept-mobile-nav{display:flex;position:fixed;bottom:12px;left:12px;right:12px;background:#fffffff5;border:1px solid #efedf3;border-radius:24px;padding:6px;z-index:50;box-shadow:0 4px 20px #30303908}.concept-mobile-nav button{display:flex;flex:1;min-width:0;flex-direction:column;gap:5px;justify-content:center;padding:8px 2px;font-size:10px}.concept-mobile-nav button[aria-current=page]{background:#ebe7f8;color:#6554c7}.concept-mobile-nav svg{width:18px;height:18px}.page-body{padding-bottom:100px}.topbar-right{gap:6px}.section-header{flex-wrap:wrap}.clean-row{min-width:0}.row-meta{min-width:0;overflow-wrap:anywhere}.drawer{max-width:100%}}`;
  document.head.append(style);
})();
