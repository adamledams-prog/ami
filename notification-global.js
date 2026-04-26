// Système de notification global pour les invitations de partie
// À inclure dans toutes les pages

(function() {
    'use strict';
    
    // Attendre que le DOM soit chargé
    function initialiser() {
        // Vérifier si Firebase est chargé
        function attendreFirebase(callback) {
            if (window.firebaseDB && window.firebaseRef && window.firebaseOnValue && window.firebaseSet) {
                callback();
            } else {
                setTimeout(() => attendreFirebase(callback), 500);
            }
        }
        
        // Créer la div de notification si elle n'existe pas
        if (!document.getElementById('notification-partie-global')) {
            const notifDiv = document.createElement('div');
            notifDiv.id = 'notification-partie-global';
            notifDiv.className = 'notification-partie-global';
            notifDiv.style.display = 'none';
            notifDiv.innerHTML = `
                <div class="notif-global-contenu">
                    <p id="notif-global-message"></p>
                    <div id="notif-global-timer" style="font-size: 24px; font-weight: bold; margin: 10px 0;"></div>
                    <div class="notif-global-actions">
                        <button id="btn-accepter-global" class="btn-accepter">✓ Accepter</button>
                        <button id="btn-refuser-global" class="btn-refuser">✗ Refuser</button>
                    </div>
                </div>
            `;
            document.body.appendChild(notifDiv);
        }
        
        // Écouter les invitations de partie
        attendreFirebase(() => {
            const monCode = localStorage.getItem('monCodeAmi');
            if (!monCode) return;
            
            const invitationsRef = window.firebaseRef(window.firebaseDB, 'invitations_partie/' + monCode);
            
            window.firebaseOnValue(invitationsRef, (snapshot) => {
                const invitations = snapshot.val();
                if (invitations) {
                    const keys = Object.keys(invitations);
                    const lastKey = keys[keys.length - 1];
                    const lastInvit = invitations[lastKey];
                    
                    const lastSeenInvit = localStorage.getItem('lastSeenInvitPartie');
                    if (lastKey !== lastSeenInvit) {
                        localStorage.setItem('lastSeenInvitPartie', lastKey);
                        afficherNotificationGlobale(lastInvit);
                    }
                }
            });
        });
    }
    
    // Appeler l'initialisation quand le DOM est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialiser);
    } else {
        initialiser();
    }
    
    // Afficher la notification
    function afficherNotificationGlobale(invitation) {
        const notifDiv = document.getElementById('notification-partie-global');
        const messageEl = document.getElementById('notif-global-message');
        const timerEl = document.getElementById('notif-global-timer');
        
        messageEl.textContent = `🎮 ${invitation.de} lance une partie !`;
        notifDiv.style.display = 'flex';
        
        const endTime = invitation.startTime;
        
        function updateTimer() {
            const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            timerEl.textContent = `⏱️ ${remaining}s`;
            
            if (remaining > 0) {
                window.timerPartieGlobal = setTimeout(updateTimer, 100);
            } else {
                notifDiv.style.display = 'none';
                clearTimeout(window.timerPartieGlobal);
            }
        }
        
        updateTimer();
        
        document.getElementById('btn-accepter-global').onclick = function() {
            accepterPartieGlobal(invitation);
        };
        
        document.getElementById('btn-refuser-global').onclick = function() {
            refuserPartieGlobal(invitation);
        };
    }
    
    // Accepter la partie
    function accepterPartieGlobal(invitation) {
        const notifDiv = document.getElementById('notification-partie-global');
        notifDiv.style.display = 'none';
        clearTimeout(window.timerPartieGlobal);
        
        const monCode = localStorage.getItem('monCodeAmi');
        const nomJoueur = localStorage.getItem('nomJoueur') || 'Joueur';
        
        const sessionRef = window.firebaseRef(window.firebaseDB, 'sessions_partie/' + invitation.sessionId);
        
        window.firebaseOnValue(sessionRef, (snapshot) => {
            const session = snapshot.val();
            let estMeurtrier = false;
            
            if (session && session.codeMeurtrier === 'pending') {
                estMeurtrier = true;
                const meurtifierRef = window.firebaseRef(window.firebaseDB, 'sessions_partie/' + invitation.sessionId + '/codeMeurtrier');
                window.firebaseSet(meurtifierRef, monCode);
            }
            
            localStorage.setItem('sessionPartieId', invitation.sessionId);
            localStorage.setItem('monRole', estMeurtrier ? 'murderer' : 'innocent');
            
            const participantRef = window.firebaseRef(window.firebaseDB, 'sessions_partie/' + invitation.sessionId + '/participants/' + monCode);
            window.firebaseSet(participantRef, {
                nom: nomJoueur,
                accepte: true,
                timestamp: Date.now()
            });
            
            const waitTime = invitation.startTime - Date.now();
            
            setTimeout(() => {
                window.location.href = 'game.html';
            }, Math.max(0, waitTime));
            
            alert('✅ Accepté ! Lancement dans quelques secondes...');
        }, { onlyOnce: true });
    }
    
    // Refuser la partie
    function refuserPartieGlobal(invitation) {
        const notifDiv = document.getElementById('notification-partie-global');
        notifDiv.style.display = 'none';
        clearTimeout(window.timerPartieGlobal);
    }
})();
