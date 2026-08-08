-- Idempotent demo masters for local air-conditioning workflows.
INSERT INTO service_catalog (id, account_id, code, item_type, category, name, description, unit, standard_price_minor, estimated_duration_minutes, tax_rate_basis_points, currency, active, sort_order)
SELECT lower(hex(randomblob(16))), b.id, 'AC-SVC-GENERAL', 'service', 'Maintenance', 'Air Conditioner General Service', 'Standard cleaning of filters, blower and drainage check.', 'unit', 12000, 60, 0, 'MYR', 1, 10
FROM business_profiles b WHERE NOT EXISTS (SELECT 1 FROM service_catalog s WHERE s.account_id = b.id AND s.code = 'AC-SVC-GENERAL');

INSERT INTO service_catalog (id, account_id, code, item_type, category, name, description, unit, standard_price_minor, estimated_duration_minutes, tax_rate_basis_points, currency, active, sort_order)
SELECT lower(hex(randomblob(16))), b.id, 'AC-SVC-CHEMICAL', 'service', 'Maintenance', 'Chemical Cleaning Service', 'Chemical wash for indoor coil, blower and drain pan.', 'unit', 25000, 120, 0, 'MYR', 1, 20
FROM business_profiles b WHERE NOT EXISTS (SELECT 1 FROM service_catalog s WHERE s.account_id = b.id AND s.code = 'AC-SVC-CHEMICAL');

INSERT INTO service_catalog (id, account_id, code, item_type, category, name, description, unit, standard_price_minor, estimated_duration_minutes, tax_rate_basis_points, currency, active, sort_order)
SELECT lower(hex(randomblob(16))), b.id, 'AC-SVC-INSPECT', 'service', 'Diagnostics', 'Troubleshooting & Inspection', 'On-site inspection and fault diagnosis; parts excluded.', 'visit', 8000, 45, 0, 'MYR', 1, 30
FROM business_profiles b WHERE NOT EXISTS (SELECT 1 FROM service_catalog s WHERE s.account_id = b.id AND s.code = 'AC-SVC-INSPECT');

INSERT INTO service_catalog (id, account_id, code, item_type, category, name, description, unit, standard_price_minor, estimated_duration_minutes, tax_rate_basis_points, currency, active, sort_order)
SELECT lower(hex(randomblob(16))), b.id, 'AC-SVC-INSTALL', 'service', 'Installation', 'Split Unit Installation', 'Standard back-to-back installation; equipment and extra piping excluded.', 'unit', 55000, 180, 0, 'MYR', 1, 40
FROM business_profiles b WHERE NOT EXISTS (SELECT 1 FROM service_catalog s WHERE s.account_id = b.id AND s.code = 'AC-SVC-INSTALL');

INSERT INTO service_catalog (id, account_id, code, item_type, category, name, description, unit, standard_price_minor, tax_rate_basis_points, currency, active, sort_order)
SELECT lower(hex(randomblob(16))), b.id, 'AC-PROD-R32', 'product', 'Parts & Materials', 'R32 Refrigerant Top-up', 'R32 refrigerant supplied during servicing or repair.', 'kg', 8500, 0, 'MYR', 1, 50
FROM business_profiles b WHERE NOT EXISTS (SELECT 1 FROM service_catalog s WHERE s.account_id = b.id AND s.code = 'AC-PROD-R32');

INSERT INTO service_catalog (id, account_id, code, item_type, category, name, description, unit, standard_price_minor, tax_rate_basis_points, currency, active, sort_order)
SELECT lower(hex(randomblob(16))), b.id, 'AC-PROD-DRAIN', 'product', 'Parts & Materials', 'Drain Pipe Replacement', 'Replacement flexible drain hose or PVC drain pipe.', 'metre', 1800, 0, 'MYR', 1, 60
FROM business_profiles b WHERE NOT EXISTS (SELECT 1 FROM service_catalog s WHERE s.account_id = b.id AND s.code = 'AC-PROD-DRAIN');

INSERT INTO service_catalog (id, account_id, code, item_type, category, name, description, unit, standard_price_minor, tax_rate_basis_points, currency, active, sort_order)
SELECT lower(hex(randomblob(16))), b.id, 'AC-PROD-REMOTE', 'product', 'Parts & Materials', 'Universal Air Conditioner Remote', 'Universal replacement remote with setup.', 'pc', 4500, 0, 'MYR', 1, 70
FROM business_profiles b WHERE NOT EXISTS (SELECT 1 FROM service_catalog s WHERE s.account_id = b.id AND s.code = 'AC-PROD-REMOTE');

INSERT INTO customers (id, account_id, name, phone, whatsapp, email, service_address, notes, tags_json)
SELECT lower(hex(randomblob(16))), b.id, 'Ahmad Faizal', '012-345 6789', '012-345 6789', 'ahmad.faizal@example.test', '18, Jalan Anggerik 3, Kota Kemuning, 40460 Shah Alam, Selangor', 'Mock residential air-conditioning customer.', '["demo","air-conditioning"]'
FROM business_profiles b WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.account_id = b.id AND c.phone = '012-345 6789' AND c.deleted_at IS NULL);

INSERT INTO customers (id, account_id, name, phone, whatsapp, email, service_address, notes, tags_json)
SELECT lower(hex(randomblob(16))), b.id, 'Lim Mei Ling', '017-882 1045', '017-882 1045', 'mei.ling@example.test', '27, Jalan SS 2/55, SS 2, 47300 Petaling Jaya, Selangor', 'Mock small-office air-conditioning customer.', '["demo","air-conditioning"]'
FROM business_profiles b WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.account_id = b.id AND c.phone = '017-882 1045' AND c.deleted_at IS NULL);

INSERT INTO customers (id, account_id, name, phone, whatsapp, email, service_address, notes, tags_json)
SELECT lower(hex(randomblob(16))), b.id, 'Siti Nur Aisyah', '013-660 2488', '013-660 2488', 'siti.aisyah@example.test', '12, Jalan Puteri 5/8, Bandar Puteri, 47100 Puchong, Selangor', 'Mock residential air-conditioning customer.', '["demo","air-conditioning"]'
FROM business_profiles b WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.account_id = b.id AND c.phone = '013-660 2488' AND c.deleted_at IS NULL);
