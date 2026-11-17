-- Fault injection for the Transaction lab. Applied by run.cjs to a disposable schema only.
-- The application code is NOT modified: triggers raise the error from inside the database, so the real
-- backend/src/sales.ts transaction runs unchanged and meets the failure at the points listed in F03 section 6.
CREATE TABLE lab_faults (
    point VARCHAR(40) NOT NULL PRIMARY KEY,
    armed TINYINT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

INSERT INTO lab_faults (point) VALUES ('before_stock_update'), ('before_ledger'), ('hang_before_commit');

-- Point 1: after the order status changed, before any stock row is touched.
CREATE TRIGGER lab_fault_inventory BEFORE UPDATE ON inventory FOR EACH ROW
BEGIN
    IF (SELECT armed FROM lab_faults WHERE point = 'before_stock_update') = 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'LAB fault: before_stock_update';
    END IF;
END;

-- Point 2: stock already deducted, ledger row not yet written.
-- Point 4: every write done, COMMIT not yet sent; the runner kills the connection while it sleeps here.
CREATE TRIGGER lab_fault_ledger BEFORE INSERT ON stock_movements FOR EACH ROW
BEGIN
    IF (SELECT armed FROM lab_faults WHERE point = 'before_ledger') = 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'LAB fault: before_ledger';
    END IF;
    IF (SELECT armed FROM lab_faults WHERE point = 'hang_before_commit') = 1 THEN
        DO SLEEP(30);
    END IF;
END;
