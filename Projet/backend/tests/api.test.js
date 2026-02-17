const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

describe('API Tests', () => {

  // Health check
  describe('GET /health', () => {
    it('should return status OK', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'OK');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  // Liste avec pagination
  describe('GET /equipements', () => {
    it('should return paginated results', async () => {
      const res = await request(app).get('/equipements?page=1&limit=10');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toHaveProperty('page', 1);
      expect(res.body.pagination).toHaveProperty('limit', 10);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should respect page and limit parameters', async () => {
      const res = await request(app).get('/equipements?page=2&limit=5');
      expect(res.statusCode).toBe(200);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(5);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should limit max results to 100', async () => {
      const res = await request(app).get('/equipements?limit=500');
      expect(res.statusCode).toBe(200);
      expect(res.body.pagination.limit).toBeLessThanOrEqual(100);
    });
  });

  // Filtres
  describe('GET /equipements - Filters', () => {
    it('should filter by commune', async () => {
      const res = await request(app).get('/equipements?commune=Paris&limit=5');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('filters');
      expect(res.body.filters.commune).toBe('Paris');
    });

    it('should filter by accessible', async () => {
      const res = await request(app).get('/equipements?accessible=true&limit=5');
      expect(res.statusCode).toBe(200);
      expect(res.body.filters.accessible).toBe('true');
    });

    it('should filter by type', async () => {
      const res = await request(app).get('/equipements?type=piscine&limit=5');
      expect(res.statusCode).toBe(200);
      expect(res.body.filters.type).toBe('piscine');
    });

    it('should handle search query', async () => {
      const res = await request(app).get('/equipements?search=stade&limit=5');
      expect(res.statusCode).toBe(200);
      expect(res.body.filters.search).toBe('stade');
    });

    it('should combine multiple filters', async () => {
      const res = await request(app).get('/equipements?commune=Paris&accessible=true&limit=5');
      expect(res.statusCode).toBe(200);
      expect(res.body.filters.commune).toBe('Paris');
      expect(res.body.filters.accessible).toBe('true');
    });
  });

  // Statistiques — insère ses propres données pour être indépendant
  describe('GET /equipements/stats', () => {

    beforeAll(async () => {
      await request(app).post('/equipements').send({
        equip_numero: 'STATS_TEST_001',
        equip_nom: 'Stade Stats Test',
        commune_nom: 'Paris'
      });
      await request(app).post('/equipements').send({
        equip_numero: 'STATS_TEST_002',
        equip_nom: 'Piscine Stats Test',
        commune_nom: 'Lyon'
      });
    });

    afterAll(async () => {
      await db.query("DELETE FROM equipements WHERE equip_numero LIKE 'STATS_TEST_%'");
    });

    it('should return statistics', async () => {
      const res = await request(app).get('/equipements/stats');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('stats');
      expect(res.body.stats).toHaveProperty('total');
      expect(res.body.stats).toHaveProperty('communes');
      expect(res.body.stats).toHaveProperty('accessible');
      expect(res.body.stats).toHaveProperty('byType');
      expect(res.body.stats).toHaveProperty('byCommune');
    });

    it('should return valid statistics values', async () => {
      const res = await request(app).get('/equipements/stats');
      expect(res.body.stats.total).toBeGreaterThan(0);
      expect(res.body.stats.communes).toBeGreaterThan(0);
      expect(Array.isArray(res.body.stats.byType)).toBe(true);
      expect(Array.isArray(res.body.stats.byCommune)).toBe(true);
    });
  });

  // GET par ID
  describe('GET /equipements/:id', () => {
    it('should return a single equipement', async () => {
      const listRes = await request(app).get('/equipements?limit=1');
      const validId = listRes.body.data[0]?.id;

      if (validId) {
        const res = await request(app).get(`/equipements/${validId}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('id', validId);
      }
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app).get('/equipements/999999');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // POST
  describe('POST /equipements', () => {
    it('should create a new equipement', async () => {
      const res = await request(app)
        .post('/equipements')
        .send({
          equip_numero: `TEST_CREATE_${Date.now()}`,
          equip_nom: 'Stade de Test',
          commune_nom: 'Paris'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('equip_nom', 'Stade de Test');

      // Cleanup
      if (res.body.data?.id) {
        await request(app).delete(`/equipements/${res.body.data.id}`);
      }
    });

    it('should reject equipement without required fields', async () => {
      const res = await request(app)
        .post('/equipements')
        .send({ equip_nom: 'Sans numéro' }); // manque equip_numero

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should reject duplicate equip_numero', async () => {
      const payload = {
        equip_numero: `TEST_DUP_${Date.now()}`,
        equip_nom: 'Test Doublon',
        commune_nom: 'Paris'
      };

      const first = await request(app).post('/equipements').send(payload);
      expect(first.statusCode).toBe(201);

      const second = await request(app).post('/equipements').send(payload);
      expect(second.statusCode).toBe(409);

      // Cleanup
      if (first.body.data?.id) {
        await request(app).delete(`/equipements/${first.body.data.id}`);
      }
    });
  });

  // PUT
  describe('PUT /equipements/:id', () => {
    let createdId;

    beforeAll(async () => {
      const res = await request(app).post('/equipements').send({
        equip_numero: `TEST_UPDATE_${Date.now()}`,
        equip_nom: 'Original',
        commune_nom: 'Paris'
      });
      createdId = res.body.data?.id;
    });

    afterAll(async () => {
      if (createdId) {
        await request(app).delete(`/equipements/${createdId}`);
      }
    });

    it('should update an equipement', async () => {
      const res = await request(app)
        .put(`/equipements/${createdId}`)
        .send({ equip_nom: 'Modifié' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.equip_nom).toBe('Modifié');
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .put('/equipements/999999')
        .send({ equip_nom: 'Test' });

      expect(res.statusCode).toBe(404);
    });
  });

  // DELETE
  describe('DELETE /equipements/:id', () => {
    it('should delete an equipement', async () => {
      const createRes = await request(app).post('/equipements').send({
        equip_numero: `TEST_DELETE_${Date.now()}`,
        equip_nom: 'A Supprimer',
        commune_nom: 'Paris'
      });

      const id = createRes.body.data?.id;

      const deleteRes = await request(app).delete(`/equipements/${id}`);
      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body).toHaveProperty('success', true);

      const getRes = await request(app).get(`/equipements/${id}`);
      expect(getRes.statusCode).toBe(404);
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app).delete('/equipements/999999');
      expect(res.statusCode).toBe(404);
    });
  });

  // 404
  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/unknown-route');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  // Fermer la connexion DB
  afterAll(async () => {
    await db.pool.end();
  });
});