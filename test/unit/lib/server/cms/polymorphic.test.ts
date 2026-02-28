import { describe, expect, it } from 'vitest';
import {
  POLYMORPHIC_MODEL_NAMES,
  modelTypeToKind,
  likeableKind,
  commentableKind,
  kindToModelType,
  isValidModelType,
  isValidKind,
  isLikeableKind,
  isCommentableKind,
  getKindLabel,
  getKindLabelPlural,
  bulkModelTypeToKind,
} from '@/lib/server/cms/polymorphic';

describe('polymorphic type mappings', () => {
  // ============================================================================
  // POLYMORPHIC_MODEL_NAMES Constants
  // ============================================================================

  describe('POLYMORPHIC_MODEL_NAMES', () => {
    it('has all required model names', () => {
      expect(POLYMORPHIC_MODEL_NAMES.POST).toBe('App\\Models\\Post');
      expect(POLYMORPHIC_MODEL_NAMES.PET).toBe('App\\Models\\Pet');
      expect(POLYMORPHIC_MODEL_NAMES.COMMENT).toBe('App\\Models\\Comment');
      expect(POLYMORPHIC_MODEL_NAMES.USER).toBe('App\\Models\\User');
    });

    it('has exactly 4 model names', () => {
      expect(Object.keys(POLYMORPHIC_MODEL_NAMES)).toHaveLength(4);
    });

    it('all model names follow Laravel convention', () => {
      Object.values(POLYMORPHIC_MODEL_NAMES).forEach((name) => {
        expect(name).toMatch(/^App\\Models\\\w+$/);
      });
    });
  });

  // ============================================================================
  // modelTypeToKind - DB Type → Kind
  // ============================================================================

  describe('modelTypeToKind', () => {
    it('converts App\\Models\\Post to post', () => {
      expect(modelTypeToKind('App\\Models\\Post')).toBe('post');
    });

    it('converts App\\Models\\Pet to pet', () => {
      expect(modelTypeToKind('App\\Models\\Pet')).toBe('pet');
    });

    it('converts App\\Models\\Comment to comment', () => {
      expect(modelTypeToKind('App\\Models\\Comment')).toBe('comment');
    });

    it('returns unknown for unrecognized types', () => {
      expect(modelTypeToKind('App\\Models\\Unknown')).toBe('unknown');
      expect(modelTypeToKind('InvalidType')).toBe('unknown');
      expect(modelTypeToKind('')).toBe('unknown');
    });

    it('handles case-insensitive ending match', () => {
      expect(modelTypeToKind('SomeNamespace\\Post')).toBe('post');
      expect(modelTypeToKind('Some\\Pet')).toBe('pet');
    });
  });

  // ============================================================================
  // likeableKind - Alias for modelTypeToKind
  // ============================================================================

  describe('likeableKind', () => {
    it('works as alias for modelTypeToKind', () => {
      expect(likeableKind('App\\Models\\Post')).toBe('post');
      expect(likeableKind('App\\Models\\Pet')).toBe('pet');
      expect(likeableKind('App\\Models\\Comment')).toBe('comment');
    });

    it('returns unknown for invalid types', () => {
      expect(likeableKind('App\\Models\\Gallery')).toBe('unknown');
    });
  });

  // ============================================================================
  // commentableKind - Specific for Comment parent types
  // ============================================================================

  describe('commentableKind', () => {
    it('converts post type correctly', () => {
      expect(commentableKind('App\\Models\\Post')).toBe('post');
    });

    it('converts pet type correctly', () => {
      expect(commentableKind('App\\Models\\Pet')).toBe('pet');
    });

    it('returns unknown for comment type (cannot comment on comment)', () => {
      expect(commentableKind('App\\Models\\Comment')).toBe('unknown');
    });

    it('returns unknown for unrecognized types', () => {
      expect(commentableKind('App\\Models\\Unknown')).toBe('unknown');
    });
  });

  // ============================================================================
  // kindToModelType - Kind → DB Type (Inverse)
  // ============================================================================

  describe('kindToModelType', () => {
    it('converts post to App\\Models\\Post', () => {
      expect(kindToModelType('post')).toBe('App\\Models\\Post');
    });

    it('converts pet to App\\Models\\Pet', () => {
      expect(kindToModelType('pet')).toBe('App\\Models\\Pet');
    });

    it('converts comment to App\\Models\\Comment', () => {
      expect(kindToModelType('comment')).toBe('App\\Models\\Comment');
    });

    it('returns null for invalid kinds', () => {
      expect(kindToModelType('gallery')).toBeNull();
      expect(kindToModelType('invalid')).toBeNull();
      expect(kindToModelType('')).toBeNull();
    });

    it('handles unknown kind', () => {
      expect(kindToModelType('unknown')).toBeNull();
    });
  });

  // ============================================================================
  // Round-trip conversion
  // ============================================================================

  describe('round-trip conversion', () => {
    it('converts DB type to kind and back to DB type', () => {
      const originalDbType = 'App\\Models\\Post';
      const kind = modelTypeToKind(originalDbType);
      const convertedBack = kindToModelType(kind);
      expect(convertedBack).toBe(originalDbType);
    });

    it('works for all valid types', () => {
      const validTypes = [
        'App\\Models\\Post',
        'App\\Models\\Pet',
        'App\\Models\\Comment',
      ];

      validTypes.forEach((dbType) => {
        const kind = modelTypeToKind(dbType);
        expect(kind).not.toBe('unknown');
        const convertedBack = kindToModelType(kind);
        expect(convertedBack).toBe(dbType);
      });
    });

    it('handles invalid types gracefully in round-trip', () => {
      const invalidType = 'App\\Models\\Invalid';
      const kind = modelTypeToKind(invalidType);
      expect(kind).toBe('unknown');
      const convertedBack = kindToModelType(kind);
      expect(convertedBack).toBeNull();
    });
  });

  // ============================================================================
  // isValidModelType - DB Type Validation
  // ============================================================================

  describe('isValidModelType', () => {
    it('returns true for valid model types', () => {
      expect(isValidModelType('App\\Models\\Post')).toBe(true);
      expect(isValidModelType('App\\Models\\Pet')).toBe(true);
      expect(isValidModelType('App\\Models\\Comment')).toBe(true);
      expect(isValidModelType('App\\Models\\User')).toBe(true);
    });

    it('returns false for invalid model types', () => {
      expect(isValidModelType('App\\Models\\Gallery')).toBe(false);
      expect(isValidModelType('InvalidType')).toBe(false);
      expect(isValidModelType('')).toBe(false);
    });
  });

  // ============================================================================
  // isValidKind - Kind Validation
  // ============================================================================

  describe('isValidKind', () => {
    it('returns true for valid kinds', () => {
      expect(isValidKind('post')).toBe(true);
      expect(isValidKind('pet')).toBe(true);
      expect(isValidKind('comment')).toBe(true);
    });

    it('returns false for invalid kinds', () => {
      expect(isValidKind('gallery')).toBe(false);
      expect(isValidKind('unknown')).toBe(false);
      expect(isValidKind('post ')).toBe(false); // trailing space
      expect(isValidKind('Post')).toBe(false); // uppercase
      expect(isValidKind('')).toBe(false);
    });
  });

  // ============================================================================
  // isLikeableKind - Can be liked?
  // ============================================================================

  describe('isLikeableKind', () => {
    it('returns true for all valid likeable types', () => {
      expect(isLikeableKind('post')).toBe(true);
      expect(isLikeableKind('pet')).toBe(true);
      expect(isLikeableKind('comment')).toBe(true);
    });

    it('returns false for unknown types', () => {
      expect(isLikeableKind('unknown')).toBe(false);
      expect(isLikeableKind('gallery')).toBe(false);
      expect(isLikeableKind('')).toBe(false);
    });
  });

  // ============================================================================
  // isCommentableKind - Can be commented on?
  // ============================================================================

  describe('isCommentableKind', () => {
    it('returns true for post and pet', () => {
      expect(isCommentableKind('post')).toBe(true);
      expect(isCommentableKind('pet')).toBe(true);
    });

    it('returns false for comment (cannot comment on comment)', () => {
      expect(isCommentableKind('comment')).toBe(false);
    });

    it('returns false for unknown types', () => {
      expect(isCommentableKind('unknown')).toBe(false);
      expect(isCommentableKind('gallery')).toBe(false);
      expect(isCommentableKind('')).toBe(false);
    });
  });

  // ============================================================================
  // getKindLabel - UI Labels (Singular)
  // ============================================================================

  describe('getKindLabel', () => {
    it('returns correct singular labels', () => {
      expect(getKindLabel('post')).toBe('Post');
      expect(getKindLabel('pet')).toBe('Pet');
      expect(getKindLabel('comment')).toBe('Comment');
    });

    it('returns "Unknown" for invalid kinds', () => {
      expect(getKindLabel('unknown')).toBe('Unknown');
      expect(getKindLabel('gallery')).toBe('Unknown');
      expect(getKindLabel('')).toBe('Unknown');
    });

    it('handles undefined gracefully', () => {
      expect(getKindLabel(undefined as any)).toBe('Unknown');
    });
  });

  // ============================================================================
  // getKindLabelPlural - UI Labels (Plural)
  // ============================================================================

  describe('getKindLabelPlural', () => {
    it('returns correct plural labels', () => {
      expect(getKindLabelPlural('post')).toBe('Posts');
      expect(getKindLabelPlural('pet')).toBe('Pets');
      expect(getKindLabelPlural('comment')).toBe('Comments');
    });

    it('returns "Items" for invalid kinds', () => {
      expect(getKindLabelPlural('unknown')).toBe('Items');
      expect(getKindLabelPlural('gallery')).toBe('Items');
      expect(getKindLabelPlural('')).toBe('Items');
    });
  });

  // ============================================================================
  // bulkModelTypeToKind - Batch Conversion
  // ============================================================================

  describe('bulkModelTypeToKind', () => {
    it('converts multiple types at once', () => {
      const types = [
        'App\\Models\\Post',
        'App\\Models\\Pet',
        'App\\Models\\Comment',
      ];
      const result = bulkModelTypeToKind(types);

      expect(result.get('App\\Models\\Post')).toBe('post');
      expect(result.get('App\\Models\\Pet')).toBe('pet');
      expect(result.get('App\\Models\\Comment')).toBe('comment');
    });

    it('returns map with all inputs', () => {
      const types = ['App\\Models\\Post', 'App\\Models\\Invalid'];
      const result = bulkModelTypeToKind(types);

      expect(result.size).toBe(2);
      expect(result.has('App\\Models\\Post')).toBe(true);
      expect(result.has('App\\Models\\Invalid')).toBe(true);
    });

    it('marks unknown types as unknown', () => {
      const types = ['App\\Models\\Post', 'App\\Models\\Gallery'];
      const result = bulkModelTypeToKind(types);

      expect(result.get('App\\Models\\Post')).toBe('post');
      expect(result.get('App\\Models\\Gallery')).toBe('unknown');
    });

    it('handles empty array', () => {
      const result = bulkModelTypeToKind([]);
      expect(result.size).toBe(0);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('integration scenarios', () => {
    it('simulates like creation workflow', () => {
      // 1. Determine what type to like
      const likeableType = 'App\\Models\\Post';

      // 2. Validate it can be liked
      const kind = likeableKind(likeableType);
      expect(isLikeableKind(kind)).toBe(true);

      // 3. Use in database
      expect(likeableType).toBe(POLYMORPHIC_MODEL_NAMES.POST);
    });

    it('simulates comment creation workflow', () => {
      // 1. Determine what to comment on
      const commentableType = 'App\\Models\\Pet';

      // 2. Validate it can be commented on
      const kind = commentableKind(commentableType);
      expect(isCommentableKind(kind)).toBe(true);

      // 3. Use in database
      expect(commentableType).toBe(POLYMORPHIC_MODEL_NAMES.PET);
    });

    it('simulates CMS filtering by type', () => {
      // User selects filter: "Posts"
      const userFilter = 'post';

      // 1. Validate input
      if (!isValidKind(userFilter)) {
        throw new Error('Invalid filter');
      }

      // 2. Convert to DB type for query
      const dbType = kindToModelType(userFilter);
      expect(dbType).toBe('App\\Models\\Post');

      // 3. Use in where clause
      const whereClause = { likeable_type: dbType };
      expect(whereClause.likeable_type).toBe('App\\Models\\Post');
    });

    it('prevents commenting on comment', () => {
      const userTriesToComment = commentableKind('App\\Models\\Comment');
      if (isCommentableKind(userTriesToComment)) {
        throw new Error('Should not be able to comment on comment');
      }
      expect(userTriesToComment).toBe('unknown');
    });

    it('handles bulk type conversion for query optimization', () => {
      const dbTypes = [
        'App\\Models\\Post',
        'App\\Models\\Post',
        'App\\Models\\Pet',
        'App\\Models\\Comment',
      ];

      const kindMap = bulkModelTypeToKind(dbTypes);

      // Group by kind for analytics
      const postCount = Array.from(kindMap.values()).filter((k) => k === 'post').length;
      const petCount = Array.from(kindMap.values()).filter((k) => k === 'pet').length;
      const commentCount = Array.from(kindMap.values()).filter((k) => k === 'comment').length;

      expect(postCount).toBe(1); // unique
      expect(petCount).toBe(1);
      expect(commentCount).toBe(1);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('handles null and undefined gracefully', () => {
      expect(() => modelTypeToKind(null as any)).toThrow();
      expect(() => modelTypeToKind(undefined as any)).toThrow();
    });

    it('handles whitespace in types', () => {
      expect(modelTypeToKind('App\\Models\\Post ')).toBe('post'); // trailing space - still matches with endsWith
      expect(modelTypeToKind(' App\\Models\\Post')).toBe('post'); // leading space - still matches with endsWith
    });

    it('handles case sensitivity', () => {
      expect(modelTypeToKind('app\\models\\post')).toBe('unknown'); // lowercase
      expect(modelTypeToKind('APP\\MODELS\\POST')).toBe('unknown'); // uppercase
    });

    it('handles different separators', () => {
      expect(modelTypeToKind('App/Models/Post')).toBe('unknown'); // forward slash
      expect(modelTypeToKind('AppModelsPost')).toBe('unknown'); // no separator
    });

    it('validates that conversion is bidirectional only for valid types', () => {
      // Valid type
      const validType = 'App\\Models\\Post';
      const kind = modelTypeToKind(validType);
      const backToType = kindToModelType(kind);
      expect(backToType).toBe(validType);

      // Invalid type
      const invalidType = 'App\\Models\\Gallery';
      const invalidKind = modelTypeToKind(invalidType);
      const invalidBack = kindToModelType(invalidKind);
      expect(invalidBack).toBeNull();
    });
  });
});

