// Configuration du jeu
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');

// Redimensionner le canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    minimapCanvas.width = 150;
    minimapCanvas.height = 150;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Variables du jeu
const TILE_SIZE = 40;
const MAZE_WIDTH = 40;  // Réduit de 80 à 40
const MAZE_HEIGHT = 30; // Réduit de 60 à 30
const VISION_RADIUS = 200;
const PLAYER_SIZE = 30;
const PLAYER_SPEED = 3;
const KILL_DISTANCE = 50;

let gameStarted = false;
let canMove = false;
let playerRole = 'innocent'; // 'innocent' ou 'murderer'
let playerName = localStorage.getItem('nomJoueur') || 'Joueur';
let playerCode = localStorage.getItem('monCodeAmi') || Math.floor(100 + Math.random() * 900).toString();

// Position du joueur
let player = {
    x: 200,
    y: 200,
    vx: 0,
    vy: 0,
    alive: true
};

// Labyrinthe (1 = mur, 0 = passage)
let maze = [];

// Autres joueurs
let otherPlayers = {};

// Joystick
let joystickActive = false;
let joystickAngle = 0;
let joystickPower = 0;

// Bonus système
let bonusActifs = {};
let vitesseMultiplicateur = 1;
let invisible = false;

// Charger les bonus depuis le localStorage
function chargerBonus() {
    const bonusBar = document.getElementById('bonus-bar');
    bonusBar.innerHTML = '';
    
    const bonus = [
        { key: 'potionInvisibilite3s', icon: '👻', name: 'Invisibilité 3s', duree: 3000 },
        { key: 'potionInvisibilite5s', icon: '👻', name: 'Invisibilité 5s', duree: 5000 },
        { key: 'potionInvisibilite7s', icon: '👻', name: 'Invisibilité 7s', duree: 7000 },
        { key: 'vitesse1_5x', icon: '⚡', name: 'Vitesse 1.5x', duree: 3000, mult: 1.5 },
        { key: 'vitesse2x', icon: '⚡', name: 'Vitesse 2x', duree: 3000, mult: 2 },
        { key: 'vitesse2_5x', icon: '⚡', name: 'Vitesse 2.5x', duree: 3000, mult: 2.5 },
        { key: 'carteDecouvreur', icon: '🗺️', name: 'Carte', duree: 0 }
    ];
    
    bonus.forEach(b => {
        const quantite = parseInt(localStorage.getItem(b.key)) || 0;
        if (quantite > 0) {
            const bonusItem = document.createElement('div');
            bonusItem.className = 'bonus-item';
            bonusItem.innerHTML = `
                <div class="bonus-icon">${b.icon}</div>
                <div class="bonus-name">${b.name}</div>
                <div class="bonus-quantity">x${quantite}</div>
            `;
            
            bonusItem.onclick = () => activerBonus(b.key, b.duree, b.mult || 1);
            bonusBar.appendChild(bonusItem);
        }
    });
}

// Activer un bonus
function activerBonus(key, duree, multiplicateur) {
    const quantite = parseInt(localStorage.getItem(key)) || 0;
    
    if (quantite <= 0 || bonusActifs[key]) {
        return; // Pas de bonus ou déjà actif
    }
    
    // Décrémenter la quantité
    localStorage.setItem(key, quantite - 1);
    
    // Activer l'effet
    if (key.startsWith('potionInvisibilite')) {
        invisible = true;
        bonusActifs[key] = true;
        
        setTimeout(() => {
            invisible = false;
            bonusActifs[key] = false;
            chargerBonus();
        }, duree);
    } else if (key.startsWith('vitesse')) {
        vitesseMultiplicateur = multiplicateur;
        bonusActifs[key] = true;
        
        setTimeout(() => {
            vitesseMultiplicateur = 1;
            bonusActifs[key] = false;
            chargerBonus();
        }, duree);
    } else if (key === 'carteDecouvreur') {
        // Révéler toute la carte (pas implémenté pour l'instant)
        alert('🗺️ Carte révélée !');
    }
    
    chargerBonus();
}

