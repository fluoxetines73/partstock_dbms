-- UC10: existing stock rows remain unconfigured until a manager sets their threshold.
ALTER TABLE inventory
    ADD COLUMN low_threshold INT NULL DEFAULT NULL,
    ADD CONSTRAINT chk_inventory_low_threshold CHECK (low_threshold >= 0);
