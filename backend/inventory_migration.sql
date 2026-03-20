-- ============================================================
-- MedControl — Migración: Gestión de Inventario Médico
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Tabla de ítems de inventario
CREATE TABLE IF NOT EXISTS inventory_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    category    VARCHAR(50)  NOT NULL DEFAULT 'otros',
    unit        VARCHAR(50)  NOT NULL DEFAULT 'unidad',
    sku         VARCHAR(100),
    stock       INTEGER      NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock   INTEGER      NOT NULL DEFAULT 5  CHECK (min_stock >= 0),
    cost_price  NUMERIC(10,2),
    supplier    VARCHAR(200),
    notes       TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_clinic   ON inventory_items(clinic_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(clinic_id, category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_low      ON inventory_items(clinic_id, stock, min_stock);

-- 2. Tabla de movimientos de inventario
CREATE TABLE IF NOT EXISTS inventory_movements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    item_id     UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    type        VARCHAR(20)  NOT NULL CHECK (type IN ('entrada', 'salida', 'ajuste')),
    quantity    INTEGER      NOT NULL,  -- positivo=entrada, negativo=salida
    reason      VARCHAR(300),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item   ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_clinic ON inventory_movements(clinic_id, created_at DESC);

-- 3. Trigger para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON inventory_items;
CREATE TRIGGER trg_inventory_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_inventory_updated_at();

-- 4. Categorías de ejemplo (comentar si no se desea)
-- Las categorías válidas son solo strings libres:
-- medicamentos, material_quirurgico, equipos, insumos_lab, otros