// Générer un labyrinthe simple
function generateMaze() {
    maze = [];
    for (let y = 0; y < MAZE_HEIGHT; y++) {
        maze[y] = [];
        for (let x = 0; x < MAZE_WIDTH; x++) {
            // Bordures
            if (x === 0 || y === 0 || x === MAZE_WIDTH - 1 || y === MAZE_HEIGHT - 1) {
                maze[y][x] = 1;
            }
            // Murs aléatoires (plus de passages)
            else if (Math.random() < 0.25) {
                maze[y][x] = 1;
            } else {
                maze[y][x] = 0;
            }
        }
    }
    
    // S'assurer qu'il y a des passages
    for (let y = 1; y < MAZE_HEIGHT - 1; y += 3) {
        for (let x = 1; x < MAZE_WIDTH - 1; x += 3) {
            maze[y][x] = 0;
            if (x + 1 < MAZE_WIDTH - 1) maze[y][x + 1] = 0;
            if (y + 1 < MAZE_HEIGHT - 1) maze[y + 1][x] = 0;
        }
    }
}

// Position de départ aléatoire valide
function getRandomPosition() {
    let x, y;
    do {
        x = Math.floor(Math.random() * (MAZE_WIDTH - 2) + 1) * TILE_SIZE + TILE_SIZE / 2;
        y = Math.floor(Math.random() * (MAZE_HEIGHT - 2) + 1) * TILE_SIZE + TILE_SIZE / 2;
    } while (isWall(x, y));
    return { x, y };
}

// Vérifier si une position est un mur
function isWall(x, y) {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    if (tileX < 0 || tileY < 0 || tileX >= MAZE_WIDTH || tileY >= MAZE_HEIGHT) return true;
    return maze[tileY][tileX] === 1;
}

// Démarrer le jeu
function startGame() {
    generateMaze();
    
    // Position aléatoire
    const pos = getRandomPosition();
    player.x = pos.x;
    player.y = pos.y;
    
    // Définir le rôle depuis localStorage (attribué par le système d'amis)
    const roleFromStorage = localStorage.getItem('monRole');
    if (roleFromStorage) {
        playerRole = roleFromStorage;
        // Nettoyer après utilisation
        localStorage.removeItem('monRole');
    } else {
        // Fallback : attribution aléatoire (1 meurtrier sur 5 joueurs)
        playerRole = Math.random() < 0.2 ? 'murderer' : 'innocent';
    }
    
    // Afficher le rôle
    const roleElement = document.getElementById('role-name');
    roleElement.textContent = playerRole === 'murderer' ? 'MEURTRIER' : 'INNOCENT';
    roleElement.className = 'role-name ' + playerRole;
    
    // Afficher le nom
    document.getElementById('player-name').textContent = playerName;
    
    // Charger la barre de bonus
    chargerBonus();
    
    // Afficher le bouton d'attaque pour le meurtrier
    if (playerRole === 'murderer') {
        document.getElementById('attack-button').style.display = 'flex';
    }
    
    // Compteur de 5 secondes (augmenté pour la synchronisation)
    let countdown = 5;
    const countdownEl = document.getElementById('countdown');
    
    const countInterval = setInterval(() => {
        countdown--;
        countdownEl.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(countInterval);
            canMove = true;
            gameStarted = true;
            document.getElementById('start-screen').style.display = 'none';
            gameLoop();
            
            // Synchro Firebase
            syncToFirebase();
        }
    }, 1000);
}

// Synchroniser avec Firebase
function syncToFirebase() {
    if (window.firebaseDB && window.firebaseRef && window.firebaseSet) {
        const playerRef = window.firebaseRef(window.firebaseDB, 'game/players/' + playerCode);
        
        setInterval(() => {
            window.firebaseSet(playerRef, {
                name: playerName,
                x: invisible ? -9999 : player.x,  // Cacher la position si invisible
                y: invisible ? -9999 : player.y,
                role: playerRole,
                alive: player.alive,
                invisible: invisible,
                timestamp: Date.now()
            });
        }, 100);
        
        // Écouter les autres joueurs
        const playersRef = window.firebaseRef(window.firebaseDB, 'game/players');
        window.firebaseOnValue(playersRef, (snapshot) => {
            const players = snapshot.val();
            if (players) {
                otherPlayers = {};
                for (const [code, data] of Object.entries(players)) {
                    if (code !== playerCode && Date.now() - data.timestamp < 5000) {
                        otherPlayers[code] = data;
                    }
                }
                updatePlayersCount();
            }
        });
    }
}

