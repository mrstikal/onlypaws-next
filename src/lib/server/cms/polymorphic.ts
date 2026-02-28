/**
 * Centrální modul pro mapování polymorfních typů (Like, Comment).
 * Zdrojem pravdy pro konverze mezi DB typy a aplikačními "kind" identifikátory.
 */

// ============================================================================
// Model Names (DB constants) - Zdroj Pravdy
// ============================================================================

export const POLYMORPHIC_MODEL_NAMES = {
  POST: 'App\\Models\\Post',
  PET: 'App\\Models\\Pet',
  COMMENT: 'App\\Models\\Comment',
  USER: 'App\\Models\\User',
} as const;

// ============================================================================
// Kind Type - typ pro aplikační reprezentaci
// ============================================================================

export type PolymorphicKind = 'post' | 'pet' | 'comment';

// ============================================================================
// Konverze DB Type → Kind
// ============================================================================

/**
 * Převede DB typ (modelType) na aplikační "kind" identifikátor.
 * Funkce je idempotentní a vždy vrátí definovaný kind.
 *
 * @param modelType - DB typ (např. 'App\\Models\\Post')
 * @param context - volitelný context pro lepší error handling
 * @returns PolymorphicKind nebo 'unknown'
 */
export function modelTypeToKind(modelType: string): PolymorphicKind | 'unknown' {
  const trimmed = modelType.trim();
  if (trimmed.endsWith('\\Post')) return 'post';
  if (trimmed.endsWith('\\Pet')) return 'pet';
  if (trimmed.endsWith('\\Comment')) return 'comment';
  return 'unknown';
}

/**
 * Alias pro modelTypeToKind - krátký název pro likeable typy.
 */
export function likeableKind(likeableType: string): PolymorphicKind | 'unknown' {
  return modelTypeToKind(likeableType);
}

/**
 * Alias pro modelTypeToKind - krátký název pro commentable typy.
 * Poznámka: Comment nemusí být commentable, ale je likeable.
 */
export function commentableKind(commentableType: string): Exclude<PolymorphicKind, 'comment'> | 'unknown' {
  const kind = modelTypeToKind(commentableType);
  // Comment může být likeable, ale ne commentable
  if (kind === 'comment') return 'unknown';
  return kind as Exclude<PolymorphicKind, 'comment'> | 'unknown';
}

// ============================================================================
// Konverze Kind → DB Type
// ============================================================================

/**
 * Převede aplikační "kind" na DB typ.
 * Vždy vrátí validní model typ nebo null.
 *
 * @param kind - 'post' | 'pet' | 'comment'
 * @returns Model typ nebo null
 */
export function kindToModelType(kind: string | PolymorphicKind): string | null {
  switch (kind) {
    case 'post':
      return POLYMORPHIC_MODEL_NAMES.POST;
    case 'pet':
      return POLYMORPHIC_MODEL_NAMES.PET;
    case 'comment':
      return POLYMORPHIC_MODEL_NAMES.COMMENT;
    default:
      return null;
  }
}

// ============================================================================
// Validace a Kontroly
// ============================================================================

/**
 * Kontroluje, zda je typ validní DB typ.
 */
export function isValidModelType(modelType: string): boolean {
  return (Object.values(POLYMORPHIC_MODEL_NAMES) as string[]).includes(modelType);
}

/**
 * Kontroluje, zda je typ validní kind.
 */
export function isValidKind(kind: string): kind is PolymorphicKind {
  return kind === 'post' || kind === 'pet' || kind === 'comment';
}

/**
 * Kontroluje, zda lze daný kind likovat.
 * (Všechny typy mohou být liked)
 */
export function isLikeableKind(kind: string | PolymorphicKind | 'unknown'): kind is PolymorphicKind {
  return isValidKind(kind);
}

/**
 * Kontroluje, zda lze daný kind komentovat.
 * (Jen post a pet mohou být commented)
 */
export function isCommentableKind(kind: string): kind is Exclude<PolymorphicKind, 'comment'> {
  return kind === 'post' || kind === 'pet';
}

// ============================================================================
// UI Labels a Helpers
// ============================================================================

/**
 * Vrátí lidsky čitelný label pro kind.
 */
export function getKindLabel(kind: string | PolymorphicKind | 'unknown'): string {
  switch (kind) {
    case 'post':
      return 'Post';
    case 'pet':
      return 'Pet';
    case 'comment':
      return 'Comment';
    default:
      return 'Unknown';
  }
}

/**
 * Vrátí pluralizovaný label.
 */
export function getKindLabelPlural(kind: string | PolymorphicKind | 'unknown'): string {
  switch (kind) {
    case 'post':
      return 'Posts';
    case 'pet':
      return 'Pets';
    case 'comment':
      return 'Comments';
    default:
      return 'Items';
  }
}

// ============================================================================
// Batch Konverze
// ============================================================================

/**
 * Skupinově převede seznam modelTypes na kinds.
 * Vrátí mapu modelType → kind.
 */
export function bulkModelTypeToKind(modelTypes: string[]): Map<string, PolymorphicKind | 'unknown'> {
  const result = new Map<string, PolymorphicKind | 'unknown'>();
  for (const modelType of modelTypes) {
    result.set(modelType, modelTypeToKind(modelType));
  }
  return result;
}

