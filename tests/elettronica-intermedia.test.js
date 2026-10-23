// Test della sezione Elettronica intermedia: modelli fisici dei capitoli e contratto dei contenuti.
// I file veri sono in sections/elettronica-intermedia/tests/.
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'sections', 'elettronica-intermedia', 'tests');
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.test.js')).sort()) require(path.join(dir, f));
