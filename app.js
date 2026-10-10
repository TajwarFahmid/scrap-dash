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
  refreshLobby();
  clearInterval(lobbyPoll);
  lobbyPoll = setInterval(refreshLobby, 800);
}
async function refreshLobby() {
  if (!lobby) return;
  try {
    const state = await request(`/api/rooms/${lobby.code}?playerId=${encodeURIComponent(lobby.playerId)}`);
    document.querySelector('#lobbyPlayers').innerHTML = state.players.map((p, i) => `<div class="lobby-player"><i style="background:${p.color}"></i>${escapeHtml(p.name)}<span>${p.id === state.hostId ? 'HOST' : `PLAYER ${i+1}`}</span></div>`).join('');
    const start = document.querySelector('#startRoom');
    start.disabled = !lobby.host || state.players.length < 2;
    start.textContent = lobby.host ? (state.players.length < 2 ? 'Waiting for 1 more player' : `Start match · ${state.players.length} players`) : 'Waiting for the host to start';
    document.querySelector('#lobbyStatus').textContent = state.players.length < 2 ? 'Waiting for another scavenger to join…' : `${state.players.length} scavengers ready. The host can start the match.`;
    if (state.phase === 'playing') launchNetworkGame();
  } catch (error) {
    clearInterval(lobbyPoll);
    announce(error.message);
  }
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function launchNetworkGame() {
  if (!lobby) return;
  clearInterval(lobbyPoll);
  hideModal();
  document.querySelector('#roomForm').hidden = false;
  document.querySelector('#roomLobby').hidden = true;
  window.startOnlineScrapDash(lobby.code, lobby.playerId);
}
window.clearOnlineLobby = () => {
  lobby = null;
  clearInterval(lobbyPoll);
  document.querySelector('#roomForm').hidden = false;
  document.querySelector('#roomLobby').hidden = true;
  document.querySelector('#modalTitle').textContent = 'Pick your pit stop.';
  document.querySelector('.modal>p').textContent = 'Join a crew with a room code, or make your own yard.';
};

document.querySelector('#openJoin').addEventListener('click', showModal);
document.querySelector('#quickPlay').addEventListener('click', async () => {
  if (lobby) {
    try { await request(`/api/rooms/${lobby.code}/leave?playerId=${encodeURIComponent(lobby.playerId)}`, 'POST', {}); } catch {}
    lobby = null; clearInterval(lobbyPoll);
  }
  window.startScrapDash();
});
document.querySelector('#closeModal').addEventListener('click', hideModal);
modal.addEventListener('click', event => { if (event.target === modal) hideModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') hideModal(); });
playerNameInput.addEventListener('change', playerName);
document.querySelector('#roomCode').addEventListener('input', event => { event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
document.querySelector('#joinRoom').addEventListener('click', async () => {
  const code = document.querySelector('#roomCode').value.trim();
  if (code.length < 4) { announce('Enter a room code with at least 4 characters.'); return; }
  try { const data = await request(`/api/rooms/${encodeURIComponent(code)}/join`, 'POST', {name:playerName()}); showLobby({...data,host:false}); }
  catch (error) { announce(error.message); }
});
document.querySelector('#createRoom').addEventListener('click', async () => {
  try { const data = await request('/api/rooms', 'POST', {name:playerName()}); showLobby({...data,host:true}); }
  catch { announce('Room creation needs the game server. Start it with “node server.js” and try again.'); }
});
document.querySelector('#copyCode').addEventListener('click', async () => {
  if (!lobby) return;
  try { await navigator.clipboard.writeText(lobby.code); announce('Room code copied.'); }
  catch { announce(`Share this room code: ${lobby.code}`); }
});
document.querySelector('#startRoom').addEventListener('click', async () => {
  if (!lobby?.host) return;
  try { await request(`/api/rooms/${lobby.code}/start?playerId=${encodeURIComponent(lobby.playerId)}`, 'POST', {}); await refreshLobby(); }
  catch (error) { announce(error.message); }
});
document.querySelector('#leaveRoom').addEventListener('click', async () => {
  if (!lobby) return;
  try { await request(`/api/rooms/${lobby.code}/leave?playerId=${encodeURIComponent(lobby.playerId)}`, 'POST', {}); } catch {}
  lobby = null; clearInterval(lobbyPoll);
  document.querySelector('#roomForm').hidden = false;
  document.querySelector('#roomLobby').hidden = true;
  document.querySelector('#modalTitle').textContent = 'Pick your pit stop.';
  document.querySelector('.modal>p').textContent = 'Join a crew with a room code, or make your own yard.';
});