// Mettre à jour le compteur de joueurs
function updatePlayersCount() {
    const total = Object.keys(otherPlayers).length + 1;
    const alive = Object.values(otherPlayers).filter(p => p.alive).length + (player.alive ? 1 : 0);
    document.getElementById('players-alive').textContent = `👥 ${alive}/${total}`;
    
    // Vérifier victoire/défaite
    if (gameStarted && canMove) {
        if (!player.alive) {
            endGame(false, 'Vous avez été éliminé !');
        } else if (playerRole === 'murderer' && alive === 1) {
            endGame(true, 'Tous les innocents ont été éliminés !');
        } else if (playerRole === 'innocent' && Object.values(otherPlayers).filter(p => p.role === 'murderer' && p.alive).length === 0) {
            endGame(true, 'Le meurtrier a été éliminé !');
        }
    }
}

// Fin de partie
function endGame(victory, message) {
    canMove = false;
    gameStarted = false;
    
    // Incrémenter le compteur de parties jouées
    let partiesJouees = parseInt(localStorage.getItem('partiesJouees')) || 0;
    partiesJouees++;
    localStorage.setItem('partiesJouees', partiesJouees.toString());
    console.log('🎮 Parties jouées:', partiesJouees);
    
    const titleEl = document.getElementById('game-over-title');
    titleEl.textContent = victory ? 'VICTOIRE' : 'DÉFAITE';
    titleEl.className = victory ? 'victory' : 'defeat';
    
    document.getElementById('game-over-message').textContent = message;
    document.getElementById('game-over-screen').style.display = 'flex';
}

// Gestion du joystick
const joystickLeft = document.getElementById('joystick-left');
const stickLeft = document.getElementById('stick-left');

joystickLeft.addEventListener('touchstart', handleJoystickStart, { passive: false });
joystickLeft.addEventListener('touchmove', handleJoystickMove, { passive: false });
joystickLeft.addEventListener('touchend', handleJoystickEnd, { passive: false });

function handleJoystickStart(e) {
    e.preventDefault();
    joystickActive = true;
}

function handleJoystickMove(e) {
    e.preventDefault();
    if (!joystickActive) return;
    
    const touch = e.touches[0];
    const rect = joystickLeft.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = touch.clientX - centerX;
    const deltaY = touch.clientY - centerY;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = rect.width / 2 - 30;
    
    joystickAngle = Math.atan2(deltaY, deltaX);
    joystickPower = Math.min(distance / maxDistance, 1);
    
    const stickX = Math.cos(joystickAngle) * joystickPower * maxDistance;
    const stickY = Math.sin(joystickAngle) * joystickPower * maxDistance;
    
    stickLeft.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;
}

function handleJoystickEnd(e) {
    e.preventDefault();
    joystickActive = false;
    joystickPower = 0;
    stickLeft.style.transform = 'translate(-50%, -50%)';
}

// Bouton d'attaque
document.getElementById('attack-button').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (playerRole === 'murderer' && canMove) {
        tryKill();
    }
});

// Tentative de kill
function tryKill() {
    for (const [code, otherPlayer] of Object.entries(otherPlayers)) {
        if (!otherPlayer.alive) continue;
        
        const dx = otherPlayer.x - player.x;
        const dy = otherPlayer.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < KILL_DISTANCE) {
            // Tuer le joueur via Firebase
            if (window.firebaseDB && window.firebaseRef && window.firebaseUpdate) {
                const targetRef = window.firebaseRef(window.firebaseDB, 'game/players/' + code);
                window.firebaseUpdate(targetRef, { alive: false });
            }
        }
    }
}

