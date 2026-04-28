// Variables globales
const dialogueElement = document.getElementById('dialogue-text');
const nomContainer = document.getElementById('nom-container');
const nomInput = document.getElementById('nom-input');
const validerBtn = document.getElementById('valider-btn');

let currentText = '';
let isTyping = false;

// Messages du tutoriel
const messages = [
    "Bonjour je suis Pixi. Je vais te guider dans ce jeu.",
    "On commence par choisir ton nom :"
];

// Fonction pour écrire le texte lettre par lettre
function typeWriter(text, callback) {
    isTyping = true;
    currentText = '';
    dialogueElement.textContent = '';
    
    let index = 0;
    const interval = setInterval(() => {
        if (index < text.length) {
            currentText += text[index];
            dialogueElement.textContent = currentText;
            index++;
        } else {
            clearInterval(interval);
            isTyping = false;
            
            // Retirer le curseur clignotant à la fin
            setTimeout(() => {
                dialogueElement.style.removeProperty('--show-cursor');
            }, 100);
            
            if (callback) {
                callback();
            }
        }
    }, 50); // 0.05s par lettre = 50ms
}

// Démarrer le tutoriel
function startTutoriel() {
    // Premier message
    typeWriter(messages[0], () => {
        // Attendre 2 secondes après la fin du premier message
        setTimeout(() => {
            // Deuxième message
            typeWriter(messages[1], () => {
                // Attendre 2 secondes puis afficher l'input
                setTimeout(() => {
                    nomContainer.style.display = 'flex';
                    nomInput.focus();
                }, 2000);
            });
        }, 2000);
    });
}

// Gestion du bouton valider
validerBtn.addEventListener('click', validerNom);

// Valider avec la touche Entrée
nomInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        validerNom();
    }
});

function validerNom() {
    const nom = nomInput.value.trim();
    
    if (nom === '') {
        // Animation d'erreur
        nomInput.style.borderColor = 'red';
        nomInput.placeholder = 'Entre un nom !';
        setTimeout(() => {
            nomInput.style.borderColor = 'white';
        }, 500);
        return;
    }
    
    // Sauvegarder le nom dans localStorage
    localStorage.setItem('nomJoueur', nom);
    
    // Marquer que le tutoriel est fait
    localStorage.setItem('tutorielFait', 'true');
    
    // NE PAS définir 'aVuProfil' pour activer le mode blur sur index
    localStorage.removeItem('aVuProfil');
    
    // Cacher l'input
    nomContainer.style.display = 'none';
    
    // Message final
    const messageFinal = `Super ${nom}, on commence.`;
    typeWriter(messageFinal, () => {
        // Attendre 1.5 secondes puis rediriger
        setTimeout(() => {
            // Redirection directe sans animation
            window.location.href = 'index.html';
        }, 1500);
    });
}

// Démarrer au chargement de la page (toujours afficher le tuto pour voir l'évolution)
window.addEventListener('DOMContentLoaded', () => {
    // Petit délai pour l'animation d'entrée
    setTimeout(() => {
        startTutoriel();
    }, 500);
});