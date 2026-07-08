const REQUIRED_FIELDS = Object.freeze([
  'id',
  'name',
  'version',
  'author',
  'description',
  'minAppVersion',
  'colorScheme',
  'features',
  'previewFixtures',
  'signatureFeatureIds',
]);

export function assertThemeDefinition(definition) {
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    throw new Error('theme definition must be an object.');
  }

  const missing = REQUIRED_FIELDS.filter((field) => definition[field] === undefined);
  if (missing.length) {
    throw new Error(`${definition.id ?? 'theme'} definition is missing fields: ${missing.join(', ')}`);
  }

  if (definition.colorScheme !== 'system') {
    throw new Error(`${definition.id} official theme definition must use colorScheme=system.`);
  }
  if (!Array.isArray(definition.features) || definition.features.length < 7) {
    throw new Error(`${definition.id} definition must include feature coverage.`);
  }
  if (!Array.isArray(definition.previewFixtures) || definition.previewFixtures.length < 7) {
    throw new Error(`${definition.id} definition must include preview fixtures.`);
  }
  if (!Array.isArray(definition.signatureFeatureIds) || definition.signatureFeatureIds.length < 3) {
    throw new Error(`${definition.id} definition must include signature feature ids.`);
  }
}
