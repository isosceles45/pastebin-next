export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE pastes
      ADD COLUMN filename        TEXT,
      ADD COLUMN language        TEXT,
      ADD COLUMN password_hash   TEXT,
      ADD COLUMN edit_token_hash TEXT;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE pastes
      DROP COLUMN filename,
      DROP COLUMN language,
      DROP COLUMN password_hash,
      DROP COLUMN edit_token_hash;
  `);
};
