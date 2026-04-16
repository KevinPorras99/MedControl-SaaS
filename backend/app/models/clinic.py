import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Clinic(Base):
    __tablename__ = "clinics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    access_code: Mapped[str | None] = mapped_column(String(10), nullable=True, unique=True, index=True)
    subscription_plan: Mapped[str] = mapped_column(
        Enum("basico", "profesional", "clinica", name="subscription_plan"),
        nullable=False, default="basico"
    )
    subscription_status: Mapped[str] = mapped_column(String(50), nullable=False, default="inactive")
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(50))
    address: Mapped[str | None] = mapped_column(String(500))
    # Perfil completo
    legal_id:      Mapped[str | None] = mapped_column(String(50))    # Cédula jurídica
    specialty:     Mapped[str | None] = mapped_column(String(100))   # Tipo de clínica
    schedule:      Mapped[str | None] = mapped_column(String(1000))  # Horario de atención
    city:          Mapped[str | None] = mapped_column(String(100))
    province:      Mapped[str | None] = mapped_column(String(100))
    country:       Mapped[str | None] = mapped_column(String(100), default="Costa Rica")
    postal_code:   Mapped[str | None] = mapped_column(String(20))
    whatsapp:      Mapped[str | None] = mapped_column(String(50))
    second_phone:  Mapped[str | None] = mapped_column(String(50))
    website:       Mapped[str | None] = mapped_column(String(255))
    instagram:     Mapped[str | None] = mapped_column(String(255))
    facebook:      Mapped[str | None] = mapped_column(String(255))
    logo_url:      Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="clinic")
    patients: Mapped[list["Patient"]] = relationship("Patient", back_populates="clinic")
