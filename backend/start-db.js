const EmbeddedPostgres = require('embedded-postgres').default;
const path = require('path');
const fs = require('fs');

async function run() {
  const dataDir = path.resolve(__dirname, '.pgdata');
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    port: 5432,
    user: 'postgres',
    password: 'password',
  });

  // A real cluster always contains PG_VERSION. Only initialise if it is missing.
  const alreadyInitialised = fs.existsSync(path.join(dataDir, 'PG_VERSION'));

  if (alreadyInitialised) {
    console.log('Existing database found. Skipping initialisation.');
  } else {
    console.log('Initializing PostgreSQL database...');
    await pg.initialise();
  }

  // Remove stale lock file if left over from a previous killed process
  const pidFile = path.join(dataDir, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    console.log('Removing stale postmaster.pid lock file...');
    try {
      fs.unlinkSync(pidFile);
    } catch (e) {
      console.warn('Could not remove postmaster.pid:', e.message);
    }
  }

  console.log('Starting PostgreSQL server on port 5432...');
  await pg.start();

  console.log('Creating database traveldoc...');
  try {
    await pg.createDatabase('traveldoc');
    console.log('Database traveldoc created successfully.');
  } catch (err) {
    console.log('Database traveldoc already exists or notice:', err.message);
  }

  console.log('PostgreSQL running on localhost:5432. Ready for connections.');

  // Keep process alive
  setInterval(() => { }, 10000);
}

run().catch((err) => {
  console.error('Failed to start postgres:', err);
  process.exit(1);
});