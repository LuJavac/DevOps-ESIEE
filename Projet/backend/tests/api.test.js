const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

describe('API Tests', () => {
  describe('GET /health', () => {
    it('should return status OK', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'OK');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

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

    it('should cap max results to 100', async () => {
      const res = await request(app).get('/equipements?limit=500');
      expect(res.statusCode).toBe(200);
      expect(res.body.pagination.limit).toBeLessThanOrEqual(100);
    });
  });

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

  describe('GET /equipements/nearby', () => {
    const uniqueId = `NEARBY_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const fixtures = {
      football: {
        equip_numero: `${uniqueId}_A`,
        equip_nom: 'Terrain Football Proche',
        commune_nom: 'Paris',
        inst_adresse: '10 Rue de Paris',
        latitude: 48.8566,
        longitude: 2.3522,
        aps_name: ['Football', 'Course a pied']
      },
      tennis: {
        equip_numero: `${uniqueId}_B`,
        equip_nom: 'Court Tennis Plus Loin',
        commune_nom: 'Paris',
        inst_adresse: '100 Avenue de France',
        latitude: 48.9066,
        longitude: 2.4022,
        aps_name: ['Tennis']
      }
    };

    beforeAll(async () => {
      await request(app).post('/equipements').send(fixtures.football);
      await request(app).post('/equipements').send(fixtures.tennis);
    });

    afterAll(async () => {
      await db.query('DELETE FROM equipements WHERE equip_numero LIKE $1', [`${uniqueId}%`]);
    });

    it('should reject request without lat/lon', async () => {
      const res = await request(app).get('/equipements/nearby?sport=football');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return nearby equipements sorted by distance', async () => {
      const res = await request(app).get('/equipements/nearby?lat=48.8566&lon=2.3522&radius=20&limit=10');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const hasFixture = res.body.data.some((item) => item.equip_numero === fixtures.football.equip_numero);
      expect(hasFixture).toBe(true);

      if (res.body.data.length > 1) {
        expect(Number(res.body.data[0].distance_km)).toBeLessThanOrEqual(Number(res.body.data[1].distance_km));
      }
    });

    it('should apply sport filter on nearby endpoint', async () => {
      const res = await request(app)
        .get('/equipements/nearby?lat=48.8566&lon=2.3522&radius=30&limit=20&sport=football');

      expect(res.statusCode).toBe(200);
      const foundFootballFixture = res.body.data.some(
        (item) => item.equip_numero === fixtures.football.equip_numero
      );
      const foundTennisFixture = res.body.data.some(
        (item) => item.equip_numero === fixtures.tennis.equip_numero
      );

      expect(foundFootballFixture).toBe(true);
      expect(foundTennisFixture).toBe(false);
    });
  });

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

  describe('POST /equipements', () => {
    it('should create a new equipement', async () => {
      const res = await request(app).post('/equipements').send({
        equip_numero: `TEST_CREATE_${Date.now()}`,
        equip_nom: 'Stade de Test',
        commune_nom: 'Paris'
      });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('equip_nom', 'Stade de Test');

      if (res.body.data?.id) {
        await request(app).delete(`/equipements/${res.body.data.id}`);
      }
    });

    it('should reject equipement without required fields', async () => {
      const res = await request(app).post('/equipements').send({ equip_nom: 'Sans numero' });

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

      if (first.body.data?.id) {
        await request(app).delete(`/equipements/${first.body.data.id}`);
      }
    });
  });

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
      const res = await request(app).put(`/equipements/${createdId}`).send({ equip_nom: 'Modifie' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.equip_nom).toBe('Modifie');
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app).put('/equipements/999999').send({ equip_nom: 'Test' });
      expect(res.statusCode).toBe(404);
    });
  });

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

  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/unknown-route');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  afterAll(async () => {
    await db.pool.end();
  });
});
