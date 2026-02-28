/**
 * User-facing Messages and Error Messages
 */

export const MESSAGES = {
  // Success messages
  SUCCESS: {
    LOGIN: 'Úspěšně přihlášeno.',
    REGISTER: 'Účet vytvořen. Nyní jste přihlášeni.',
    LOGOUT: 'Odhlášeno.',
    UPDATE: 'Úpravy uloženy.',
    DELETE: 'Smazáno.',
    CREATED: 'Vytvořeno.',
  },

  // Error messages
  ERROR: {
    // Auth
    INVALID_CREDENTIALS: 'Neplatné přihlašovací údaje.',
    EMAIL_EXISTS: 'Účet s tímto emailem už existuje.',
    USER_NOT_FOUND: 'Uživatel nenalezen.',
    PASSWORD_MISMATCH: 'Hesla se neshodují.',
    WEAK_PASSWORD: 'Heslo je příliš slabé.',

    // Validation
    REQUIRED_FIELD: 'Toto pole je povinné.',
    INVALID_EMAIL: 'Neplatný email.',
    INVALID_SLUG: 'Neplatný slug.',

    // Files
    FILE_TOO_LARGE: 'Soubor je příliš velký.',
    INVALID_FILE_TYPE: 'Nepodporovaný typ souboru.',
    EMPTY_FILE: 'Soubor je prázdný.',

    // Pagination
    INVALID_PAGE: 'Neplatné číslo stránky.',

    // Database
    NOT_FOUND: 'Nenalezeno.',
    CONFLICT: 'Konflikt - položka již existuje.',
    DATABASE_ERROR: 'Chyba databáze.',

    // Server
    UNAUTHORIZED: 'Neautorizováno.',
    FORBIDDEN: 'Přístup zamítnut.',
    INTERNAL_ERROR: 'Interní chyba serveru.',
    RATE_LIMITED: 'Příliš mnoho pokusů. Zkuste později.',
  },

  // Info messages
  INFO: {
    LOADING: 'Načítání...',
    SAVING: 'Ukládám...',
    NO_RESULTS: 'Žádné výsledky.',
    CONFIRMING: 'Opravdu chcete smazat?',
  },
} as const;

