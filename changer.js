// Éléments du DOM
const btnOrdinateur = document.getElementById('btn-ordinateur');
const btnTelephone = document.getElementById('btn-telephone');
const checkOrdinateur = document.getElementById('check-ordinateur');
const checkTelephone = document.getElementById('check-telephone');
const iconActuel = document.getElementById('icon-actuel');
const textActuel = document.getElementById('text-actuel');
const messageConfirmation = document.getElementById('message-confirmation');

// Fonction pour afficher l'appareil actuel
function afficherAppareilActuel() {
    const typeAppareil = localStorage.getItem('typeAppareil');
    
    if (typeAppareil === 'ordinateur') {
        iconActuel.textContent = '💻';
        textActuel.textContent = 'Ordinateur';
        btnOrdinateur.classList.add('selected');
    } else if (typeAppareil === 'telephone') {
        iconActuel.textContent = '📱';
        textActuel.textContent = 'Téléphone';
        btnTelephone.classList.add('selected');
    }
}

// Fonction pour changer d'appareil
function changerAppareil(nouveauType) {
    const ancienType = localStorage.getItem('typeAppareil');
    
    // Ne rien faire si c'est le même appareil
    if (ancienType === nouveauType) {
        return;
    }
    
    // Sauvegarder le nouveau type
    localStorage.setItem('typeAppareil', nouveauType);
    
    // Mettre à jour l'affichage
    btnOrdinateur.classList.remove('selected');
    btnTelephone.classList.remove('selected');
    
    if (nouveauType === 'ordinateur') {
        btnOrdinateur.classList.add('selected');
        iconActuel.textContent = '💻';
        textActuel.textContent = 'Ordinateur';
    } else {
        btnTelephone.classList.add('selected');
        iconActuel.textContent = '📱';
        textActuel.textContent = 'Téléphone';
    }
    
    // Afficher le message de confirmation
    messageConfirmation.classList.add('show');
    
    // Cacher le message après 2.5 secondes
    setTimeout(() => {
        messageConfirmation.classList.remove('show');
    }, 2500);
}

// Gestion des clics
btnOrdinateur.addEventListener('click', () => {
    changerAppareil('ordinateur');
});

btnTelephone.addEventListener('click', () => {
    changerAppareil('telephone');
});

// Initialisation au chargement
window.addEventListener('DOMContentLoaded', () => {
    afficherAppareilActuel();
});
