const db = require('../db');

// GET tous les équipements
const getAllEquipements = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM equipements ORDER BY id DESC'
    );
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching equipements:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
};

// GET un équipement par ID
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
    res.status(500).json({ success: false, error: 'Database error' });
  }
};

// POST créer un nouvel équipement
const createEquipement = async (req, res) => {
  try {
    const { nom, type, adresse, ville, code_postal, latitude, longitude } = req.body;
    
    // Validation basique
    if (!nom) {
      return res.status(400).json({
        success: false,
        error: 'Le champ "nom" est requis'
      });
    }
    
    const result = await db.query(
      `INSERT INTO equipements (nom, type, adresse, ville, code_postal, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [nom, type, adresse, ville, code_postal, latitude, longitude]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating equipement:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
};

// PUT modifier un équipement existant
const updateEquipement = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, type, adresse, ville, code_postal, latitude, longitude } = req.body;
    
    const result = await db.query(
      `UPDATE equipements
       SET nom = COALESCE($1, nom),
           type = COALESCE($2, type),
           adresse = COALESCE($3, adresse),
           ville = COALESCE($4, ville),
           code_postal = COALESCE($5, code_postal),
           latitude = COALESCE($6, latitude),
           longitude = COALESCE($7, longitude)
       WHERE id = $8
       RETURNING *`,
      [nom, type, adresse, ville, code_postal, latitude, longitude, id]
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
    res.status(500).json({ success: false, error: 'Database error' });
  }
};

// DELETE supprimer un équipement
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
    res.status(500).json({ success: false, error: 'Database error' });
  }
};

module.exports = {
  getAllEquipements,
  getEquipementById,
  createEquipement,
  updateEquipement,
  deleteEquipement
};