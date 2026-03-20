import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Numeric, Boolean,
    DateTime, ForeignKey, Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clinic_id  = Column(UUID(as_uuid=True), ForeignKey("clinics.id", ondelete="CASCADE"), nullable=False, index=True)
    name       = Column(String(200), nullable=False)
    category   = Column(String(50), nullable=False, default="otros")
    unit       = Column(String(50), nullable=False, default="unidad")   # unidad, caja, frasco, ampolleta, rollo, par
    sku        = Column(String(100), nullable=True)
    stock      = Column(Integer, nullable=False, default=0)
    min_stock  = Column(Integer, nullable=False, default=5)   # umbral de alerta
    cost_price = Column(Numeric(10, 2), nullable=True)
    supplier   = Column(String(200), nullable=True)
    notes      = Column(Text, nullable=True)
    is_active  = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    movements = relationship("InventoryMovement", back_populates="item", cascade="all, delete-orphan")


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clinic_id  = Column(UUID(as_uuid=True), ForeignKey("clinics.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id    = Column(UUID(as_uuid=True), ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    type       = Column(String(20), nullable=False)   # entrada | salida | ajuste
    quantity   = Column(Integer, nullable=False)       # positivo=incremento, negativo=decremento
    reason     = Column(String(300), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    item = relationship("InventoryItem", back_populates="movements")
    user = relationship("User", foreign_keys=[user_id])
