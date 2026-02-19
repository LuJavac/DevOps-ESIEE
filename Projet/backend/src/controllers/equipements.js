const db = require('../db');

const parsePositiveInt = (rawValue, defaultValue, maxValue) => {
  const parsed = parseInt(rawValue, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return defaultValue;
  }
  return Math.min(parsed, maxValue);
};

const parseFiniteNumber = (rawValue) => {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * GET all equipements with pagination and filters.
 */
const getAllEquipements = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      commune,
      type,
      accessible,
      sport,
      search
    } = req.query;

    const pageNum = parsePositiveInt(page, 1, Number.MAX_SAFE_INTEGER);
    const limitNum = parsePositiveInt(limit, 20, 100);
    const offset = (pageNum - 1) * limitNum;

    const whereClause = [];
    const params = [];
    let paramCount = 1;

    if (commune) {
      whereClause.push(`commune_nom ILIKE $${paramCount}`);
      params.push(`%${commune}%`);
      paramCount++;
    }

    if (type) {
      whereClause.push(`equip_type_name ILIKE $${paramCount}`);
      params.push(`%${type}%`);
      paramCount++;
    }

    if (accessible === 'true') {
      whereClause.push('equip_pmr_acc = true');
    }

    if (sport) {
      whereClause.push(`
        EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(COALESCE(aps_name, '[]'::jsonb)) AS sport_name
          WHERE lower(sport_name) LIKE lower($${paramCount})
        )
      `);
      params.push(`%${sport}%`);
      paramCount++;
    }

    if (search) {
      whereClause.push(`(equip_nom ILIKE $${paramCount} OR inst_nom ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereString = whereClause.length > 0
      ? `WHERE ${whereClause.join(' AND ')}`
      : '';

    const countQuery = `SELECT COUNT(*) AS total FROM equipements ${whereString}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataQuery = `
      SELECT
        id, equip_numero, equip_nom, equip_type_name, equip_type_famille,
        inst_nom, inst_adresse, commune_nom, dep_nom,
        latitude, longitude, equip_surf, equip_nature,
        inst_acc_handi_bool, equip_pmr_acc, equip_ouv_public_bool,
        aps_name, equip_gest_type
      FROM equipements
      ${whereString}
      ORDER BY id DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(limitNum, offset);
    const result = await db.query(dataQuery, params);

    res.status(200).json({
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      filters: { commune, type, accessible, sport, search },
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching equipements:', error);
    res.status(500).json({
      success: false,
      error: 'Database error',
      message: error.message
    });
  }
};

/**
 * GET nearby equipements by user location and optional sport.
 */
const getNearbyEquipements = async (req, res) => {
  try {
    const lat = parseFiniteNumber(req.query.lat);
    const lon = parseFiniteNumber(req.query.lon);
    const sport = req.query.sport ? String(req.query.sport).trim() : '';
    const radiusKm = parsePositiveInt(req.query.radius, 10, 100);
    const limitNum = parsePositiveInt(req.query.limit, 10, 50);

    if (lat === null || lon === null) {
      return res.status(400).json({
        success: false,
        error: 'Query params "lat" and "lon" are required numbers'
      });
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates range'
      });
    }

    const params = [lat, lon];
    let sportClause = '';

    if (sport) {
      params.push(`%${sport}%`);
      sportClause = `
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(COALESCE(aps_name, '[]'::jsonb)) AS sport_name
          WHERE lower(sport_name) LIKE lower($${params.length})
        )
      `;
    }

    params.push(radiusKm);
    const radiusIndex = params.length;
    params.push(limitNum);
    const limitIndex = params.length;

    const distanceExpression = `
      6371 * acos(
        least(
          1,
          greatest(
            -1,
            cos(radians($1)) * cos(radians(latitude))
            * cos(radians(longitude) - radians($2))
            + sin(radians($1)) * sin(radians(latitude))
          )
        )
      )
    `;

    const query = `
      WITH ranked AS (
        SELECT
          id,
          equip_numero,
          equip_nom,
          equip_type_name,
          equip_type_famille,
          inst_nom,
          inst_adresse,
          commune_nom,
          dep_nom,
          latitude,
          longitude,
          aps_name,
          equip_pmr_acc,
          ROUND((${distanceExpression})::numeric, 3) AS distance_km
        FROM equipements
        WHERE latitude IS NOT NULL
          AND longitude IS NOT NULL
          ${sportClause}
      )
      SELECT
        id,
        equip_numero,
        equip_nom,
        equip_type_name,
        equip_type_famille,
        inst_nom,
        inst_adresse,
        commune_nom,
        dep_nom,
        latitude,
        longitude,
        aps_name,
        equip_pmr_acc,
        distance_km,
        CASE
          WHEN inst_adresse IS NOT NULL AND commune_nom IS NOT NULL THEN inst_adresse || ', ' || commune_nom
          WHEN inst_adresse IS NOT NULL THEN inst_adresse
          ELSE commune_nom
        END AS full_address
      FROM ranked
      WHERE distance_km <= $${radiusIndex}
      ORDER BY distance_km ASC
      LIMIT $${limitIndex}
    `;

    const result = await db.query(query, params);

    res.status(200).json({
      success: true,
      input: {
        lat,
        lon,
        sport: sport || null,
        radius: radiusKm,
        limit: limitNum
      },
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching nearby equipements:', error);
    res.status(500).json({
      success: false,
      error: 'Database error',
      message: error.message
    });
  }
};

/**
 * GET equipement by ID.
 */
const getEquipementById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM equipements WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Equipement not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching equipement:', error);
    res.status(500).json({
      success: false,
      error: 'Database error',
      message: error.message
    });
  }
};

/**
 * POST create a new equipement.
 */
const createEquipement = async (req, res) => {
  try {
    const {
      equip_numero,
      equip_nom,
      equip_type_name,
      inst_nom,
      inst_adresse,
      commune_nom,
      latitude,
      longitude,
      aps_name
    } = req.body;

    if (!equip_numero || !equip_nom) {
      return res.status(400).json({
        success: false,
        error: 'Fields "equip_numero" and "equip_nom" are required'
      });
    }

    const result = await db.query(
      `INSERT INTO equipements (
        equip_numero, equip_nom, equip_type_name, inst_nom, inst_adresse,
        commune_nom, latitude, longitude, aps_name
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        equip_numero,
        equip_nom,
        equip_type_name,
        inst_nom,
        inst_adresse,
        commune_nom,
        latitude,
        longitude,
        aps_name ? JSON.stringify(aps_name) : null
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating equipement:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'An equipement with this numero already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Database error',
      message: error.message
    });
  }
};

