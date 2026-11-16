// Initialisierung: Nur auf 'false' setzen, wenn noch gar kein Wert existiert!
if (sessionStorage.getItem('isLoggedIn') === null) {
    sessionStorage.setItem('isLoggedIn', 'false');
}

// Hilfsfunktionen, damit du nicht ständig mit Strings ('true'/'false') hantieren musst
const Auth = {
    isLoggedIn() {
        return sessionStorage.getItem('isLoggedIn') === 'true';
    },
    login() {
        sessionStorage.setItem('isLoggedIn', 'true');
    },
    logout() {
        sessionStorage.setItem('isLoggedIn', 'false');
    }
};

Auth.isLoggedIn();

//let isLoggedIn = true;
//sessionStorage.setItem('isLoggedIn', 'true');