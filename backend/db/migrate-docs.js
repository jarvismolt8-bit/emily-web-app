const fs = require('fs');
const path = require('path');
const { getDb } = require('./index');

const DOCS_DIR = '/var/www/cashflow-manager/documentation';

const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));

let imported = 0;
let skipped = 0;
let notFound = 0;
const errors = [];

for (const file of files) {
  const match = file.match(/^(\d+)-/);
  if (!match) {
    console.log(`[SKIP] ${file} — filename doesn't match task ID pattern`);
    skipped++;
    continue;
  }

  const taskId = match[1];

  try {
    const db = getDb();
    const task = db.prepare('SELECT id, documentation FROM tasks WHERE id = ?').get(taskId);

    if (!task) {
      console.log(`[NOT FOUND] ${file} — task ${taskId} doesn't exist in DB`);
      notFound++;
      continue;
    }

    if (task.documentation && task.documentation.trim() !== '') {
      console.log(`[SKIP] ${file} — task ${taskId} already has documentation`);
      skipped++;
      continue;
    }

    const content = fs.readFileSync(path.join(DOCS_DIR, file), 'utf8');
    db.prepare('UPDATE tasks SET documentation = ? WHERE id = ?').run(content, taskId);
    console.log(`[IMPORTED] ${file} → task ${taskId}`);
    imported++;
  } catch (err) {
    console.error(`[ERROR] ${file} — ${err.message}`);
    errors.push({ file, error: err.message });
  }
}

console.log('\n--- Migration Summary ---');
console.log(`Imported: ${imported}`);
console.log(`Skipped: ${skipped}`);
console.log(`Not Found: ${notFound}`);
if (errors.length > 0) {
  console.log(`Errors: ${errors.length}`);
  errors.forEach(e => console.error(`  - ${e.file}: ${e.error}`));
}
