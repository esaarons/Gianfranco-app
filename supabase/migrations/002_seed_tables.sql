-- ═══════════════════════════════════════════════════════════════
-- Seed: Áreas, Mesas, Usuario Admin inicial
-- ═══════════════════════════════════════════════════════════════

-- Áreas
INSERT INTO areas (id, name, type) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Barra / Servicio', 'bar'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Cocina', 'kitchen');

-- Mesas — Salón 1
INSERT INTO tables (code, zone, capacity) VALUES
  ('M1', 'salon1', 2),
  ('M2', 'salon1', 2),
  ('M3', 'salon1', 2),
  ('M4', 'salon1', 2),
  ('M5', 'salon1', 2);

-- Mesas — Salón 2
INSERT INTO tables (code, zone, capacity) VALUES
  ('V1', 'salon2', 2),
  ('V2', 'salon2', 2),
  ('G1', 'salon2', 4),
  ('G2', 'salon2', 4);

-- Mesas — Terraza
INSERT INTO tables (code, zone, capacity) VALUES
  ('TG', 'terrace', 4),
  ('T1', 'terrace', 2),
  ('T2', 'terrace', 2),
  ('T3', 'terrace', 2);

-- Usuario admin inicial (password: admin1234)
-- bcrypt hash para 'admin1234': $2b$10$...
INSERT INTO users (name, email, role, pin, active) VALUES
  ('Administrador', 'admin@gianfranco.com', 'admin', '1234', true),
  ('Barra Demo',    'bar@gianfranco.com',   'bar',   '2222', true),
  ('Cocina Demo',   'kitchen@gianfranco.com','kitchen','3333',true),
  ('Salón Demo',    'salon@gianfranco.com',  'salon', '4444', true);
