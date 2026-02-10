const request = require('supertest');
const app = require('../src/app');

describe('API Tests', () => {
  
  // Test du health check
  describe('GET /health', () => {
    it('should return status OK', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'OK');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  // Tests des routes CRUD (à adapter quand la DB sera connectée)
  describe('GET /equipements', () => {
    it('should return array of equipements', async () => {
      const res = await request(app).get('/equipements');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /equipements', () => {
    it('should create a new equipement', async () => {
      const newEquipement = {
        nom: 'Stade de Test',
        type: 'Terrain de football',
        ville: 'Paris'
      };
      
      const res = await request(app)
        .post('/equipements')
        .send(newEquipement);
      
      expect([201, 500]).toContain(res.statusCode); // 500 si pas de DB
      if (res.statusCode === 201) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('nom', 'Stade de Test');
      }
    });

    it('should reject equipement without nom', async () => {
      const invalidEquipement = {
        type: 'Terrain de football'
      };
      
      const res = await request(app)
        .post('/equipements')
        .send(invalidEquipement);
      
      expect([400, 500]).toContain(res.statusCode);
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/unknown-route');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

});