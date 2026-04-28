// Redirection vers le tutoriel si première visite
if (!localStorage.getItem('tutorielFait') || localStorage.getItem('tutorielFait') !== 'true') {
    // Si on n'est pas déjà sur la page tutoriel
    if (!window.location.pathname.includes('tutoriel.html')) {
        window.location.href = 'tutoriel.html';
    }
}

// Initialiser les pièces
let pieces = parseInt(localStorage.getItem('pieces')) || 0;
if (document.getElementById('pieces')) {
    document.getElementById('pieces').textContent = pieces;
}

document.getElementById('valider').addEventListener('click', function() {
    const nom = document.getElementById('nom').value;
    if (nom.trim() !== '') {
        // Enlever les espaces et afficher le nom
        const nomSansEspaces = nom.trim();
        document.getElementById('nom-affiche').textContent = nomSansEspaces;
        
        // Sauvegarder dans localStorage
        localStorage.setItem('nomJoueur', nomSansEspaces);
        
        // Appliquer la couleur sauvegardée
        const couleurSauvee = localStorage.getItem('couleurNom');
        if (couleurSauvee) {
            document.getElementById('nom-affiche').style.background = couleurSauvee;
        }
        
        // Cacher le champ et le bouton
        document.getElementById('nom').style.display = 'none';
        document.getElementById('valider').style.display = 'none';
        
        // Afficher le nom
        document.getElementById('nom-affiche').style.display = 'block';
    }
});

// Cliquer sur le nom pour le modifier
document.getElementById('nom-affiche').addEventListener('click', function() {
    // Réafficher le champ et le bouton
    document.getElementById('nom').style.display = 'block';
    document.getElementById('valider').style.display = 'block';
    document.getElementById('nom').value = this.textContent;
    
    // Cacher le nom affiché
    this.style.display = 'none';
    
    // Focus sur le champ
    document.getElementById('nom').focus();
});

// Charger le nom et la couleur au démarrage
window.addEventListener('DOMContentLoaded', function() {
    const nomStocke = localStorage.getItem('nomJoueur');
    const couleurSauvee = localStorage.getItem('couleurNom');
    
    // Donner 100 pièces de départ si nouveau joueur
    if (!localStorage.getItem('piecesInitialisees')) {
        pieces = 100;
        localStorage.setItem('pieces', pieces.toString());
        localStorage.setItem('piecesInitialisees', 'true');
        if (document.getElementById('pieces')) {
            document.getElementById('pieces').textContent = pieces;
        }
    }
    
    if (nomStocke && document.getElementById('nom-affiche')) {
        document.getElementById('nom-affiche').textContent = nomStocke;
        document.getElementById('nom-affiche').style.display = 'block';
        document.getElementById('nom').style.display = 'none';
        document.getElementById('valider').style.display = 'none';
        
        if (couleurSauvee) {
            document.getElementById('nom-affiche').style.background = couleurSauvee;
        }
    }
    
    // Afficher le type d'appareil
    const typeAppareil = localStorage.getItem('typeAppareil');
    const appareilIcon = document.getElementById('appareil-icon');
    const appareilText = document.getElementById('appareil-text');
    
    if (typeAppareil && appareilIcon && appareilText) {
        if (typeAppareil === 'ordinateur') {
            appareilIcon.textContent = '💻';
            appareilText.textContent = 'Ordinateur';
        } else if (typeAppareil === 'telephone') {
            appareilIcon.textContent = '📱';
            appareilText.textContent = 'Téléphone';
        }
    }
});

// Fonction pour afficher un message du robot
function afficherMessageRobot(message, duree = 3000) {
    const messageEl = document.getElementById('robot-message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.classList.add('show');
        
        setTimeout(() => {
            messageEl.classList.remove('show');
        }, duree);
    }
}

// Gestion des boutons du menu
const menuBtns = document.querySelectorAll('.menu-btn');
menuBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        if (this.textContent === 'Profil') {
            // Marquer que l'utilisateur a vu le profil (désactive le mode tutoriel)
            localStorage.setItem('aVuProfil', 'true');
            
            // Désactiver le mode tutoriel
            document.body.classList.remove('tutorial-mode');
            
            // Rediriger directement sans message
            window.location.href = 'profil.html';
        } else if (this.textContent === 'Bonus') {
            window.location.href = 'bonus.html';
        } else if (this.textContent === 'Ami') {
            window.location.href = 'ami.html';
        } else if (this.textContent === 'Quête') {
            window.location.href = 'quete.html';
        } else if (this.textContent === 'Ma base') {
            window.location.href = 'base.html';
        }
    });
});

// Activer le mode tutoriel au chargement
window.addEventListener('load', () => {
    // Vérifier si c'est la première visite après le tutoriel
    const premiereFoisIndex = !localStorage.getItem('aVuProfil');
    
    if (premiereFoisIndex) {
        // Activer le mode blur
        document.body.classList.add('tutorial-mode');
        
        // Afficher le message du robot
        const robotMessage = document.getElementById('robot-message');
        if (robotMessage) {
            const nomJoueur = localStorage.getItem('nomJoueur') || 'champion';
            robotMessage.textContent = `${nomJoueur}, clique sur PROFIL pour voir ton compte ! 👆`;
            setTimeout(() => {
                robotMessage.classList.add('show');
            }, 500);
        }
        
        // Entourer le bouton Profil
        const profilBtn = document.querySelector('.menu-btn');
        if (profilBtn && profilBtn.textContent === 'Profil') {
            setTimeout(() => {
                profilBtn.classList.add('highlight');
            }, 500);
        }
    }
});