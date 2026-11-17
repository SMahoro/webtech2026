//Hilfsfunktionen Login

//alert("Login-Status: " + sessionStorage.getItem('isLoggedIn'))

if (sessionStorage.getItem('isLoggedIn') === null) {
    sessionStorage.setItem('isLoggedIn', 'false');
}

const Auth = {
    isLoggedIn() {
        return sessionStorage.getItem('isLoggedIn') === 'true';
    },
    login() {
        sessionStorage.setItem('isLoggedIn', 'true');
        alert('Du wurdest angemeldet.')
    },
    logout() {
        sessionStorage.setItem('isLoggedIn', 'false');
        sessionStorage.removeItem('citiesData');
        sessionStorage.removeItem('favoritesMap');
        alert('Du wurdest abgemeldet.')
    }
};

//Auth.login();
//Auth.logout();