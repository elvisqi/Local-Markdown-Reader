import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ECOSYSTEMS = new Set(['obsidian', 'vscode']);
const COLOR_SCHEMES = new Set(['light', 'dark', 'system']);
const LICENSE_STATUSES = new Set(['needs-review', 'permissive', 'restricted', 'unknown']);
const USAGE_STATUSES = new Set(['inspiration-only', 'adaptable', 'blocked']);
const REVIEW_STATUSES = new Set(['candidate', 'shortlisted', 'converted', 'rejected']);
const ID_PATTERN = /^(obsidian|vscode):[a-z0-9][a-z0-9._-]{1,80}$/;
const SOURCE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,80}$/;
const TAG_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;
const MAX_TAGS = 12;
const MAX_FIELD_LENGTH = 240;

export async function loadThemeReferenceCatalog({ rootDir = process.cwd() } = {}) {
  const catalogPath = resolve(rootDir, 'themes', 'references', 'catalog.json');
  const catalog = parseJson(await readFile(catalogPath, 'utf8'), catalogPath);

  return normalizeCatalog(catalog);
}

export async function verifyThemeReferenceCatalog({ rootDir = process.cwd() } = {}) {
  const catalog = await loadThemeReferenceCatalog({ rootDir });

  return {
    sources: catalog.sources.length,
    candidates: catalog.candidates.length,
    target: catalog.target.total,
  };
}

export async function main(argv = process.argv.slice(2), rootDir = process.cwd()) {
  const options = parseArgs(argv, rootDir);
  const result = await verifyThemeReferenceCatalog({ rootDir: options.rootDir });
  console.log(`theme references verified: ${result.candidates}/${result.target} candidates, ${result.sources} sources`);
}

function normalizeCatalog(input) {
  if (!isPlainObject(input)) {
    throw new Error('themes/references/catalog.json must be a JSON object.');
  }

  const version = normalizePositiveInteger(input.version, 'catalog version');
  const updatedAt = normalizeRequiredString(input.updatedAt, 'catalog updatedAt');
  const target = normalizeTarget(input.target);
  const sources = normalizeSources(input.sources);
  const candidates = normalizeCandidates(input.candidates, sources);

  return {
    version,
    updatedAt,
    target,
    sources,
    candidates,
  };
}

function normalizeTarget(input) {
  if (!isPlainObject(input)) {
    throw new Error('catalog target must be a JSON object.');
  }

  const total = normalizePositiveInteger(input.total, 'target total');
  if (!isPlainObject(input.perEcosystem)) {
    throw new Error('target perEcosystem must be a JSON object.');
  }

  const perEcosystem = {};
  let sum = 0;
  for (const ecosystem of ECOSYSTEMS) {
    const count = normalizePositiveInteger(input.perEcosystem[ecosystem], `target ${ecosystem}`);
    perEcosystem[ecosystem] = count;
    sum += count;
  }

  if (sum !== total) {
    throw new Error(`target perEcosystem sum ${sum} must equal target total ${total}.`);
  }

  return {
    total,
    perEcosystem,
  };
}

function normalizeSources(input) {
  if (!Array.isArray(input) || !input.length) {
    throw new Error('catalog sources must be a non-empty array.');
  }

  const seenIds = new Set();
  const ecosystemCounts = Object.fromEntries([...ECOSYSTEMS].map((ecosystem) => [ecosystem, 0]));

  const sources = input.map((source) => {
    if (!isPlainObject(source)) {
      throw new Error('catalog source must be a JSON object.');
    }

    const id = normalizeSourceId(source.id, 'source id');
    if (seenIds.has(id)) {
      throw new Error(`Duplicate reference source id: ${id}.`);
    }
    seenIds.add(id);

    const ecosystem = normalizeEnum(source.ecosystem, ECOSYSTEMS, `${id} ecosystem`);
    ecosystemCounts[ecosystem] += 1;

    return {
      id,
      ecosystem,
      name: normalizeRequiredString(source.name, `${id} name`),
      url: normalizeHttpsUrl(source.url, `${id} url`),
      selectionTarget: normalizePositiveInteger(source.selectionTarget, `${id} selectionTarget`),
    };
  });

  for (const [ecosystem, count] of Object.entries(ecosystemCounts)) {
    if (!count) {
      throw new Error(`catalog sources must include ${ecosystem}.`);
    }
  }

  return sources.sort((a, b) => a.id.localeCompare(b.id));
}

