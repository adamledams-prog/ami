// Récupérer les données depuis localStorage
const nomStocke = localStorage.getItem('nomJoueur');
const couleurSauvee = localStorage.getItem('couleurNom');
let pieces = parseInt(localStorage.getItem('pieces')) || 0;

// Afficher le nom
if (nomStocke) {
    document.getElementById('nom-joueur-base').querySelector('span:last-child').textContent = nomStocke;
}

// Appliquer la couleur de la carte de combat
if (couleurSauvee) {
    document.getElementById('nom-joueur-base').style.background = couleurSauvee;
}

// Afficher les pièces
document.getElementById('pieces-base').textContent = pieces;

// Récupérer les données de la base
const fusilsPrets = parseInt(localStorage.getItem('fusilsPrets')) || 0;
const niveauBouclier = parseInt(localStorage.getItem('niveauBouclier')) || 1;
const nombreBases = parseInt(localStorage.getItem('nombreBases')) || 1;

// Afficher les stats
document.getElementById('fusils-prets').textContent = fusilsPrets;
document.getElementById('niveau-bouclier').textContent = niveauBouclier;
document.getElementById('nombre-bases').textContent = nombreBases;

// ==== SYSTÈME DE ROUE DE RÉCOMPENSES ====

const paliers = [
    { temps: 30, recompense: 'coffre', nombre: 1, texte: '🎁 Coffre Bronze' },
    { temps: 120, recompense: 'pieces', nombre: 20, texte: '🪙 20 pièces' },
    { temps: 240, recompense: 'pieces', nombre: 30, texte: '🪙 30 pièces' },
    { temps: 420, recompense: 'coffre', nombre: 3, texte: '🎁 3 Coffres Bronze' }
];

let tempsEcoule = parseInt(localStorage.getItem('tempsRoue')) || 0;
let derniereVisite = parseInt(localStorage.getItem('derniereVisiteRoue')) || Date.now();
let palierActuel = parseInt(localStorage.getItem('palierRoue')) || 0;
let intervalTimer = null;

// Calculer le temps écoulé depuis la dernière visite
const maintenant = Date.now();
const diffSecondes = Math.floor((maintenant - derniereVisite) / 1000);
tempsEcoule += diffSecondes;

// Réinitialiser la roue tous les 10 heures (36000 secondes)
const DUREE_CYCLE = 36000; // 10 heures en secondes
if (tempsEcoule >= DUREE_CYCLE) {
    tempsEcoule = 0;
    palierActuel = 0;
    localStorage.setItem('tempsRoue', '0');
    localStorage.setItem('palierRoue', '0');
}

// Sauvegarder
localStorage.setItem('derniereVisiteRoue', maintenant.toString());
localStorage.setItem('tempsRoue', tempsEcoule.toString());

// Démarrer le timer
demarrerTimer();

// Vérifier si on arrive avec un coffre bonus (depuis quête 2)
const urlParams = new URLSearchParams(window.location.search);
const coffreBonus = parseInt(urlParams.get('coffreBonus')) || 0;
if (coffreBonus > 0) {
    // Nettoyer l'URL
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Ouvrir le(s) coffre(s) après un court délai
    setTimeout(() => {
        ouvrirCoffres(coffreBonus);
    }, 800);
}

// Ouvrir le modal roue
document.getElementById('btn-roue-mini').addEventListener('click', function() {
    document.getElementById('modal-roue').style.display = 'flex';
    mettreAJourPaliers();
});

// Fermer le modal roue
document.getElementById('modal-close-roue').addEventListener('click', function() {
    document.getElementById('modal-roue').style.display = 'none';
});

function demarrerTimer() {
    if (intervalTimer) clearInterval(intervalTimer);
    
    intervalTimer = setInterval(() => {
        tempsEcoule++;
        localStorage.setItem('tempsRoue', tempsEcoule.toString());
        
        afficherTempsMini();
        mettreAJourPaliers();
    }, 1000);
    
    afficherTempsMini();
}

function afficherTempsMini() {
    const btnMini = document.getElementById('btn-roue-mini');
    const timerMini = document.getElementById('roue-mini-timer');
    
    // Trouver le prochain palier non complété
    let prochainPalier = null;
    for (let i = palierActuel; i < paliers.length; i++) {
        if (tempsEcoule < paliers[i].temps) {
            prochainPalier = paliers[i];
            break;
        }
    }
    
    if (!prochainPalier) {
        timerMini.textContent = '✅';
        btnMini.classList.remove('ready');
        return;
    }
    
    const tempsRestant = prochainPalier.temps - tempsEcoule;
    
    if (tempsRestant <= 0) {
        timerMini.textContent = '✅';
        btnMini.classList.add('ready');
    } else {
        const minutes = Math.floor(tempsRestant / 60);
        const secondes = tempsRestant % 60;
        timerMini.textContent = `${minutes}:${secondes.toString().padStart(2, '0')}`;
        btnMini.classList.remove('ready');
    }
}

