const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'equipements',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'devops2026'
});

async function initSchema() {
  const sql = `
    CREATE TABLE IF NOT EXISTS equipements (
      id SERIAL PRIMARY KEY,
      equip_numero VARCHAR(50) UNIQUE NOT NULL,
      inst_numero VARCHAR(50),
      inst_nom VARCHAR(255),
      inst_adresse TEXT,
      inst_cp VARCHAR(10),
      commune_nom VARCHAR(100),
      commune_code VARCHAR(10),
      dep_code VARCHAR(5),
      dep_nom VARCHAR(100),
      reg_nom VARCHAR(100),
      equip_nom VARCHAR(255),
      equip_type_name VARCHAR(255),
      equip_type_famille VARCHAR(255),
      equip_nature VARCHAR(50),
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      equip_surf DECIMAL(10, 2),
      equip_long DECIMAL(10, 2),
      equip_larg DECIMAL(10, 2),
      equip_haut DECIMAL(10, 2),
      inst_acc_handi_bool BOOLEAN,
      equip_pmr_acc BOOLEAN,
      equip_ouv_public_bool BOOLEAN,
      aps_name JSONB,
      equip_gest_type VARCHAR(100),
      equip_prop_type VARCHAR(100),
      equip_service_date VARCHAR(10),
      inst_date_creation DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_commune ON equipements(commune_nom);
    CREATE INDEX IF NOT EXISTS idx_type ON equipements(equip_type_name);
    CREATE INDEX IF NOT EXISTS idx_coords ON equipements(latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_aps ON equipements USING GIN (aps_name);
  `;

  await pool.query(sql);
  console.log('Schema initialized');
}

initSchema()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error('Schema init error:', error);
    await pool.end();
    process.exit(1);
  });
