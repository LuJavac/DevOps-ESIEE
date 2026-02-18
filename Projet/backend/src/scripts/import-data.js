const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'equipements',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'devops2026'
});

const DATA_URL =
  'https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/data-es/exports/json?lang=fr&refine=reg_nom%3A%22%C3%8Ele-de-France%22&timezone=Europe%2FBerlin';

async function fetchEquipements() {
  return new Promise((resolve, reject) => {
    console.log('Downloading data from data.gouv.fr...');

    https
      .get(DATA_URL, (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            const equipements = JSON.parse(raw);
            console.log(`Downloaded ${equipements.length} equipements`);
            resolve(equipements);
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });
}

async function createSchema() {
  console.log('Creating database schema...');

  const createTableQuery = `
    DROP TABLE IF EXISTS equipements CASCADE;

    CREATE TABLE equipements (
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

    CREATE INDEX idx_commune ON equipements(commune_nom);
    CREATE INDEX idx_type ON equipements(equip_type_name);
    CREATE INDEX idx_coords ON equipements(latitude, longitude);
    CREATE INDEX idx_aps ON equipements USING GIN (aps_name);
  `;

  await pool.query(createTableQuery);
  console.log('Schema created');
}

function parseEquipement(raw) {
  return {
    equip_numero: raw.equip_numero,
    inst_numero: raw.inst_numero,
    inst_nom: raw.inst_nom,
    inst_adresse: raw.inst_adresse,
    inst_cp: raw.inst_cp,
    commune_nom: raw.new_name,
    commune_code: raw.new_code,
    dep_code: raw.dep_code,
    dep_nom: raw.dep_nom,
    reg_nom: raw.reg_nom,
    equip_nom: raw.equip_nom,
    equip_type_name: raw.equip_type_name,
    equip_type_famille: raw.equip_type_famille,
    equip_nature: raw.equip_nature,
    latitude: raw.equip_coordonnees?.lat || null,
    longitude: raw.equip_coordonnees?.lon || null,
    equip_surf: raw.equip_surf || null,
    equip_long: raw.equip_long || null,
    equip_larg: raw.equip_larg || null,
    equip_haut: raw.equip_haut || null,
    inst_acc_handi_bool: raw.inst_acc_handi_bool === 'true',
    equip_pmr_acc: raw.equip_pmr_acc === 'true',
    equip_ouv_public_bool: raw.equip_ouv_public_bool === 'true',
    aps_name: raw.aps_name ? JSON.stringify(raw.aps_name) : null,
    equip_gest_type: raw.equip_gest_type,
    equip_prop_type: raw.equip_prop_type,
    equip_service_date: raw.equip_service_date,
    inst_date_creation: raw.inst_date_creation || null
  };
}

async function insertEquipements(equipements) {
  console.log('Inserting equipements...');

  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < equipements.length; i += batchSize) {
    const batch = equipements.slice(i, i + batchSize);

    for (const raw of batch) {
      try {
        const equip = parseEquipement(raw);

        await pool.query(
          `
          INSERT INTO equipements (
            equip_numero, inst_numero, inst_nom, inst_adresse, inst_cp,
            commune_nom, commune_code, dep_code, dep_nom, reg_nom,
            equip_nom, equip_type_name, equip_type_famille, equip_nature,
            latitude, longitude, equip_surf, equip_long, equip_larg, equip_haut,
            inst_acc_handi_bool, equip_pmr_acc, equip_ouv_public_bool,
            aps_name, equip_gest_type, equip_prop_type,
            equip_service_date, inst_date_creation
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28
          )
          ON CONFLICT (equip_numero) DO NOTHING
        `,
          [
            equip.equip_numero,
            equip.inst_numero,
            equip.inst_nom,
            equip.inst_adresse,
            equip.inst_cp,
            equip.commune_nom,
            equip.commune_code,
            equip.dep_code,
            equip.dep_nom,
            equip.reg_nom,
            equip.equip_nom,
            equip.equip_type_name,
            equip.equip_type_famille,
            equip.equip_nature,
            equip.latitude,
            equip.longitude,
            equip.equip_surf,
            equip.equip_long,
            equip.equip_larg,
            equip.equip_haut,
            equip.inst_acc_handi_bool,
            equip.equip_pmr_acc,
            equip.equip_ouv_public_bool,
            equip.aps_name,
            equip.equip_gest_type,
            equip.equip_prop_type,
            equip.equip_service_date,
            equip.inst_date_creation
          ]
        );

        inserted++;
      } catch (error) {
        console.error(`Insert error ${raw.equip_numero}:`, error.message);
      }
    }

    console.log(`Processed ${Math.min(i + batchSize, equipements.length)}/${equipements.length}`);
  }

  console.log(`Inserted ${inserted} equipements`);
}

async function main() {
  try {
    console.log('Starting data import...\n');

    await createSchema();

    const equipements = await fetchEquipements();

    const importLimit = Number(process.env.IMPORT_LIMIT || 1000);
    const shouldLimit = Number.isFinite(importLimit) && importLimit > 0;
    const dataset = shouldLimit ? equipements.slice(0, importLimit) : equipements;

    console.log(`Import scope: ${shouldLimit ? importLimit : 'full dataset'}`);
    await insertEquipements(dataset);

    const result = await pool.query('SELECT COUNT(*) as total FROM equipements');
    console.log(`Total rows in database: ${result.rows[0].total}`);

    await pool.end();
    console.log('Import completed successfully');
  } catch (error) {
    console.error('Import error:', error);
    await pool.end();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fetchEquipements, insertEquipements };
