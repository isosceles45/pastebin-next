/**
 * One paste per row.
 *
 * The two expiry rules are independent and both optional: NULL means "no limit"
 * for each, so a paste may have neither, either, or both.
 */

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE pastes (
      id          TEXT PRIMARY KEY,
      content     TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at  TIMESTAMPTZ,
      max_views   INTEGER,
      views       INTEGER NOT NULL DEFAULT 0
    );
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE pastes;`);
};
