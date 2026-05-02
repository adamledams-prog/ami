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
const PLAYER_SPEED = 160 / 60; // 4 blocs/s (TILE_SIZE=40px, ~60fps)
const KILL_DISTANCE = 160; // 4 blocs (4 * TILE_SIZE)

// Animations de mort (Among Us style)
let killAnimations = [];
let deathAnimation = null;
let killed = false; // flag anti-race-condition

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
let mazeSeed = null; // Seed partagée pour la génération de la carte

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

// Générateur de nombres aléatoires avec seed (pour synchroniser les cartes)
let seededRandomState = 1;
function seededRandom() {
    seededRandomState = (seededRandomState * 9301 + 49297) % 233280;
    return seededRandomState / 233280;
}

function setSeed(seed) {
    seededRandomState = seed;
}

// Générer un labyrinthe simple avec seed partagée
function generateMaze() {
    // Réinitialiser le générateur avec la seed
    if (mazeSeed !== null) {
        setSeed(mazeSeed);
    }
    
    maze = [];
    for (let y = 0; y < MAZE_HEIGHT; y++) {
        maze[y] = [];
        for (let x = 0; x < MAZE_WIDTH; x++) {
            // Bordures
            if (x === 0 || y === 0 || x === MAZE_WIDTH - 1 || y === MAZE_HEIGHT - 1) {
                maze[y][x] = 1;
            }
            // Murs aléatoires (plus de passages) - utiliser seededRandom au lieu de Math.random
            else if (seededRandom() < 0.25) {
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
    // Récupérer ou créer la seed de la carte depuis Firebase
    if (window.firebaseDB && window.firebaseRef && window.firebaseSet && window.firebaseOnValue) {
        const seedRef = window.firebaseRef(window.firebaseDB, 'game/mapSeed');
        
        // Écouter la seed
        window.firebaseOnValue(seedRef, (snapshot) => {
            const seedData = snapshot.val();
            
            if (seedData && seedData.seed) {
                // Utiliser la seed existante
                mazeSeed = seedData.seed;
                console.log('🗺️ Seed de carte récupérée:', mazeSeed);
            } else {
                // Créer une nouvelle seed
                mazeSeed = Math.floor(Math.random() * 1000000);
                window.firebaseSet(seedRef, {
                    seed: mazeSeed,
                    createdAt: Date.now()
                });
                console.log('🗺️ Nouvelle seed créée:', mazeSeed);
            }
            
            // Générer le labyrinthe avec la seed partagée
            generateMaze();
            
            // Continuer l'initialisation du jeu uniquement après avoir la seed
            initializeGameAfterSeed();
        }, { onlyOnce: true }); // Récupérer une seule fois
    } else {
        // Fallback si Firebase n'est pas disponible
        mazeSeed = Date.now();
        generateMaze();
        initializeGameAfterSeed();
    }
}

// Initialiser le jeu après avoir récupéré la seed
function initializeGameAfterSeed() {
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
    
    // IMPORTANT : Écrire immédiatement dans Firebase pour que les autres joueurs nous voient
    if (window.firebaseDB && window.firebaseRef && window.firebaseSet) {
        const playerRef = window.firebaseRef(window.firebaseDB, 'game/players/' + playerCode);
        window.firebaseSet(playerRef, {
            name: playerName,
            x: player.x,
            y: player.y,
            role: playerRole,
            alive: player.alive,
            invisible: false,
            timestamp: Date.now()
        });
        
        // Commencer à écouter les autres joueurs IMMÉDIATEMENT
        const playersRef = window.firebaseRef(window.firebaseDB, 'game/players');
        window.firebaseOnValue(playersRef, (snapshot) => {
            const players = snapshot.val();
            if (players) {
                otherPlayers = {};
                for (const [code, data] of Object.entries(players)) {
                    // Accepter les joueurs connectés dans les 10 dernières secondes (au lieu de 5)
                    if (code !== playerCode && Date.now() - data.timestamp < 10000) {
                        otherPlayers[code] = data;
                    }
                }
                updatePlayersCount();
            }
        });
        
        // Écouter notre propre joueur pour détecter si on est tué
        const myPlayerRef = window.firebaseRef(window.firebaseDB, 'game/players/' + playerCode);
        window.firebaseOnValue(myPlayerRef, (snapshot) => {
            const myData = snapshot.val();
            if (myData && !myData.alive && player.alive && !killed) {
                // Marquer killed en PREMIER pour stopper le sync (anti-race-condition)
                killed = true;
                player.alive = false;
                const killerName = myData.killedBy || 'quelqu\'un';
                // Lancer l'animation de mort HTML
                lancerAnimationMort(player.x, player.y, '#00ff00', true);
                setTimeout(() => {
                    endGame(false, `💀 Vous avez été tué par ${killerName} !`);
                }, 2000);
            }
        });
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
            
            // Synchro Firebase continue
            syncToFirebase();
            
            // Vérifier après 10 secondes s'il reste 1 seul joueur (5s countdown + 5s sync)
            setTimeout(() => {
                verifierJoueurUnique();
            }, 10000);
        }
    }, 1000);
}

// Vérifier si le joueur est seul dans la partie
function verifierJoueurUnique() {
    if (!gameStarted || !player.alive) return;
    
    // Compter tous les joueurs (vivants ou morts) connectés récemment
    const autresJoueursTotaux = Object.values(otherPlayers).filter(p => {
        const estRecent = p.timestamp && (Date.now() - p.timestamp) < 10000;
        return estRecent;
    });
    
    // Si on détecte au moins 1 autre joueur, ne pas déclencher la victoire solo
    // Cette vérification est juste pour les parties vraiment solo
    if (autresJoueursTotaux.length === 0) {
        console.log('⚠️ Aucun autre joueur détecté après 10 secondes');
        const autresJoueursVivants = Object.values(otherPlayers).filter(p => p.alive);
        if (autresJoueursVivants.length === 0) {
            endGame(true, 'Vous êtes le seul joueur ! Victoire par défaut ! 🎉');
        }
    } else {
        console.log(`✅ ${autresJoueursTotaux.length} autre(s) joueur(s) détecté(s)`);
    }
}

// Synchroniser avec Firebase (écriture périodique)
function syncToFirebase() {
    if (window.firebaseDB && window.firebaseRef && window.firebaseSet) {
        const playerRef = window.firebaseRef(window.firebaseDB, 'game/players/' + playerCode);
        
        // Écrire périodiquement la position et l'état
        // IMPORTANT: on utilise update() et pas set() pour ne PAS écraser alive:false écrit par le tueur
        setInterval(() => {
            if (gameStarted && canMove && player.alive && !killed) {
                window.firebaseUpdate(playerRef, {
                    name: playerName,
                    x: invisible ? -9999 : player.x,
                    y: invisible ? -9999 : player.y,
                    role: playerRole,
                    alive: true,
                    invisible: invisible,
                    timestamp: Date.now()
                });
            }
        }, 100);
        
        // Vérification périodique des victoires (toutes les 500ms)
        setInterval(() => {
            if (gameStarted && canMove) {
                updatePlayersCount();
            }
        }, 500);
    }
}

// Mettre à jour le compteur de joueurs
function updatePlayersCount() {
    const total = Object.keys(otherPlayers).length + 1;
    const alive = Object.values(otherPlayers).filter(p => p.alive).length + (player.alive ? 1 : 0);
    document.getElementById('players-alive').textContent = `👥 ${alive}/${total}`;
    
    // Vérifier victoire/défaite
    if (gameStarted && canMove && player.alive) {
        const autresVivants = Object.values(otherPlayers).filter(p => p.alive);
        const autresInnocentsVivants = autresVivants.filter(p => p.role === 'innocent');
        const meurtriersVivants = autresVivants.filter(p => p.role === 'murderer');
        
        // Cas 1: Je suis mort
        if (!player.alive) {
            endGame(false, 'Vous avez été éliminé !');
            return;
        }
        
        // Cas 2: Je suis le meurtrier et tous les innocents sont morts
        if (playerRole === 'murderer') {
            if (autresInnocentsVivants.length === 0 && autresVivants.length >= 0) {
                endGame(true, 'Tous les innocents ont été éliminés !');
                return;
            }
        }
        
        // Cas 3: Je suis innocent et le meurtrier est mort ou a quitté
        if (playerRole === 'innocent') {
            if (meurtriersVivants.length === 0) {
                endGame(true, 'Le meurtrier a été éliminé ou a quitté !');
                return;
            }
        }
        
        // Cas 4: Il ne reste que 2 joueurs et l'autre quitte
        if (total === 1 && alive === 1) {
            // Je suis seul, l'autre a quitté
            endGame(true, 'Victoire ! L\'adversaire a quitté la partie ! 🏆');
            return;
        }
    } else if (!player.alive && gameStarted) {
        // Si je suis mort, afficher défaite
        endGame(false, 'Vous avez été éliminé !');
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
    
    // Calculer le classement si défaite
    let rankingText = '';
    if (!victory) {
        // Compter les joueurs encore vivants et morts
        const totalPlayers = Object.keys(otherPlayers).length + 1; // +1 pour nous
        const alivePlayers = Object.values(otherPlayers).filter(p => p.alive).length;
        const deadPlayers = totalPlayers - alivePlayers; // Nous sommes morts, donc inclus dans deadPlayers
        
        // Notre position = nombre de joueurs vivants + 1 (on est mort)
        const ourPosition = alivePlayers + 1;
        
        rankingText = `\n\n📊 Ta place: ${ourPosition}/${totalPlayers}`;
    }
    
    document.getElementById('game-over-message').textContent = message + rankingText;
    document.getElementById('game-over-screen').style.display = 'flex';
}

// Gestion du joystick
const joystickLeft = document.getElementById('joystick-left');
const stickLeft = document.getElementById('stick-left');

// Variables pour contrôles clavier
let keysPressed = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

// CONTRÔLES CLAVIER (PC)
document.addEventListener('keydown', (e) => {
    // Gestion des flèches
    if (keysPressed.hasOwnProperty(e.key)) {
        e.preventDefault();
        keysPressed[e.key] = true;
    }
    
    // Attaque avec ESPACE
    if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (playerRole === 'murderer' && canMove) {
            tryKill();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (keysPressed.hasOwnProperty(e.key)) {
        e.preventDefault();
        keysPressed[e.key] = false;
    }
});

// JOYSTICK TACTILE (Téléphone/Tablette)
joystickLeft.addEventListener('touchstart', handleJoystickStart, { passive: false });
joystickLeft.addEventListener('touchmove', handleJoystickMove, { passive: false });
joystickLeft.addEventListener('touchend', handleJoystickEnd, { passive: false });

// JOYSTICK SOURIS (PC)
joystickLeft.addEventListener('mousedown', handleJoystickStartMouse);
document.addEventListener('mousemove', handleJoystickMoveMouse);
document.addEventListener('mouseup', handleJoystickEndMouse);

let mouseJoystickActive = false;

function handleJoystickStartMouse(e) {
    e.preventDefault();
    mouseJoystickActive = true;
    joystickActive = true;
}

function handleJoystickMoveMouse(e) {
    if (!mouseJoystickActive) return;
    e.preventDefault();
    
    const rect = joystickLeft.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = rect.width / 2 - 30;
    
    joystickAngle = Math.atan2(deltaY, deltaX);
    joystickPower = Math.min(distance / maxDistance, 1);
    
    const stickX = Math.cos(joystickAngle) * joystickPower * maxDistance;
    const stickY = Math.sin(joystickAngle) * joystickPower * maxDistance;
    
    stickLeft.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;
}

function handleJoystickEndMouse(e) {
    if (!mouseJoystickActive) return;
    e.preventDefault();
    mouseJoystickActive = false;
    joystickActive = false;
    joystickPower = 0;
    stickLeft.style.transform = 'translate(-50%, -50%)';
}

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

// Bouton d'attaque (Tactile)
document.getElementById('attack-button').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (playerRole === 'murderer' && canMove) {
        tryKill();
    }
});

// Bouton d'attaque (Souris pour PC)
document.getElementById('attack-button').addEventListener('click', (e) => {
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
            if (window.firebaseDB && window.firebaseRef && window.firebaseUpdate) {
                const targetRef = window.firebaseRef(window.firebaseDB, 'game/players/' + code);
                window.firebaseUpdate(targetRef, { 
                    alive: false,
                    killedBy: playerName
                }).then(() => {
                    console.log(`⚔️ Joueur ${code} tué par ${playerName}!`);
                    
                    if (otherPlayers[code]) {
                        otherPlayers[code].alive = false;
                        otherPlayers[code].killedBy = playerName;
                    }
                    
                    // Animation Among Us côté tueur
                    lancerAnimationMort(otherPlayer.x, otherPlayer.y, '#ff0000', false);
                    
                    setTimeout(() => {
                        updatePlayersCount();
                    }, 100);
                });
            }
            break; // Un seul kill par appui
        }
    }
}