// Boucle de jeu
function gameLoop() {
    if (!gameStarted) return;
    
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Mise à jour
function update() {
    if (!canMove || !player.alive) return;
    
    // Déplacement via joystick
    if (joystickPower > 0) {
        const speed = PLAYER_SPEED * vitesseMultiplicateur;
        const newX = player.x + Math.cos(joystickAngle) * joystickPower * speed;
        const newY = player.y + Math.sin(joystickAngle) * joystickPower * speed;
        
        // Collision avec les murs
        if (!isWall(newX, player.y)) {
            player.x = newX;
        }
        if (!isWall(player.x, newY)) {
            player.y = newY;
        }
    }
}

// Rendu
function render() {
    // Effacer le canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Caméra centrée sur le joueur
    const cameraX = player.x - canvas.width / 2;
    const cameraY = player.y - canvas.height / 2;
    
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    
    // Dessiner le labyrinthe (seulement dans le cercle de vision)
    for (let y = 0; y < MAZE_HEIGHT; y++) {
        for (let x = 0; x < MAZE_WIDTH; x++) {
            const worldX = x * TILE_SIZE;
            const worldY = y * TILE_SIZE;
            
            const dx = worldX - player.x;
            const dy = worldY - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < VISION_RADIUS) {
                if (maze[y][x] === 1) {
                    // Mur avec dégradé
                    const gradient = ctx.createLinearGradient(worldX, worldY, worldX + TILE_SIZE, worldY + TILE_SIZE);
                    gradient.addColorStop(0, '#555');
                    gradient.addColorStop(1, '#333');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(worldX, worldY, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = '#222';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(worldX, worldY, TILE_SIZE, TILE_SIZE);
                } else {
                    // Sol
                    ctx.fillStyle = '#1a1a1a';
                    ctx.fillRect(worldX, worldY, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }
    
    // Dessiner les autres joueurs (dans le cercle de vision)
    for (const [code, otherPlayer] of Object.entries(otherPlayers)) {
        if (!otherPlayer.alive || otherPlayer.x < 0 || otherPlayer.invisible) continue;
        
        const dx = otherPlayer.x - player.x;
        const dy = otherPlayer.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < VISION_RADIUS) {
            // Ombre
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(otherPlayer.x + 3, otherPlayer.y + 3, PLAYER_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Couleur selon le rôle
            if (playerRole === 'murderer' && otherPlayer.role === 'innocent') {
                ctx.fillStyle = '#00ff00';
            } else if (otherPlayer.role === 'murderer') {
                ctx.fillStyle = '#ff0000';
            } else {
                ctx.fillStyle = '#4a9eff';
            }
            
            // Joueur avec contour
            ctx.beginPath();
            ctx.arc(otherPlayer.x, otherPlayer.y, PLAYER_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Nom avec fond
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(otherPlayer.x - 30, otherPlayer.y - PLAYER_SIZE - 5, 60, 16);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(otherPlayer.name, otherPlayer.x, otherPlayer.y - PLAYER_SIZE + 6);
        }
    }
    
    // Dessiner le joueur
    if (player.alive) {
        // Ombre
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(player.x + 3, player.y + 3, PLAYER_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Joueur brillant
        const gradient = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, PLAYER_SIZE / 2);
        const color = playerRole === 'murderer' ? '#ff0000' : '#00ff00';
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, playerRole === 'murderer' ? '#cc0000' : '#00cc00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(player.x, player.y, PLAYER_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Nom avec fond
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(player.x - 35, player.y - PLAYER_SIZE - 8, 70, 18);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(playerName, player.x, player.y - PLAYER_SIZE + 4);
    }
    
    ctx.restore();
    
    // Appliquer le fog of war (cercle de vision)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, VISION_RADIUS
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(0.95, 'rgba(0, 0, 0, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.restore();
    
    // Dessiner la minimap
    renderMinimap();
}

// Rendu minimap
function renderMinimap() {
    minimapCtx.fillStyle = '#000';
    minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    
    const scale = minimapCanvas.width / (MAZE_WIDTH * TILE_SIZE);
    
    // Dessiner les murs
    for (let y = 0; y < MAZE_HEIGHT; y++) {
        for (let x = 0; x < MAZE_WIDTH; x++) {
            if (maze[y][x] === 1) {
                minimapCtx.fillStyle = '#444';
                minimapCtx.fillRect(x * TILE_SIZE * scale, y * TILE_SIZE * scale, TILE_SIZE * scale, TILE_SIZE * scale);
            }
        }
    }
    
    // Dessiner les autres joueurs
    for (const otherPlayer of Object.values(otherPlayers)) {
        if (!otherPlayer.alive) continue;
        minimapCtx.fillStyle = otherPlayer.role === 'murderer' ? '#ff0000' : '#4a9eff';
        minimapCtx.beginPath();
        minimapCtx.arc(otherPlayer.x * scale, otherPlayer.y * scale, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    }
    
    // Dessiner le joueur
    if (player.alive) {
        minimapCtx.fillStyle = playerRole === 'murderer' ? '#ff0000' : '#00ff00';
        minimapCtx.beginPath();
        minimapCtx.arc(player.x * scale, player.y * scale, 4, 0, Math.PI * 2);
        minimapCtx.fill();
        minimapCtx.strokeStyle = '#fff';
        minimapCtx.lineWidth = 2;
        minimapCtx.stroke();
    }
}

// Démarrer le jeu après chargement
setTimeout(() => {
    startGame();
}, 500);
