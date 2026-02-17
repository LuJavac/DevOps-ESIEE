-- Script d'initialisation de la base de données equipements

-- Suppression de la table si elle existe déjà
DROP TABLE IF EXISTS equipements CASCADE;

-- Création de la table equipements
CREATE TABLE equipements (
    id SERIAL PRIMARY KEY,
    equip_nom VARCHAR(255) NOT NULL,
    commune_nom VARCHAR(255) NOT NULL,
    equip_type VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX idx_commune ON equipements(commune_nom);
CREATE INDEX idx_type ON equipements(equip_type);

-- Données de test
INSERT INTO equipements (equip_nom, commune_nom, equip_type, latitude, longitude) VALUES
('Stade Municipal', 'Paris', 'Stade', 48.8566, 2.3522),
('Piscine Olympique', 'Lyon', 'Piscine', 45.7640, 4.8357),
('Court de Tennis', 'Marseille', 'Tennis', 43.2965, 5.3698),
('Gymnase des Sports', 'Toulouse', 'Gymnase', 43.6047, 1.4442),
('Terrain de Football', 'Nice', 'Football', 43.7102, 7.2620);