// Animation de mort style Among Us
function lancerAnimationMort(x, y, couleur, estMoi) {
    const anim = {
        x, y,
        couleur,
        estMoi,
        temps: 0,
        duree: 90, // frames
        particules: []
    };
    // Générer des particules de sang
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 / 20) * i + (Math.random() - 0.5) * 0.5;
        const vitesse = 1.5 + Math.random() * 4;
        anim.particules.push({
            vx: Math.cos(angle) * vitesse,
            vy: Math.sin(angle) * vitesse - 1.5,
            taille: 3 + Math.random() * 7,
            alpha: 1
        });
    }
    killAnimations.push(anim);

    if (estMoi) {
        // Animation HTML indépendante du gameLoop
        jouerAnimationMortHTML();
    } else {
        // Confirmation kill pour le tueur
        const killOverlay = document.getElementById('kill-overlay');
        if (killOverlay) {
            killOverlay.style.display = 'block';
            killOverlay.style.opacity = '1';
            let t = 0;
            const iv = setInterval(() => {
                t += 16;
                if (t > 800) {
                    killOverlay.style.opacity = '0';
                    killOverlay.style.display = 'none';
                    clearInterval(iv);
                } else if (t > 500) {
                    killOverlay.style.opacity = String(1 - (t - 500) / 300);
                }
            }, 16);
        }
    }
}

