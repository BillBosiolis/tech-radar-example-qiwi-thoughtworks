import { globby } from 'globby'
import path from 'node:path'

import { asArray } from '../util.js'
import { parseCsvRadar } from './csv.js'
import { parseJsonRadar } from './json.js'
import { validate } from './validator.js'
import { parseYamlRadar } from './yaml.js'

export { parseCsvRadar } from './csv.js'
export { parseJsonRadar } from './json.js'
export { parseYamlRadar } from './yaml.js'

/**
 * Parse radarDocument
 * @param filePath
 * @returns {Promise<{data: any[], meta: {}, quadrantAliases?: {}}>} radarDocument
 */
export const parse = async (filePath) => {
  try {
    const reader = getReader(path.extname(filePath))
    const document = await reader(filePath)
    const radar = normalizeEntries(document)

    return validate(radar)
  } catch (err) {
    console.error('filePath:', filePath, err)
    return {}
  }
}
/**
 * selection of the reading function depending on the extension
 * @param ext
 * @returns {(function(*=): {data: any[], meta: {}})}
 */
export const getReader = (ext) => {
  if (ext === '.csv') {
    return parseCsvRadar
  }
  if (ext === '.json') {
    return parseJsonRadar
  }
  if (ext === '.yml' || ext === '.yaml') {
    return parseYamlRadar
  }
  throw new Error('Unsupported format', ext)
}

/**
 * Returns absolute files paths by glob pattern
 * @param {string|string[]} pattern - glob pattern
 * @param cwd - cwd
 * @returns {Promise<string[]>}
 */
export const getSources = async (pattern, cwd) =>
  globby([pattern], {
    onlyFiles: true,
    absolute: true,
    cwd,
  })

export const normalizeQuadrantAliases = (aliases) =>
  Object.entries(aliases).reduce((m, [k, v]) => {
    if (/^q[1-4]$/.test(k)) {
      asArray(v).forEach((_v) => {
        m[_v] = k
      })
    } else {
      m[k] = v
    }

    return m
  }, {})

export const normalizeQuadrantTitles = (titles) => ({
  q1: 'Q1',
  q2: 'Q2',
  q3: 'Q4',
  q4: 'Q4',
  ...titles,
})

export const normalizeEntries = (doc) => {
  doc.quadrantAliases = normalizeQuadrantAliases(doc.quadrantAliases)
  doc.quadrantTitles = normalizeQuadrantTitles(doc.quadrantTitles)

  doc.data.forEach((entry) => {
    entry.ring = entry.ring.toLowerCase()
    entry.quadrant = getQuadrant(entry.quadrant, doc.quadrantAliases)
    entry.quadrantTitle = doc.quadrantTitles[entry.quadrant]
    entry.moved = +entry.moved || 0
  })
  doc.data.sort((a, b) => (a.name > b.name ? 1 : -1))

  return doc
}

export const getQuadrant = (quadrant, quadrantAliases) => {
  const lowQuadrant = quadrant.toLowerCase()
  return quadrantAliases[lowQuadrant] || lowQuadrant
}
