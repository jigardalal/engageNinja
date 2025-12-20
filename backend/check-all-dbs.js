const Database = require('better-sqlite3');

const dbPaths = [
  '/Users/jigs/Code/EngageNinja-Coding-Agent-Harness/generations/engageNinja/backend/database.sqlite',
  '/Users/jigs/Code/EngageNinja-Coding-Agent-Harness/generations/engageNinja/database.sqlite',
  '/Users/jigs/Code/EngageNinja-Coding-Agent-Harness/generations/engageNinja/backend/backend/database.sqlite'
];

dbPaths.forEach(dbPath => {
  try {
    const db = new Database(dbPath);
    const users = db.prepare('SELECT email FROM users').all();
    console.log(`\n${dbPath}:`);
    console.log(`  Users: ${users.length}`);
    users.forEach(u => console.log(`    - ${u.email}`));
    db.close();
  } catch (e) {
    console.log(`\n${dbPath}: ERROR - ${e.message}`);
  }
});