/**
 * PUT update an existing equipement.
 */
const updateEquipement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      equip_nom,
      equip_type_name,
      inst_nom,
      inst_adresse,
      commune_nom,
      latitude,
      longitude,
      equip_pmr_acc,
      aps_name
    } = req.body;

    const result = await db.query(
      `UPDATE equipements
       SET
         equip_nom = COALESCE($1, equip_nom),
         equip_type_name = COALESCE($2, equip_type_name),
         inst_nom = COALESCE($3, inst_nom),
         inst_adresse = COALESCE($4, inst_adresse),
         commune_nom = COALESCE($5, commune_nom),
         latitude = COALESCE($6, latitude),
         longitude = COALESCE($7, longitude),
         equip_pmr_acc = COALESCE($8, equip_pmr_acc),
         aps_name = COALESCE($9, aps_name),
         updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        equip_nom,
        equip_type_name,
        inst_nom,
        inst_adresse,
        commune_nom,
        latitude,
        longitude,
        equip_pmr_acc,
        aps_name ? JSON.stringify(aps_name) : null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Equipement not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating equipement:', error);
    res.status(500).json({
      success: false,
      error: 'Database error',
      message: error.message
    });
  }
};

/**
 * DELETE an equipement.
 */
const deleteEquipement = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM equipements WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Equipement not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Equipement deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting equipement:', error);
    res.status(500).json({
      success: false,
      error: 'Database error',
      message: error.message
    });
  }
};

/**
 * GET global statistics.
 */
const getStats = async (req, res) => {
  try {
    const queries = await Promise.all([
      db.query('SELECT COUNT(*) AS total FROM equipements'),
      db.query('SELECT COUNT(DISTINCT commune_nom) AS communes FROM equipements'),
      db.query(`
        SELECT equip_type_famille, COUNT(*) AS count
        FROM equipements
        WHERE equip_type_famille IS NOT NULL
        GROUP BY equip_type_famille
        ORDER BY count DESC
        LIMIT 10
      `),
      db.query(`
        SELECT commune_nom, COUNT(*) AS count
        FROM equipements
        WHERE commune_nom IS NOT NULL
        GROUP BY commune_nom
        ORDER BY count DESC
        LIMIT 10
      `),
      db.query(`
        SELECT COUNT(*) AS accessible
        FROM equipements
        WHERE equip_pmr_acc = true
      `)
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total: parseInt(queries[0].rows[0].total, 10),
        communes: parseInt(queries[1].rows[0].communes, 10),
        accessible: parseInt(queries[4].rows[0].accessible, 10),
        byType: queries[2].rows,
        byCommune: queries[3].rows
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Database error',
      message: error.message
    });
  }
};

module.exports = {
  getAllEquipements,
  getNearbyEquipements,
  getEquipementById,
  createEquipement,
  updateEquipement,
  deleteEquipement,
  getStats
};
