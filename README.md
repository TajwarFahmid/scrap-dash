# Scrap Dash

Scrap Dash is a browser game where players race to search the junkyard, carry three parts back to their own build station, and win two rounds. Create a room and share its six-character code to play with 2–8 people. Quick play is available against bot rivals.

## Run it locally

Install Node.js 20 or newer, open a terminal in this folder, then run:

```sh
node server.js
```

Open `http://localhost:3000`. Online rooms require this server; opening `index.html` directly only loads the page without multiplayer support.

## Controls

- Move with **WASD** or the arrow keys.
- Stand close to a scrap heap and press **E** to search.
- Carry one part at a time. Return to your station and press **E** to install it.
- Press **Space** near a rival to knock them back and stun them briefly.

The game server keeps rooms in memory, so active matches end when the server restarts. The game uses short polling over HTTP and has no third-party runtime dependencies.

## Deploy for a competition

The included `render.yaml` defines a single always-on Node web service. Connect this repository to Render and deploy the Blueprint. Use the public `onrender.com` URL to share the game. Keep the service on one instance because room state is held in that process's memory. Do not use a sleeping/free instance for a scheduled match: the service can spin down while idle, which clears rooms and delays the next player joining.

Room codes are temporary and only live while the server process is running. This prototype has no accounts, persistent leaderboard, moderation tools, or anti-cheat protection; it is ready for friendly competition and playtests, but a high-stakes public tournament should add those safeguards first.
