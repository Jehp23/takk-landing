'use strict';

// Local identity preparation. The current game opens independently of this adapter.
const playerStore = {
  key: 'takk.player.v1',
  read() {
    try {
      const player = JSON.parse(localStorage.getItem(this.key));
      return player && typeof player.nickname === 'string' && colors[player.color] ? player : null;
    } catch { return null; }
  },
  write(player) {
    try { localStorage.setItem(this.key, JSON.stringify(player)); return true; }
    catch { return false; }
  }
};
const colors = { lime: '#bdff00', violet: '#a374ff', cyan: '#00eaff', pink: '#ff00b8' };
const dialog = document.querySelector('#entry-dialog');
const form = document.querySelector('#entry-form');
const nickname = document.querySelector('#nickname');
const error = document.querySelector('#nickname-error');
const ready = document.querySelector('#player-ready');
let returnFocus = null;

function editPlayer() {
  ready.hidden = true;
  form.hidden = false;
  error.textContent = '';
  nickname.setCustomValidity('');
  nickname.removeAttribute('aria-invalid');
  nickname.focus();
}

function openEntry(event) {
  returnFocus = event.currentTarget;
  const player = playerStore.read();
  if (player) {
    nickname.value = player.nickname;
    form.elements.color.value = player.color;
  }
  ready.hidden = true;
  form.hidden = false;
  error.textContent = '';
  nickname.setCustomValidity('');
  nickname.removeAttribute('aria-invalid');
  dialog.showModal();
  nickname.focus();
}

function validateNickname() {
  const value = nickname.value.trim();
  const valid = /^[\p{L}\p{N}_ -]{2,20}$/u.test(value);
  nickname.setCustomValidity(valid ? '' : 'Use 2–20 characters: letters, numbers, spaces, _ or -.');
  if (valid) nickname.removeAttribute('aria-invalid');
  else nickname.setAttribute('aria-invalid', 'true');
  error.textContent = valid ? '' : nickname.validationMessage;
  return valid;
}

document.querySelectorAll('[data-play]').forEach(button => button.addEventListener('click', openEntry));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => returnFocus?.focus());
dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
});
nickname.addEventListener('input', () => {
  nickname.setCustomValidity('');
  nickname.removeAttribute('aria-invalid');
  error.textContent = '';
});
nickname.addEventListener('invalid', () => {
  nickname.setAttribute('aria-invalid', 'true');
  error.textContent = 'Use 2–20 characters: letters, numbers, spaces, _ or -.';
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!validateNickname()) { nickname.focus(); return; }
  const player = { nickname: nickname.value.trim(), color: form.elements.color.value };
  const persisted = playerStore.write(player);
  document.querySelector('#ready-name').textContent = player.nickname;
  ready.style.setProperty('--player-color', colors[player.color]);
  ready.querySelector('.ready-notice p').textContent = persisted
    ? 'Your nickname and color are saved on this device. The game currently assigns its own player identity.'
    : 'This browser could not save your nickname and color. You can still open the game, which assigns its own player identity.';
  form.hidden = true;
  ready.hidden = false;
  document.querySelector('#open-game').focus();
});
document.querySelector('#edit-player').addEventListener('click', editPlayer);
