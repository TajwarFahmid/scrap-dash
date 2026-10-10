const modal = document.querySelector('#roomModal');
const toast = document.querySelector('#toast');
let toastTimer, lobbyPoll, lobby = null;
const playerNameInput = document.querySelector('#playerName');
playerNameInput.value = localStorage.getItem('scrapDashName') || '';

function showModal() {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  if (lobby) refreshLobby();
  else setTimeout(() => document.querySelector('#roomCode').focus(), 120);
}
function hideModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}
function announce(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}
function playerName() {
  const name = playerNameInput.value.trim().slice(0, 18) || 'Junkyard Jess';
  localStorage.setItem('scrapDashName', name);
  return name;
}
async function request(url, method = 'GET', payload) {
  const response = await fetch(url, {method, headers:{'content-type':'application/json'}, body:payload ? JSON.stringify(payload) : undefined});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not connect to the room.');
  return data;
}
function showLobby(session) {
  lobby = session;
  document.querySelector('#roomForm').hidden = true;
  document.querySelector('#roomLobby').hidden = false;
  document.querySelector('#lobbyCode').textContent = session.code;
  document.querySelector('#modalTitle').textContent = session.host ? 'Your yard is open.' : 'You’re in the yard.';
  document.querySelector('.modal>p').textContent = 'Share the room code and wait for your crew to join.';
