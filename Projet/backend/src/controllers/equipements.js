const db = require('../db');

/**
 * GET tous les équipements avec pagination et filtres
 * Query params:
 * - page: numéro de page (défaut: 1)
 * - limit: nombre par page (défaut: 20, max: 100)
 * - commune: filtrer par commune
 * - type: filtrer par type d'équipement
 * - accessible: filtrer équipements PMR (true/false)
 * - sport: filtrer par activité sportive
 * - search: recherche textuelle (nom équipement ou installation)
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
    
    // Validation
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;
    
    // Construction de la requête dynamique
    let whereClause = [];
    let params = [];
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
      whereClause.push(`equip_pmr_acc = true`);
    }
    
    if (sport) {
      whereClause.push(`aps_name @> $${paramCount}::jsonb`);
      params.push(JSON.stringify([sport]));
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
    
    // Requête de comptage
    const countQuery = `SELECT COUNT(*) as total FROM equipements ${whereString}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);
    
    // Requête des données
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
        total: total,
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
 * GET un équipement par ID
 */
const getEquipementById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT * FROM equipements WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Équipement not found'
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
 * POST créer un nouvel équipement
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
    
    // Validation
    if (!equip_numero || !equip_nom) {
      return res.status(400).json({
        success: false,
        error: 'Les champs "equip_numero" et "equip_nom" sont requis'
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
        equip_numero, equip_nom, equip_type_name, inst_nom, inst_adresse,
        commune_nom, latitude, longitude, 
        aps_name ? JSON.stringify(aps_name) : null
      ]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error creating equipement:', error);
    
    if (error.code === '23505') { // Duplicate key
      return res.status(409).json({
        success: false,
        error: 'Un équipement avec ce numéro existe déjà'
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
 * PUT modifier un équipement existant
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
        equip_nom, equip_type_name, inst_nom, inst_adresse, commune_nom,
        latitude, longitude, equip_pmr_acc,
        aps_name ? JSON.stringify(aps_name) : null,
        id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Équipement not found'
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
 * DELETE supprimer un équipement
 */
const deleteEquipement = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'DELETE FROM equipements WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Équipement not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Équipement deleted successfully',
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
 * GET statistiques sur les équipements
 */
const getStats = async (req, res) => {
  try {
    const queries = await Promise.all([
      db.query('SELECT COUNT(*) as total FROM equipements'),
      db.query('SELECT COUNT(DISTINCT commune_nom) as communes FROM equipements'),
      db.query(`
        SELECT equip_type_famille, COUNT(*) as count 
        FROM equipements 
        WHERE equip_type_famille IS NOT NULL
        GROUP BY equip_type_famille 
        ORDER BY count DESC 
        LIMIT 10
      `),
      db.query(`
        SELECT commune_nom, COUNT(*) as count 
        FROM equipements 
        WHERE commune_nom IS NOT NULL
        GROUP BY commune_nom 
        ORDER BY count DESC 
        LIMIT 10
      `),
      db.query(`
        SELECT COUNT(*) as accessible 
        FROM equipements 
        WHERE equip_pmr_acc = true
      `)
    ]);
    
    res.status(200).json({
      success: true,
      stats: {
        total: parseInt(queries[0].rows[0].total),
        communes: parseInt(queries[1].rows[0].communes),
        accessible: parseInt(queries[4].rows[0].accessible),
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
  getEquipementById,
  createEquipement,
  updateEquipement,
  deleteEquipement,
  getStats
};