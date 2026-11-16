-- Optional small demo seed. Run once after 001_catalogs.sql on an empty catalog.
START TRANSACTION;
INSERT INTO categories (name) VALUES ('RAM'), ('SSD');
INSERT INTO brands (name) VALUES ('Kingston'), ('Samsung');
COMMIT;
