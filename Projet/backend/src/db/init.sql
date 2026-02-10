-- Création de la table equipements
CREATE TABLE IF NOT EXISTS equipements (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  adresse TEXT,
  ville VARCHAR(100),
  code_postal VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insertion de données d'exemple (extrait data.gouv.fr)
INSERT INTO equipements (nom, type, adresse, ville, code_postal, latitude, longitude) VALUES
('Stade Municipal', 'Terrain de football', '12 Avenue des Sports', 'Paris', '75001', 48.8566, 2.3522),
('Piscine Olympique', 'Piscine couverte', '45 Rue de la Natation', 'Lyon', '69001', 45.7640, 4.8357),
('Tennis Club', 'Courts de tennis', '8 Boulevard du Tennis', 'Marseille', '13001', 43.2965, 5.3698),
('Gymnase Central', 'Salle multisports', '23 Rue du Sport', 'Toulouse', '31000', 43.6047, 1.4442),
('Terrain de Basket', 'Terrain extérieur', '67 Avenue des Loisirs', 'Nice', '06000', 43.7102, 7.2620);

-- Afficher le résultat
SELECT * FROM equipements;