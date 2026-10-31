// Schemat bazy danych. Nowe zmiany dopisujemy jako kolejną migrację, nigdy nie edytujemy już wdrożonych.
// Typy są wspólne dla PostgreSQL i SQLite: TEXT, INTEGER, daty jako tekst ISO 8601, JSON jako tekst.
export const MIGRATIONS: { id: number; name: string; up: string[] }[] = [
  {
    id: 1,
    name: 'konta, firmy, rekordy, dziennik',
    up: [
      `CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        totp_secret TEXT,
        totp_enabled INTEGER NOT NULL DEFAULT 0,
        prefs TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE orgs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        settings TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE memberships (
        org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        visibility TEXT NOT NULL DEFAULT 'all',
        title TEXT NOT NULL DEFAULT '',
        target INTEGER,
        created_at TEXT NOT NULL,
        PRIMARY KEY (org_id, user_id)
      )`,
      `CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE invites (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        invited_by TEXT,
        expires_at TEXT NOT NULL,
        accepted_at TEXT,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE password_resets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        used_at TEXT
      )`,
      `CREATE TABLE records (
        org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        owner TEXT,
        updated_at TEXT NOT NULL,
        updated_by TEXT,
        deleted INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (org_id, type, id)
      )`,
      'CREATE INDEX records_updated ON records (org_id, updated_at)',
      `CREATE TABLE audit_log (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        user_id TEXT,
        action TEXT NOT NULL,
        type TEXT,
        record_id TEXT,
        detail TEXT,
        at TEXT NOT NULL
      )`,
      'CREATE INDEX audit_org_at ON audit_log (org_id, at)',
      `CREATE TABLE ai_usage (
        org_id TEXT NOT NULL,
        day TEXT NOT NULL,
        calls INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (org_id, day)
      )`
    ]
  },
  {
    id: 2,
    name: 'logowanie Google i Microsoft, formularz leada, poranny plan',
    up: [
      `CREATE TABLE identities (
        provider TEXT NOT NULL,
        subject TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email TEXT,
        created_at TEXT NOT NULL,
        PRIMARY KEY (provider, subject)
      )`,
      'CREATE INDEX identities_user ON identities (user_id)',
      `CREATE TABLE oauth_states (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )`,
      `CREATE TABLE lead_forms (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        created_by TEXT,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE digests (
        user_id TEXT NOT NULL,
        org_id TEXT NOT NULL,
        day TEXT NOT NULL,
        PRIMARY KEY (user_id, org_id, day)
      )`
    ]
  },
  {
    id: 3,
    name: 'skrzynki BCC i seria powitalna',
    up: [
      `CREATE TABLE mailboxes (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE onboarding_mails (
        user_id TEXT NOT NULL,
        step TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        PRIMARY KEY (user_id, step)
      )`
    ]
  },
  {
    id: 4,
    name: 'webhooki, oferty, raport tygodniowy',
    up: [
      `CREATE TABLE webhooks (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        events TEXT NOT NULL,
        secret TEXT NOT NULL,
        last_status INTEGER,
        last_at TEXT,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE offers (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        deal_id TEXT NOT NULL,
        data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'sent',
        accepted_name TEXT,
        accepted_at TEXT,
        viewed_at TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL
      )`,
      'CREATE INDEX offers_deal ON offers (org_id, deal_id)',
      `CREATE TABLE weekly_reports (
        org_id TEXT NOT NULL,
        week TEXT NOT NULL,
        PRIMARY KEY (org_id, week)
      )`
    ]
  },
  {
    id: 5,
    name: 'umawianie spotkań',
    up: [
      `CREATE TABLE booking_pages (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        settings TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      'CREATE UNIQUE INDEX booking_pages_user ON booking_pages (org_id, user_id)',
      `CREATE TABLE bookings (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        page_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        start_at TEXT NOT NULL,
        end_at TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        company TEXT,
        phone TEXT,
        topic TEXT,
        status TEXT NOT NULL DEFAULT 'confirmed',
        cancel_token TEXT NOT NULL UNIQUE,
        contact_id TEXT,
        record_obj TEXT,
        record_id TEXT,
        activity_id TEXT,
        created_at TEXT NOT NULL
      )`,
      "CREATE UNIQUE INDEX bookings_slot ON bookings (user_id, start_at) WHERE status = 'confirmed'",
      'CREATE INDEX bookings_org ON bookings (org_id, start_at)'
    ]
  }
];
