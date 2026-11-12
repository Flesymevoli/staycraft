document.addEventListener('submit', event => {
  if (event.target?.id !== 'landing-trial') return;
  event.preventDefault(); event.stopImmediatePropagation(); location.assign('/try');
}, true);
document.addEventListener('click', event => {
  if (!event.target.closest('#landing-trial button, button[form="landing-trial"]')) return;
  event.preventDefault(); event.stopImmediatePropagation(); location.assign('/try');
}, true);
