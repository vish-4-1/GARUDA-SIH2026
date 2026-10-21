import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.scenario import Scenario, ScenarioConfiguration
from app.schemas.scenario import ScenarioCreate, ScenarioUpdate, ScenarioOut

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])


@router.get("", response_model=List[ScenarioOut])
def list_scenarios(
    difficulty: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Scenario).filter(Scenario.status == "active")
    if difficulty:
        query = query.filter(Scenario.difficulty == difficulty)
    if environment:
        query = query.filter(Scenario.environment == environment)
    if search:
        query = query.filter(Scenario.name.ilike(f"%{search}%") | Scenario.description.ilike(f"%{search}%"))
    return query.order_by(Scenario.is_preset.desc(), Scenario.created_at.desc()).all()


@router.post("", response_model=ScenarioOut, status_code=201)
def create_scenario(data: ScenarioCreate, db: Session = Depends(get_db)):
    scenario_id = str(uuid.uuid4())
    scenario = Scenario(
        id=scenario_id,
        name=data.name,
        description=data.description,
        environment=data.environment,
        difficulty=data.difficulty,
        duration_seconds=data.duration_seconds,
        seed=data.seed,
        status="active",
        is_preset=0
    )
    db.add(scenario)
    db.flush()

    cfg_data = data.configuration
    if cfg_data:
        cfg = ScenarioConfiguration(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            num_entities=cfg_data.num_entities,
            threat_density=cfg_data.threat_density,
            sensor_reliability=cfg_data.sensor_reliability,
            observation_delay_mean=cfg_data.observation_delay_mean,
            observation_delay_jitter=cfg_data.observation_delay_jitter,
            observation_loss_rate=cfg_data.observation_loss_rate,
            noise_level=cfg_data.noise_level,
            weather=cfg_data.weather,
            radar_coverage_percent=cfg_data.radar_coverage_percent,
            rf_scanner_enabled=cfg_data.rf_scanner_enabled,
            acoustic_sensor_enabled=cfg_data.acoustic_sensor_enabled,
            optical_eoir_enabled=cfg_data.optical_eoir_enabled,
            extra_params=cfg_data.extra_params or {}
        )
    else:
        cfg = ScenarioConfiguration(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id
        )
    db.add(cfg)
    db.commit()
    db.refresh(scenario)
    return scenario


@router.get("/{scenario_id}", response_model=ScenarioOut)
def get_scenario(scenario_id: str, db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


@router.patch("/{scenario_id}", response_model=ScenarioOut)
def update_scenario(scenario_id: str, data: ScenarioUpdate, db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    update_data = data.model_dump(exclude_unset=True)
    cfg_data = update_data.pop("configuration", None)

    for field, val in update_data.items():
        setattr(scenario, field, val)

    if cfg_data and scenario.configuration:
        for cfield, cval in cfg_data.items():
            if hasattr(scenario.configuration, cfield):
                setattr(scenario.configuration, cfield, cval)

    db.commit()
    db.refresh(scenario)
    return scenario


@router.post("/{scenario_id}/duplicate", response_model=ScenarioOut)
def duplicate_scenario(scenario_id: str, db: Session = Depends(get_db)):
    orig = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not orig:
        raise HTTPException(status_code=404, detail="Scenario not found")

    new_id = str(uuid.uuid4())
    clone = Scenario(
        id=new_id,
        name=f"{orig.name} (Copy)",
        description=orig.description,
        environment=orig.environment,
        difficulty=orig.difficulty,
        duration_seconds=orig.duration_seconds,
        seed=orig.seed + 1,
        status="active",
        is_preset=0
    )
    db.add(clone)
    db.flush()

    if orig.configuration:
        ocfg = orig.configuration
        ncfg = ScenarioConfiguration(
            id=str(uuid.uuid4()),
            scenario_id=new_id,
            num_entities=ocfg.num_entities,
            threat_density=ocfg.threat_density,
            sensor_reliability=ocfg.sensor_reliability,
            observation_delay_mean=ocfg.observation_delay_mean,
            observation_delay_jitter=ocfg.observation_delay_jitter,
            observation_loss_rate=ocfg.observation_loss_rate,
            noise_level=ocfg.noise_level,
            weather=ocfg.weather,
            radar_coverage_percent=ocfg.radar_coverage_percent,
            rf_scanner_enabled=ocfg.rf_scanner_enabled,
            acoustic_sensor_enabled=ocfg.acoustic_sensor_enabled,
            optical_eoir_enabled=ocfg.optical_eoir_enabled,
            extra_params=ocfg.extra_params or {}
        )
        db.add(ncfg)

    db.commit()
    db.refresh(clone)
    return clone
