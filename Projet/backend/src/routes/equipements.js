const express = require('express');
const router = express.Router();

const {
  getAllEquipements,
  getNearbyEquipements,
  getEquipementById,
  createEquipement,
  updateEquipement,
  deleteEquipement,
  getStats
} = require('../controllers/equipements');

router.get('/', getAllEquipements);
router.get('/nearby', getNearbyEquipements);
router.get('/stats', getStats);
router.get('/:id', getEquipementById);
router.post('/', createEquipement);
router.put('/:id', updateEquipement);
router.delete('/:id', deleteEquipement);

module.exports = router;