function normalizeCandidates(input, sources) {
  if (!Array.isArray(input)) {
    throw new Error('catalog candidates must be an array.');
  }

  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const seenIds = new Set();

  return input.map((candidate) => {
    if (!isPlainObject(candidate)) {
      throw new Error('reference candidate must be a JSON object.');
    }

    const id = normalizeReferenceId(candidate.id, 'candidate id');
    if (seenIds.has(id)) {
      throw new Error(`Duplicate reference candidate id: ${id}.`);
    }
    seenIds.add(id);

    const ecosystem = normalizeEnum(candidate.ecosystem, ECOSYSTEMS, `${id} ecosystem`);
    if (!id.startsWith(`${ecosystem}:`)) {
      throw new Error(`${id} must start with its ecosystem prefix.`);
    }

    const sourceId = normalizeSourceId(candidate.sourceId, `${id} sourceId`);
    const source = sourceById.get(sourceId);
    if (!source) {
      throw new Error(`${id} references unknown source: ${sourceId}.`);
    }

    if (source.ecosystem !== ecosystem) {
      throw new Error(`${id} ecosystem does not match source ${sourceId}.`);
    }

    return removeUndefined({
      id,
      ecosystem,
      sourceId,
      name: normalizeRequiredString(candidate.name, `${id} name`),
      author: normalizeOptionalString(candidate.author, `${id} author`),
      sourceUrl: normalizeHttpsUrl(candidate.sourceUrl, `${id} sourceUrl`),
      marketplaceUrl: normalizeOptionalHttpsUrl(candidate.marketplaceUrl, `${id} marketplaceUrl`),
      repositoryUrl: normalizeOptionalHttpsUrl(candidate.repositoryUrl, `${id} repositoryUrl`),
      license: normalizeLicense(candidate.license, id),
      usage: normalizeEnum(candidate.usage, USAGE_STATUSES, `${id} usage`),
      reviewStatus: normalizeEnum(candidate.reviewStatus, REVIEW_STATUSES, `${id} reviewStatus`),
      colorScheme: normalizeEnum(candidate.colorScheme, COLOR_SCHEMES, `${id} colorScheme`),
      tags: normalizeTags(candidate.tags, id),
      notes: normalizeOptionalString(candidate.notes, `${id} notes`),
    });
  }).sort((a, b) => a.id.localeCompare(b.id));
}

function normalizeLicense(input, candidateId) {
  if (!isPlainObject(input)) {
    throw new Error(`${candidateId} license must be a JSON object.`);
  }

  return removeUndefined({
    status: normalizeEnum(input.status, LICENSE_STATUSES, `${candidateId} license.status`),
    name: normalizeOptionalString(input.name, `${candidateId} license.name`),
    url: normalizeOptionalHttpsUrl(input.url, `${candidateId} license.url`),
  });
}

function normalizeTags(value, candidateId) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${candidateId} tags must be an array.`);
  }

  if (value.length > MAX_TAGS) {
    throw new Error(`${candidateId} tags cannot exceed ${MAX_TAGS} entries.`);
  }

  return value.map((tag) => {
    if (typeof tag !== 'string') {
      throw new Error(`${candidateId} tags must be strings.`);
    }

    const normalized = tag.trim().toLowerCase();
    if (!TAG_PATTERN.test(normalized)) {
      throw new Error(`${candidateId} tag is invalid: ${tag}.`);
    }

    return normalized;
  });
}

function normalizeReferenceId(value, label) {
  const id = normalizeRequiredString(value, label).toLowerCase();
  if (!ID_PATTERN.test(id)) {
    throw new Error(`${label} must match ${ID_PATTERN}.`);
  }

  return id;
}

function normalizeSourceId(value, label) {
  const id = normalizeRequiredString(value, label).toLowerCase();
  if (!SOURCE_ID_PATTERN.test(id)) {
    throw new Error(`${label} must match ${SOURCE_ID_PATTERN}.`);
  }

  return id;
}

function normalizeRequiredString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  const normalized = value.trim();
  if (normalized.length > MAX_FIELD_LENGTH) {
    throw new Error(`${label} is too long.`);
  }

  return normalized;
}

function normalizeOptionalString(value, label) {
  if (value === undefined) {
    return undefined;
  }

  return normalizeRequiredString(value, label);
}

function normalizePositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
}

function normalizeEnum(value, allowed, label) {
  if (!allowed.has(value)) {
    throw new Error(`${label} must be one of: ${[...allowed].join(', ')}.`);
  }

  return value;
}

function normalizeOptionalHttpsUrl(value, label) {
  if (value === undefined) {
    return undefined;
  }

  return normalizeHttpsUrl(value, label);
}

function normalizeHttpsUrl(value, label) {
  const url = normalizeRequiredString(value, label);
  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`${label} must use https.`);
  }

  return parsed.href;
}

function parseArgs(argv, rootDir) {
  const options = {
    rootDir,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('--root requires a directory path.');
      }
      options.rootDir = resolve(value);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}.`);
    }
  }

  return options;
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

function removeUndefined(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
