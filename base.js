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
const coffrePierre = parseInt(urlParams.get('coffrePierre')) || 0;

if (coffreBonus > 0) {
    // Nettoyer l'URL
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Ouvrir le(s) coffre(s) bronze après un court délai
    setTimeout(() => {
        ouvrirCoffres(coffreBonus, 'bronze');
    }, 800);
}

if (coffrePierre > 0) {
    // Nettoyer l'URL
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Ouvrir le(s) coffre(s) pierre après un court délai
    setTimeout(() => {
        ouvrirCoffres(coffrePierre, 'pierre');
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
        // Ouvrir des coffres bronze
        document.getElementById('modal-roue').style.display = 'none';
        ouvrirCoffres(palier.nombre, 'bronze');
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

function ouvrirCoffres(nombre, type = 'bronze') {
    if (type === 'pierre') {
        ouvrirCoffresPierre(nombre);
        return;
    }
    
    // Coffre bronze (bois)
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
            if (nombre > 1) {
                resultatElement.textContent = `🎉 ${nombre} Coffres ouverts !\nVous avez gagné ${totalPieces} pièces ! 🪙`;
            } else {
                resultatElement.textContent = `🎉 Vous avez gagné ${totalPieces} pièces ! 🪙`;
            }
            resultatElement.classList.add('result-animate');
            
            setTimeout(() => {
                resultatElement.classList.remove('result-animate');
            }, 1000);
        }, 800);
    }, 500);
}

function ouvrirCoffresPierre(nombre) {
    let inventaire = JSON.parse(localStorage.getItem('inventaire')) || {};
    let resultats = [];
    let totalPieces = 0;
    
    for (let i = 0; i < nombre; i++) {
        const resultat = tirerCoffrePierre();
        resultats.push(resultat);
        
        if (resultat.type === 'pieces') {
            totalPieces += resultat.montant;
        } else if (resultat.type === 'potion') {
            // Ajouter la potion à l'inventaire
            if (!inventaire[resultat.key]) {
                inventaire[resultat.key] = { nom: resultat.nom, quantite: 0 };
            }
            inventaire[resultat.key].quantite++;
        }
    }
    
    // Mettre à jour les pièces
    if (totalPieces > 0) {
        pieces += totalPieces;
        localStorage.setItem('pieces', pieces.toString());
        document.getElementById('pieces-base').textContent = pieces;
    }
    
    // Mettre à jour l'inventaire
    localStorage.setItem('inventaire', JSON.stringify(inventaire));
    
    // Afficher le modal avec animation spéciale pierre
    const modal = document.getElementById('modal-coffre');
    const modalContent = document.querySelector('.modal-content');
    const coffreBox = document.getElementById('coffre-box');
    const h2 = modalContent.querySelector('h2');
    
    // Changer le titre et le style pour pierre
    h2.textContent = '🪨 Coffre Pierre 🪨';
    modalContent.classList.add('coffre-pierre');
    coffreBox.innerHTML = '<div class="coffre-top-pierre">🪨</div><div class="coffre-bottom-pierre">🪨</div><div class="treasure-burst-pierre"></div>';
    
    modal.style.display = 'flex';
    
    // Attendre un peu puis ouvrir le coffre
    setTimeout(() => {
        modal.classList.add('opening');
        modalContent.classList.add('opened');
        
        // Afficher le résultat après l'ouverture
        setTimeout(() => {
            const resultatElement = document.getElementById('coffre-resultat');
            let messageResultat = '🎉 Récompense(s) :\n\n';
            
            // Compter les récompenses
            const potionsRecues = resultats.filter(r => r.type === 'potion');
            const piecesRecues = resultats.filter(r => r.type === 'pieces');
            
            if (potionsRecues.length > 0) {
                const potionsParType = {};
                potionsRecues.forEach(p => {
                    if (!potionsParType[p.key]) {
                        potionsParType[p.key] = { icon: p.icon, nom: p.nom, count: 0 };
                    }
                    potionsParType[p.key].count++;
                });
                
                Object.values(potionsParType).forEach(p => {
                    messageResultat += `${p.icon} ${p.count}x ${p.nom}\n`;
                });
            }
            
            if (totalPieces > 0) {
                messageResultat += `🪙 ${totalPieces} pièces\n`;
            }
            
            resultatElement.textContent = messageResultat;
            resultatElement.classList.add('result-animate');
            
            setTimeout(() => {
                resultatElement.classList.remove('result-animate');
            }, 1000);
        }, 800);
    }, 500);
}

function tirerCoffreBronze() {
    const random = Math.random() * 100;
    
    if (random < 5) return 10;          // 5% - 10 pièces
    else if (random < 15) return 20;    // 10% - 20 pièces  
    else if (random < 35) return 30;    // 20% - 30 pièces
    else if (random < 65) return 20;    // 30% - 20 pièces (modifié de 40)
    else if (random < 85) return 30;    // 20% - 30 pièces (modifié de 50)
    else if (random < 95) return 40;    // 10% - 40 pièces (modifié de 70)
    else return 50;                      // 5% - 50 pièces (modifié de 100)
}

function tirerCoffrePierre() {
    const random = Math.random() * 100;
    
    if (random < 5) {
        // 5% - Potion invisibilité 5s
        return { type: 'potion', nom: 'Invisibilité 5s', key: 'invi5', icon: '👻' };
    } else if (random < 15) {
        // 10% - Potion invisibilité 3s
        return { type: 'potion', nom: 'Invisibilité 3s', key: 'invi3', icon: '👻' };
    } else if (random < 35) {
        // 20% - 50 pièces
        return { type: 'pieces', montant: 50 };
    } else if (random < 65) {
        // 30% - 30 pièces
        return { type: 'pieces', montant: 30 };
    } else if (random < 85) {
        // 20% - 50 pièces
        return { type: 'pieces', montant: 50 };
    } else if (random < 95) {
        // 10% - Potion vitesse x1.5
        return { type: 'potion', nom: 'Vitesse 1.5x', key: 'vitesse1.5', icon: '⚡' };
    } else {
        // 5% - Potion vitesse x2
        return { type: 'potion', nom: 'Vitesse 2x', key: 'vitesse2', icon: '⚡' };
    }
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
    const modalContent = document.querySelector('.modal-content');
    const coffreBox = document.getElementById('coffre-box');
    const h2 = modalContent.querySelector('h2');
    
    modal.style.display = 'none';
    
    // Réinitialiser les animations
    modal.classList.remove('opening');
    modalContent.classList.remove('opened', 'coffre-pierre');
    document.getElementById('coffre-resultat').textContent = '';
    
    // Réinitialiser le contenu du coffre (remettre le bronze par défaut)
    h2.textContent = '🎁 Coffre Bronze 🎁';
    coffreBox.innerHTML = `
        <div class="coffre-top">📦</div>
        <div class="coffre-bottom">📦</div>
        <div class="treasure-burst">
            <span>💰</span>
            <span>🪙</span>
            <span>💎</span>
            <span>✨</span>
            <span>🪙</span>
            <span>💰</span>
        </div>
    `;
    
    passerPalierSuivant();
});