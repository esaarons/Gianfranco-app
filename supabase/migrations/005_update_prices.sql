-- ─────────────────────────────────────────────────────────────────────────────
-- 005_update_prices.sql
-- Carga precios reales de la carta Gianfranco (en Soles S/).
-- Ejecutar DESPUÉS de 004_replace_products.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Espresso Bar ─────────────────────────────────────────────────────────────
UPDATE products SET price =  8 WHERE name = 'Espresso / Ristretto';
UPDATE products SET price =  8 WHERE name = 'Americano';
UPDATE products SET price = 10 WHERE name = 'Cortado';
UPDATE products SET price = 10 WHERE name = 'Macchiato';
UPDATE products SET price = 10 WHERE name = 'Cappuccino';
UPDATE products SET price = 11 WHERE name = 'Latte';
UPDATE products SET price = 14 WHERE name = 'Vanilla Latte';
UPDATE products SET price = 14 WHERE name = 'Caramel Latte';
UPDATE products SET price = 14 WHERE name = 'Hazelnut Latte';
UPDATE products SET price = 15 WHERE name = 'Salted Caramel Latte';
UPDATE products SET price = 11 WHERE name = 'Flat White';
UPDATE products SET price = 14 WHERE name = 'Stumpy';
UPDATE products SET price = 12 WHERE name = 'Mocaccino';

-- ── Brew Bar ──────────────────────────────────────────────────────────────────
UPDATE products SET price = 12 WHERE name = 'Blend de la Casa';
UPDATE products SET price = 14 WHERE name = 'V60 / Origami';
UPDATE products SET price = 14 WHERE name = 'Aeropress';
UPDATE products SET price = 14 WHERE name = 'Prensa Francesa';
UPDATE products SET price = 16 WHERE name = 'Clever';
UPDATE products SET price = 17 WHERE name = 'Chemex';
UPDATE products SET price = 21 WHERE name = 'Sifón Japonés';
UPDATE products SET price = 18 WHERE name = 'Café Turco';

-- ── Cold Drinks ───────────────────────────────────────────────────────────────
UPDATE products SET price = 13 WHERE name = 'Espresso Tonic';
UPDATE products SET price = 13 WHERE name = 'Lemon Cold Brew';
UPDATE products SET price = 14 WHERE name = 'Cold Brew Tonic';
UPDATE products SET price = 14 WHERE name = 'Orange Cold Brew';
UPDATE products SET price = 14 WHERE name = 'Passion Fruit Cold Brew';
UPDATE products SET price = 14 WHERE name = 'Hibiscus Cold Brew';
UPDATE products SET price = 14 WHERE name = 'Berry Cold Brew';
UPDATE products SET price = 18 WHERE name = 'On The Rocks Cold Brew';
UPDATE products SET price = 14 WHERE name = 'Cappushaker';
UPDATE products SET price = 16 WHERE name = 'Caramel Frappe';
UPDATE products SET price = 14 WHERE name = 'Coffee Frappe';
UPDATE products SET price = 16 WHERE name = 'Choco Frappe';

-- ── Cafés Especiales ──────────────────────────────────────────────────────────
UPDATE products SET price = 22 WHERE name = 'Geisha Lavado - Río Tambo';
UPDATE products SET price = 26 WHERE name = 'Marshell Natural - La Coipa';
UPDATE products SET price = 26 WHERE name = 'Geisha Lavado - Inkawasi';
UPDATE products SET price = 28 WHERE name = 'Geisha Natural - Chirinos';

-- ── Matcha Bar ────────────────────────────────────────────────────────────────
UPDATE products SET price = 12 WHERE name = 'Ceremonial Pure Matcha';
UPDATE products SET price = 14 WHERE name = 'Matcha Latte';
UPDATE products SET price = 16 WHERE name = 'Iced Matcha Latte';
UPDATE products SET price = 18 WHERE name = 'Iced Vanilla Matcha';
UPDATE products SET price = 18 WHERE name = 'Iced Caramel Matcha';
UPDATE products SET price = 18 WHERE name = 'Iced Hazelnut Matcha';
UPDATE products SET price = 16 WHERE name = 'Orange Matcha';
UPDATE products SET price = 16 WHERE name = 'Maracumatcha';
UPDATE products SET price = 18 WHERE name = 'Iced Mango Matcha';
UPDATE products SET price = 18 WHERE name = 'Iced Berry Matcha';
UPDATE products SET price = 18 WHERE name = 'Iced Strawberry Matcha';

-- ── Specialty Lattes ──────────────────────────────────────────────────────────
UPDATE products SET price = 12 WHERE name = 'Golden Milk';
UPDATE products SET price = 12 WHERE name = 'Chai Latte';
UPDATE products SET price = 15 WHERE name = 'Vanilla Chai Latte';
UPDATE products SET price = 15 WHERE name = 'Caramel Chai Latte';
UPDATE products SET price = 15 WHERE name = 'Hazelnut Chai Latte';
UPDATE products SET price = 12 WHERE name = 'Hot Choco';
UPDATE products SET price = 14 WHERE name = 'Iced Pink Latte';
UPDATE products SET price = 14 WHERE name = 'Iced Blue Latte';
UPDATE products SET price = 22 WHERE name = 'Ice Cream Pistacho Latte';