function jouerAnimationMortHTML() {
    const overlay  = document.getElementById('death-overlay');
    const vignette = document.getElementById('death-vignette');
    const flash    = document.getElementById('death-flash');
    const texte    = document.getElementById('death-text');
    const noir     = document.getElementById('death-black');
    if (!overlay) return;

    overlay.style.display = 'block';

    // Étape 1 : flash blanc immédiat
    flash.style.opacity = '0.8';
    setTimeout(() => { flash.style.transition = 'opacity 0.3s'; flash.style.opacity = '0'; }, 50);

    // Étape 2 : vignette rouge
    vignette.style.opacity = '0';
    setTimeout(() => { vignette.style.transition = 'opacity 0.2s'; vignette.style.opacity = '1'; }, 50);
    setTimeout(() => { vignette.style.transition = 'opacity 0.8s'; vignette.style.opacity = '0.3'; }, 400);

    // Étape 3 : texte ÉLIMINÉ avec bounce
    texte.style.transform = 'translate(-50%,-50%) scale(2.5)';
    texte.style.opacity = '0';
    setTimeout(() => {
        texte.style.transition = 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        texte.style.transform = 'translate(-50%,-50%) scale(1)';
        texte.style.opacity = '1';
    }, 150);
    setTimeout(() => {
        texte.style.transition = 'opacity 0.3s';
        texte.style.opacity = '0';
    }, 1100);

    // Étape 4 : fondu au noir
    noir.style.opacity = '0';
    setTimeout(() => { noir.style.transition = 'opacity 0.5s'; noir.style.opacity = '1'; }, 1200);

    // Masquer après fin
    setTimeout(() => { overlay.style.display = 'none'; noir.style.opacity = '0'; }, 2000);
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
    
    const speed = PLAYER_SPEED * vitesseMultiplicateur;
    let moveX = 0;
    let moveY = 0;
    
    // Déplacement via CLAVIER (PC)
    if (keysPressed.ArrowUp) moveY -= 1;
    if (keysPressed.ArrowDown) moveY += 1;
    if (keysPressed.ArrowLeft) moveX -= 1;
    if (keysPressed.ArrowRight) moveX += 1;
    
    // Normaliser le mouvement diagonal
    if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.707;
        moveY *= 0.707;
    }
    
    // Déplacement via JOYSTICK (Tactile/Souris)
    if (joystickPower > 0) {
        moveX = Math.cos(joystickAngle) * joystickPower;
        moveY = Math.sin(joystickAngle) * joystickPower;
    }
    
    // Appliquer le mouvement
    if (moveX !== 0 || moveY !== 0) {
        const newX = player.x + moveX * speed;
        const newY = player.y + moveY * speed;
        
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
            
            // Autres joueurs toujours en rouge
            ctx.fillStyle = '#ff0000';
            
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
        gradient.addColorStop(0, '#00ff00');
        gradient.addColorStop(1, '#00cc00');
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
    
    // Animations de mort Among Us
    renderKillAnimations();
}

