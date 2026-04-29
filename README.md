# Sistema de Gestió de Biblioteca

Aquest projecte és una aplicació web per a la gestió d'una biblioteca escolar, que permet administrar llibres, usuaris (alumnes i professors), préstecs i configuracions administratives.

## 🚀 Arquitectura de JavaScript

El projecte està organitzat en mòduls especialitzats per facilitar el manteniment i l'escalabilitat:

### 📁 Fitxers Principals
- **`main.js`**: El punt d'entrada de l'aplicació. Coordina la inicialització, configura els *event listeners* globals i gestiona el renderitzat inicial quan les dades estan llestes.
- **`data.js`**: Capa de dades. Gestiona la comunicació amb **Firebase Firestore**, manté un estat local per a un rendiment ràpid i sincronitza els canvis entre la UI i la base de dades.
- **`utils.js`**: Utilitats genèriques. Conté funcions de format de dates, cercadors de dades transversals i la lògica base per a la creació de modals.

### 🖼️ UI i Renderitzat
- **`tables.js`**: Lògica de les taules de dades (Llibres, Usuaris, Préstecs). Inclou filtratge dinàmic, paginació i renderitzat de files amb accions contextuals.
- **`dashboard.js`**: Gestiona els ginys del tauler principal, incloent comptadors d'estadístiques, la llista de préstecs vençuts i el gràfic de categories populars.
- **`modals.js`**: Controlador de totes les finestres modals. Gestiona els formularis d'alta i edició, detalls d'entitats i diàlegs de confirmació.
- **`search.js`**: Implementa la cerca global que permet trobar ràpidament llibres, alumnes o préstecs des de qualsevol part de l'aplicació.

### 🛠️ Funcionalitats Específiques
- **`import.js`**: Lògica per a la importació massiva de dades des de fitxers **CSV**, amb validació i autocompletat de dades de llibres via API.
- **`extra.js`**: Gestiona la pàgina de configuracions administratives (armaris, idiomes, matèries i gèneres).
- **`email-config.js`**: Configuració per al servei **EmailJS**, utilitzat per enviar reclamacions de préstecs vençuts.
- **`firebase-config.js`**: Credencials i configuració de connexió amb Firebase.

## 💡 Detalls Importants

1.  **Sincronització en Temps Real**: L'aplicació utilitza un patró de "UI Cache". Les dades es carreguen de Firestore a l'inici i es mantenen en un objecte `state` global per a un accés instantani, sincronitzant-se en segon pla en realitzar accions.
2.  **Compatibilitat Global**: Moltes funcions s'exposen a l'objecte `window` per permetre la comunicació entre mòduls ES i scripts tradicionals, assegurant que els triggers de l'HTML funcionin correctament.
3.  **Seguretat Conservadora**: S'han implementat validacions en els formularis per evitar dades inconsistents i modals de confirmació per a accions crítiques (com eliminar o bloquejar).
4.  **Integració amb APIs Externes**: Utilitza l'API d'**OpenLibrary** per autocompletar informació de llibres a partir de l'ISBN, minimitzant la introducció manual de dades.