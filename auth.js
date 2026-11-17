//Hilfsfunktionen Login

//alert("Login-Status: " + sessionStorage.getItem('isLoggedIn'))

if (sessionStorage.getItem('isLoggedIn') === null) {
    sessionStorage.setItem('isLoggedIn', 'false');
}

const Auth = {
    isLoggedIn() {
        return sessionStorage.getItem('isLoggedIn') === 'true';
    },
    login() { //zum Testen
        sessionStorage.setItem('isLoggedIn', 'true');
        alert('Du wurdest angemeldet.')
    },
    logout() { //zum Testen
        sessionStorage.setItem('isLoggedIn', 'false');
        sessionStorage.removeItem('citiesData');
        sessionStorage.removeItem('favoritesMap');
        alert('Du wurdest abgemeldet.')
    }
};

function logout(e) {
    e.preventDefault();
    Auth.logout();
}
//Auth.login();
//Auth.logout();