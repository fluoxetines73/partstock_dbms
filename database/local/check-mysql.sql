-- Run only on mysql-lab as partstock_lab, with database partstock_lab selected.
-- Connection-scoped TEMPORARY table; no application schema is created.
SELECT DATABASE() AS target_database, CURRENT_USER() AS connected_user;
CREATE TEMPORARY TABLE _partstock_environment_check (
  id INT PRIMARY KEY,
  quantity INT NOT NULL
) ENGINE=InnoDB;
INSERT INTO _partstock_environment_check VALUES (1, 10), (2, 20);

START TRANSACTION;
UPDATE _partstock_environment_check SET quantity = quantity - 1;
ROLLBACK;
SELECT IF(
  COUNT(*) = 2 AND SUM(id = 1 AND quantity = 10) = 1 AND SUM(id = 2 AND quantity = 20) = 1,
  'PASS: rollback preserved both rows', 'FAIL: rollback'
) AS rollback_result FROM _partstock_environment_check;

START TRANSACTION;
UPDATE _partstock_environment_check SET quantity = quantity - 1;
COMMIT;
SELECT IF(
  COUNT(*) = 2 AND SUM(id = 1 AND quantity = 9) = 1 AND SUM(id = 2 AND quantity = 19) = 1,
  'PASS: commit updated both rows', 'FAIL: commit'
) AS commit_result FROM _partstock_environment_check;

DROP TEMPORARY TABLE _partstock_environment_check;