function mettreAJourPaliers() {
    for (let i = 0; i < paliers.length; i++) {
        const palier = paliers[i];
        const card = document.getElementById(`palier-${i}`);
        const status = document.getElementById(`status-${i}`);
        const progress = document.getElementById(`progress-${i}`);
        const btnReclamer = document.getElementById(`btn-palier-${i}`);
        
        if (i < palierActuel) {
            // Palier déjà réclamé
            card.classList.remove('active');
            card.classList.add('completed');
            status.textContent = '✅';
            progress.style.width = '100%';
            btnReclamer.style.display = 'none';
        } else if (i === palierActuel) {
            // Palier en cours
            card.classList.add('active');
            card.classList.remove('completed');
            
            if (tempsEcoule >= palier.temps) {
                // Prêt à réclamer
                status.textContent = '🎁';
                progress.style.width = '100%';
                btnReclamer.style.display = 'block';
            } else {
                // En progression
                status.textContent = '⏳';
                const pourcentage = Math.min((tempsEcoule / palier.temps) * 100, 100);
                progress.style.width = pourcentage + '%';
                btnReclamer.style.display = 'none';
            }
        } else {
            // Palier futur
            card.classList.remove('active', 'completed');
            status.textContent = '🔒';
            progress.style.width = '0%';
            btnReclamer.style.display = 'none';
        }
    }
}

// Boutons réclamer pour chaque palier
for (let i = 0; i < paliers.length; i++) {
    document.getElementById(`btn-palier-${i}`).addEventListener('click', function() {
        reclamerPalier(i);
    });
}

function reclamerPalier(index) {
    const palier = paliers[index];
    
    if (palier.recompense === 'coffre') {
        // Ouvrir des coffres
        document.getElementById('modal-roue').style.display = 'none';
        ouvrirCoffres(palier.nombre);
    } else if (palier.recompense === 'pieces') {
        // Donner des pièces directement
        pieces += palier.nombre;
        localStorage.setItem('pieces', pieces.toString());
        document.getElementById('pieces-base').textContent = pieces;
        alert(`🎉 Vous avez reçu ${palier.nombre} pièces ! 🪙`);
        
        // Passer au palier suivant
        passerPalierSuivant();
    }
}

function ouvrirCoffres(nombre) {
    let totalPieces = 0;
    
    for (let i = 0; i < nombre; i++) {
        const resultat = tirerCoffreBronze();
        totalPieces += resultat;
    }
    
    // Ajouter les pièces
    pieces += totalPieces;
    localStorage.setItem('pieces', pieces.toString());
    document.getElementById('pieces-base').textContent = pieces;
    
    // Afficher le modal
    const modal = document.getElementById('modal-coffre');
    modal.style.display = 'flex';
    
    // Attendre un peu puis ouvrir le coffre
    setTimeout(() => {
        modal.classList.add('opening');
        document.querySelector('.modal-content').classList.add('opened');
        
        // Afficher le résultat après l'ouverture
        setTimeout(() => {
            const resultatElement = document.getElementById('coffre-resultat');
            resultatElement.textContent = `🎉 Vous avez gagné ${totalPieces} pièces ! 🪙`;
            resultatElement.classList.add('result-animate');
            
            setTimeout(() => {
                resultatElement.classList.remove('result-animate');
            }, 1000);
        }, 800);
    }, 500);
}

function tirerCoffreBronze() {
    const random = Math.random() * 100;
    
    if (random < 5) return 10;          // 5%
    else if (random < 15) return 20;    // 10%
    else if (random < 35) return 30;    // 20%
    else if (random < 65) return 40;    // 30%
    else if (random < 85) return 50;    // 20%
    else if (random < 95) return 70;    // 10%
    else return 100;                     // 5%
}

function passerPalierSuivant() {
    palierActuel++;
    localStorage.setItem('palierRoue', palierActuel.toString());
    
    // Ne pas réinitialiser le temps - il continue de s'accumuler
    // Mettre à jour l'affichage
    afficherTempsMini();
    mettreAJourPaliers();
}

// Fermer le modal coffre
document.getElementById('btn-ok-coffre').addEventListener('click', function() {
    const modal = document.getElementById('modal-coffre');
    modal.style.display = 'none';
    
    // Réinitialiser les animations
    modal.classList.remove('opening');
    document.querySelector('.modal-content').classList.remove('opened');
    document.getElementById('coffre-resultat').textContent = '';
    
    passerPalierSuivant();
});