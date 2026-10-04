/** Loads the Apps Script sources into a vm with in-memory fakes of the Google services. */
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function makeSheet() {
  const data = [];
  const sh = {
    data,
    getLastRow: () => { let n = data.length; while (n > 0 && data[n - 1].every((c) => c === '')) n--; return n; },
    getMaxRows: () => Math.max(data.length, 1000),
    setFrozenRows() {},
    getRange(r, c, nr = 1, nc = 1) {
      return {
        setValues(vals) {
          vals.forEach((row, i) => {
            const rr = r - 1 + i;
            data[rr] = data[rr] || [];
            row.forEach((v, j) => { data[rr][c - 1 + j] = v; });
          });
          return this;
        },
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const row = [];
            for (let j = 0; j < nc; j++) {
              const v = (data[r - 1 + i] || [])[c - 1 + j];
              row.push(v === undefined ? '' : v);
            }
            out.push(row);
          }
          return out;
        },
        clearContent() {
          for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (data[r - 1 + i]) data[r - 1 + i][c - 1 + j] = '';
          return this;
        },
        setFontWeight() { return this; },
        setNumberFormat() { return this; },
      };
    },
  };
  return sh;
}

function createEnv() {
  const sheets = {};
  const props = {};
  const cache = {};
  const files = {};
  const pushes = [];
  const env = { sheets, props, files, pushes, lineVerify: null };

  const ctx = {
    console: { log() {}, error() {} },
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: (n) => sheets[n] || null,
        insertSheet: (n) => (sheets[n] = makeSheet()),
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (k in cache ? cache[k] : null),
        put: (k, v) => { cache[k] = v; },
        remove: (k) => { delete cache[k]; },
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k in props ? props[k] : null),
        setProperty: (k, v) => { props[k] = v; },
        deleteProperty: (k) => { delete props[k]; },
      }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      computeDigest: (_a, s) => [...crypto.createHash('sha256').update(s).digest()].map((b) => (b > 127 ? b - 256 : b)),
      getUuid: () => crypto.randomUUID(),
      base64Decode: (s) => [...Buffer.from(s, 'base64')],
      base64Encode: (bytes) => Buffer.from(bytes).toString('base64'),
      newBlob: (bytes, mime, name) => ({ bytes, mime, name }),
      formatDate: (d) => String(d),
    },
    DriveApp: {
      createFolder: () => ({ getId: () => 'FOLDER_ID_0000' }),
      getFolderById: () => ({
        getId: () => 'FOLDER_ID_0000',
        createFile: (blob) => {
          const id = 'file_' + Object.keys(files).length + '_abcdefghij';
          files[id] = blob;
          return { getId: () => id };
        },
      }),
      getFileById: (id) => ({
        getParents: () => { let done = false; return { hasNext: () => !done, next: () => { done = true; return { getId: () => 'FOLDER_ID_0000' }; } }; },
        getBlob: () => ({ getContentType: () => files[id].mime, getBytes: () => files[id].bytes }),
        getName: () => files[id].name,
      }),
    },
    UrlFetchApp: {
      fetch: (url, opts) => {
        if (url.indexOf('/oauth2/v2.1/verify') > -1) {
          const r = env.lineVerify ? env.lineVerify(opts.payload) : null;
          return { getResponseCode: () => (r ? 200 : 400), getContentText: () => JSON.stringify(r || {}) };
        }
        pushes.push(JSON.parse(opts.payload));
        return { getResponseCode: () => 200, getContentText: () => '{}' };
      },
    },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (s) => ({ getContent: () => s, setMimeType() { return this; } }),
    },
  };
  vm.createContext(ctx);
  const src = fs.readdirSync(path.join(__dirname, '..'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8'))
    .join('\n');
  vm.runInContext(src + '\n;this.__exports = { doPost, setup, doGet, readAll_, appendRow_, writeRow_, getSettings_, saveSettings_, addAdmin_ };', ctx);
  const x = ctx.__exports;

  env.call = (action, payload, token) =>
    JSON.parse(x.doPost({ postData: { contents: JSON.stringify({ action, payload, token }) } }).getContent());
  env.x = x;
  env.read = (name) => x.readAll_(name);
  return env;
}

module.exports = { createEnv };
