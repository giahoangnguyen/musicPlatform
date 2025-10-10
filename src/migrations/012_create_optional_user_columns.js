
exports.up = async function up(knex) {
    // Add each column only if it doesn't exist yet
    if (!(await knex.schema.hasColumn('users', 'display_name'))) {
      await knex.schema.alterTable('users', (t) => { t.string('display_name'); });
    }
    if (!(await knex.schema.hasColumn('users', 'avatar_url'))) {
      await knex.schema.alterTable('users', (t) => { t.string('avatar_url'); });
    }
    if (!(await knex.schema.hasColumn('users', 'bio'))) {
      await knex.schema.alterTable('users', (t) => { t.text('bio'); });
    }
    if (!(await knex.schema.hasColumn('users', 'date_of_birth'))) {
      // store ISO date string; adjust to DATE if your dialect supports it
      await knex.schema.alterTable('users', (t) => { t.string('date_of_birth'); });
    }
    if (!(await knex.schema.hasColumn('users', 'country'))) {
      await knex.schema.alterTable('users', (t) => { t.string('country', 2); });
    }
};
  
exports.down = async function down(knex) {
    const client = knex.client.config.client; // likely 'sqlite3'
    if (client !== 'sqlite3') {
      // Other dialects (Postgres/MySQL) can drop columns normally:
      await knex.schema.alterTable('users', (t) => {
        t.dropColumns('display_name', 'avatar_url', 'bio', 'date_of_birth', 'country');
      });
      return;
    }
  
    // Check sqlite version
    const versionRow = await knex.raw('select sqlite_version() as v');
    const v = (Array.isArray(versionRow) ? versionRow[0]?.v : versionRow?.[0]?.v) || versionRow?.v;
    const toNum = (s) => s.split('.').map(Number);
    const ge335 = (() => {
      const [a,b,c] = toNum(v || '0.0.0');
      const [x,y,z] = [3,35,0];
      return a > x || (a===x && (b > y || (b===y && c >= z)));
    })();
  
    if (ge335) {
      await knex.schema.alterTable('users', (t) => {
        t.dropColumns('display_name', 'avatar_url', 'bio', 'date_of_birth', 'country');
      });
    } else {
      // Older SQLite: you'd need a table-rebuild (create temp table without columns, copy data, swap).
      // That’s invasive and data-destructive for these fields, so we no-op:
      console.warn('Skipping down: SQLite < 3.35 does not support DROP COLUMN safely.');
    }
};
  
  