function renderKillAnimations() {
    const cameraX = player.x - canvas.width / 2;
    const cameraY = player.y - canvas.height / 2;

    // ── Animations de corps (style Among Us) ──────────────────────────────────
    killAnimations = killAnimations.filter(anim => anim.temps < anim.duree);

    for (const anim of killAnimations) {
        anim.temps++;
        const t = anim.temps;
        const progress = t / anim.duree;
        const ease = 1 - Math.pow(1 - progress, 3);
        const screenX = anim.x - cameraX;
        const screenY = anim.y - cameraY;
        const R = PLAYER_SIZE / 2;

        ctx.save();

        // Flash blanc au moment du kill
        if (t < 6) {
            ctx.globalAlpha = (1 - t / 6) * 0.8;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(screenX, screenY, R * 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Moitié HAUTE : part en haut-gauche + rotation ──
        ctx.save();
        ctx.translate(screenX - ease * 55, screenY - ease * 50);
        ctx.rotate(-ease * 1.2);
        ctx.globalAlpha = Math.max(0, 1 - progress * 1.1);
        ctx.save();
        ctx.beginPath();
        ctx.rect(-R - 5, -R - 5, (R + 5) * 2, R + 5);
        ctx.clip();
        ctx.fillStyle = anim.couleur;
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = '#cc0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-R, 0);
        ctx.lineTo(R, 0);
        ctx.stroke();
        ctx.restore();
        ctx.restore();

        // ── Moitié BASSE : part en bas-droite + rotation ──
        ctx.save();
        ctx.translate(screenX + ease * 55, screenY + ease * 50);
        ctx.rotate(ease * 1.2);
        ctx.globalAlpha = Math.max(0, 1 - progress * 1.1);
        ctx.save();
        ctx.beginPath();
        ctx.rect(-R - 5, 0, (R + 5) * 2, R + 5);
        ctx.clip();
        ctx.fillStyle = anim.couleur;
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = '#cc0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-R, 0);
        ctx.lineTo(R, 0);
        ctx.stroke();
        ctx.restore();
        ctx.restore();

        // ── Particules de sang avec gravité ──
        for (const p of anim.particules) {
            const px = screenX + p.vx * t * 0.9;
            const py = screenY + p.vy * t * 0.9 + 0.08 * t * t;
            const palpha = Math.max(0, 1 - progress * 1.6);
            const ptaille = p.taille * Math.max(0.2, 1 - progress);
            ctx.save();
            ctx.globalAlpha = palpha;
            const pg = ctx.createRadialGradient(px, py, 0, px, py, ptaille);
            pg.addColorStop(0, '#ff2222');
            pg.addColorStop(1, '#660000');
            ctx.fillStyle = pg;
            ctx.beginPath();
            ctx.arc(px, py, ptaille, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ── Onde de choc circulaire ──
        if (t < 25) {
            ctx.save();
            ctx.globalAlpha = (1 - t / 25) * 0.7;
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(screenX, screenY, ease * 80, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    }
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
        minimapCtx.fillStyle = '#ff0000';
        minimapCtx.beginPath();
        minimapCtx.arc(otherPlayer.x * scale, otherPlayer.y * scale, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    }
    
    // Dessiner le joueur
    if (player.alive) {
        minimapCtx.fillStyle = '#00ff00';
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
