const express = require('express');
const router = express.Router();
const {
  getAllEquipements,
  getEquipementById,
  createEquipement,
  updateEquipement,
  deleteEquipement,
  getStats
} = require('../controllers/equipements');

// Routes CRUD
router.get('/', getAllEquipements);
router.get('/stats', getStats); // IMPORTANT: avant /:id pour éviter conflit
router.get('/:id', getEquipementById);
router.post('/', createEquipement);
router.put('/:id', updateEquipement);
router.delete('/:id', deleteEquipement);

module.exports = router;