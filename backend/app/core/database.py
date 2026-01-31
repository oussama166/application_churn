"""PostgreSQL async connection (SQLAlchemy 2.0 + asyncpg)."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.core.config import settings


class Base(DeclarativeBase):
    pass


class ChurnScoreLog(Base):
    """Log of churn score API calls (batch scoring audit)."""

    __tablename__ = "churn_score_log"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    churn_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_segment: Mapped[str] = mapped_column(String(32), nullable=False)
    customer_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )


class BatchUpload(Base):
    """Batch upload of customers for churn scoring."""

    __tablename__ = "batch_upload"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String(256), nullable=False)
    total_rows: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="completed")
    dataset_stats: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    kpis: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )


class BatchRecord(Base):
    """Single record from a batch upload with prediction."""

    __tablename__ = "batch_record"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    upload_id: Mapped[int] = mapped_column(ForeignKey("batch_upload.id"), nullable=False)
    row_index: Mapped[int] = mapped_column(Integer, nullable=False)
    customer_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    raw_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    churn_score: Mapped[float] = mapped_column(Float, nullable=False)
    churn_percentile: Mapped[float] = mapped_column(Float, nullable=False)
    risk_segment: Mapped[str] = mapped_column(String(32), nullable=False)
    kpis: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def try_log_score(churn_score: float, risk_segment: str, customer_ref: str | None) -> bool:
    """Try to log a score to DB. Returns True if saved, False otherwise."""
    try:
        async with db_session() as session:
            session.add(
                ChurnScoreLog(
                    churn_score=churn_score,
                    risk_segment=risk_segment,
                    customer_ref=customer_ref,
                )
            )
        return True
    except Exception:
        return False


async def init_db() -> None:
    """Create tables (idempotent). Log and skip if DB unavailable."""
    import logging
    logger = logging.getLogger(__name__)
    try:
        async with engine.begin() as conn:
            # Create tables
            await conn.run_sync(Base.metadata.create_all)
            # Fix timezone columns if they exist with wrong type
            await _fix_timezone_columns(conn)
        logger.info("Database tables initialized successfully")
    except Exception as e:
        logger.error(f"init_db failed (DB unavailable): {e!s}", exc_info=True)
        logger.warning("Database tables may not exist. Uploads will fail until database is available.")


async def _fix_timezone_columns(conn) -> None:
    """Fix created_at columns to use TIMESTAMP WITH TIME ZONE if they're currently TIMESTAMP WITHOUT TIME ZONE."""
    import logging
    logger = logging.getLogger(__name__)
    try:
        # Check and fix batch_upload.created_at
        await conn.execute(
            text("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'batch_upload' 
                        AND column_name = 'created_at'
                        AND data_type = 'timestamp without time zone'
                    ) THEN
                        ALTER TABLE batch_upload 
                        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;
                    END IF;
                END $$;
            """)
        )
        # Check and fix churn_score_log.created_at
        await conn.execute(
            text("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'churn_score_log' 
                        AND column_name = 'created_at'
                        AND data_type = 'timestamp without time zone'
                    ) THEN
                        ALTER TABLE churn_score_log 
                        ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;
                    END IF;
                END $$;
            """)
        )
        logger.debug("Timezone columns checked/fixed")
    except Exception as e:
        logger.warning(f"Could not fix timezone columns (may not exist yet): {e}")


async def check_db() -> bool:
    """Return True if DB is reachable."""
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


async def check_tables_exist() -> dict[str, bool]:
    """Check if required tables exist in the database."""
    tables = {
        "batch_upload": False,
        "batch_record": False,
        "churn_score_log": False,
    }
    try:
        async with async_session_factory() as session:
            for table_name in tables.keys():
                result = await session.execute(
                    text(
                        """
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = :table_name
                        )
                        """
                    ),
                    {"table_name": table_name},
                )
                tables[table_name] = result.scalar() is True
    except Exception:
        pass
    return tables