-- ── Jugos ─────────────────────────────────────────────────────────────────────
UPDATE products SET price = 12 WHERE name = 'Naranja';
UPDATE products SET price = 14 WHERE name = 'Berries';
UPDATE products SET price = 14 WHERE name = 'Tropical';
UPDATE products SET price = 14 WHERE name = 'Sunrise';
UPDATE products SET price = 14 WHERE name = 'Detox';
UPDATE products SET price = 14 WHERE name = 'Natura';

-- ── Refresh ───────────────────────────────────────────────────────────────────
UPDATE products SET price = 14 WHERE name = 'Iced Blue Lemonade';
UPDATE products SET price = 14 WHERE name = 'Limonada Frozen';
UPDATE products SET price = 14 WHERE name = 'Iced Soda';

-- ── Tostones ─────────────────────────────────────────────────────────────────
UPDATE products SET price = 24 WHERE name = 'Tostón Apaltado';
UPDATE products SET price = 24 WHERE name = 'Grilled Cheese';
UPDATE products SET price = 24 WHERE name = 'Tostón Caprese';
UPDATE products SET price = 25 WHERE name = 'Tostón Veggie';
UPDATE products SET price = 22 WHERE name = 'Hummus de la Casa';
UPDATE products SET price = 20 WHERE name = 'Egg and Soldiers';

-- ── Sandwiches ───────────────────────────────────────────────────────────────
UPDATE products SET price = 26 WHERE name = 'Gianfranco';
UPDATE products SET price = 26 WHERE name = 'Garlic';
UPDATE products SET price = 23 WHERE name = 'Mixto';
UPDATE products SET price = 26 WHERE name = 'Djoko';
UPDATE products SET price = 23 WHERE name = 'Apaltado';
UPDATE products SET price = 26 WHERE name = 'Pollo y Palta';

-- ── Quiche ────────────────────────────────────────────────────────────────────
UPDATE products SET price = 25 WHERE name = 'Quiche Poro y Tocino';

-- ── Ensaladas ────────────────────────────────────────────────────────────────
UPDATE products SET price = 22 WHERE name = 'Ensalada del Bosque';
UPDATE products SET price = 22 WHERE name = 'Ensalada Mediterránea';
UPDATE products SET price = 22 WHERE name = 'Ensalada Quinoa';

-- ── Pastas ────────────────────────────────────────────────────────────────────
UPDATE products SET price = 36 WHERE name = 'Ravioles de la Casa';
UPDATE products SET price = 32 WHERE name = 'Tagliatelle al Huevo';

-- ── Pizzas ────────────────────────────────────────────────────────────────────
UPDATE products SET price = 45 WHERE name = 'Pizza Garlic';
UPDATE products SET price = 42 WHERE name = 'Pizza Pesto';
UPDATE products SET price = 48 WHERE name = 'Pizza Prosciutto';
UPDATE products SET price = 45 WHERE name = 'Pizza Veggie';
UPDATE products SET price = 40 WHERE name = 'Pizza Tropical';
UPDATE products SET price = 49 WHERE name = 'Pizza Dora';
UPDATE products SET price = 38 WHERE name = 'Pizza Margarita';
UPDATE products SET price = 55 WHERE name = 'Pizzacchio';

-- ── Postres ───────────────────────────────────────────────────────────────────
UPDATE products SET price = 24 WHERE name = 'Torta de Chocolate';
UPDATE products SET price = 24 WHERE name = 'Tostada Francesa';
UPDATE products SET price = 16 WHERE name = 'Affogato';
UPDATE products SET price = 25 WHERE name = 'Apple Crumble con Helado';
UPDATE products SET price = 25 WHERE name = 'Tarta de Frambuesa y Pistacho';
UPDATE products SET price = 22 WHERE name = 'Cheesecake de Frutos Rojos';
UPDATE products SET price = 25 WHERE name = 'Cheesecake de Pistacho';
UPDATE products SET price = 14 WHERE name = 'Alfajor de Pistacho';
UPDATE products SET price = 24 WHERE name = 'Pastel de Pistacho';

-- ── Smoothie Bowls ────────────────────────────────────────────────────────────
UPDATE products SET price = 25 WHERE name = 'Açaí Bowl';
UPDATE products SET price = 25 WHERE name = 'Tropical Bowl';
UPDATE products SET price = 18 WHERE name = 'Chía Pudín';
UPDATE products SET price = 19 WHERE name = 'Avena Porridge';

-- ── Vitrina ───────────────────────────────────────────────────────────────────
UPDATE products SET price = 14 WHERE name = 'Croissant Relleno';
UPDATE products SET price = 14 WHERE name = 'Carrot Cake';
UPDATE products SET price = 12 WHERE name = 'Banana Cake';
UPDATE products SET price = 12 WHERE name = 'Blueberry Muffin';
UPDATE products SET price =  6 WHERE name = 'Galleta Chocolate con Pecanas';
UPDATE products SET price =  6 WHERE name = 'Galleta de Avena y Almendras';
UPDATE products SET price = 12 WHERE name = 'Galletón Relleno';
UPDATE products SET price =  7 WHERE name = 'Alfajor Clásico';
UPDATE products SET price = 10 WHERE name = 'Alfajor de Chocolate';

-- Verificación
SELECT name, price FROM products WHERE price = 0 ORDER BY name;
-- Si retorna filas vacías, todos los precios fueron asignados correctamente.
