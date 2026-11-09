# LadeSpot.de
Dieser kleine Webdienst soll das Finden von E-Auto-Ladesäulen erleichtern.
Favoriten sollen nach dem Einloggen speicherbar sein.
Als Umfangerweiterung steht das Anzeigen von Verfügbarkeiten im Raum.

Um die Map darstellen zu können braucht es einen lokalen Server.
Der lässt sich über das Terminal in VS Code mittels:
```
python -m http.server 8000
```
starten. Im Browser ist er dann mit der Adresse:
```
localhost:8000
```
erreichbar.
