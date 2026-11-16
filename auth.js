//Hilfsfunktionen Login

if (sessionStorage.getItem('isLoggedIn') === null) {
    sessionStorage.setItem('isLoggedIn', 'false');
}

const Auth = {
    isLoggedIn() {
        return sessionStorage.getItem('isLoggedIn') === 'true';
    },
    login() {
        sessionStorage.setItem('isLoggedIn', 'true');
    },
    logout() {
        sessionStorage.setItem('isLoggedIn', 'false');
        sessionStorage.removeItem('citiesData');
        sessionStorage.removeItem('favoritesMap');
    }
};

Auth.isLoggedIn();
