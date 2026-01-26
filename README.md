# 🍽️ Meal Reservation - Odwoływanie Posiłków

Aplikacja do zarządzania odwołaniami posiłków szkolnych dla dzieci.

## Funkcje

- **Panel Administratora**: zarządzanie dziećmi, ustawieniami, raportami
- **Panel Rodzica**: odwoływanie posiłków dla swojego dziecka
- **Raporty miesięczne**: CSV z rozliczeniami
- **Synchronizacja w chmurze**: dane dostępne z dowolnego urządzenia

## 🔥 Konfiguracja Firebase

### Krok 1: Utwórz projekt Firebase

1. Wejdź na [Firebase Console](https://console.firebase.google.com/)
2. Kliknij **"Create a project"** (Utwórz projekt)
3. Wpisz nazwę projektu (np. `meal-reservation`)
4. Wyłącz Google Analytics (opcjonalnie) → **Create project**

### Krok 2: Dodaj aplikację webową

1. W konsoli Firebase, kliknij ikonę **</>** (Web)
2. Wpisz nazwę aplikacji (np. `meal-reservation-web`)
3. ❌ NIE zaznaczaj "Firebase Hosting"
4. Kliknij **Register app**
5. Skopiuj obiekt `firebaseConfig`

### Krok 3: Skonfiguruj Firestore

1. W menu bocznym: **Build → Firestore Database**
2. Kliknij **Create database**
3. Wybierz lokalizację (np. `europe-central2` dla Polski)
4. Wybierz **Start in test mode** (na początek)
5. Kliknij **Enable**

### Krok 4: Ustaw reguły bezpieczeństwa

W zakładce **Rules** wklej:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Pozwól na odczyt/zapis dla wszystkich (do testów)
    // W produkcji należy to ograniczyć!
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **UWAGA**: Te reguły są otwarte. Dla produkcji rozważ ograniczenie dostępu.

### Krok 5: Zaktualizuj konfigurację w aplikacji

Edytuj plik `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIza...',           // Twój apiKey
    authDomain: 'twoj-projekt.firebaseapp.com',
    projectId: 'twoj-projekt',
    storageBucket: 'twoj-projekt.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abc123'
  }
};
```

I analogicznie `src/environments/environment.prod.ts` dla produkcji.

### Krok 6: Utwórz indeksy Firestore

Po pierwszym uruchomieniu aplikacji, w konsoli przeglądarki mogą pojawić się błędy o brakujących indeksach. Kliknij link w błędzie, aby automatycznie utworzyć indeks.

## Uruchomienie

```bash
npm install
npm start
```

Aplikacja będzie dostępna na http://localhost:4200

## Deployment na GitHub Pages

```bash
npm run build
npx angular-cli-ghpages --dir=dist/meal-reservation/browser
```

## Logowanie

- **Admin**: PIN `1234` (domyślny)
- **Rodzic**: kod dostępu przypisany przez admina