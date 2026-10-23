import asyncio
import logging
from datetime import datetime
from typing import Dict, Optional, Any
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.simulation import SimulationRun

logger = logging.getLogger("garuda.clock")


class SimulationClockManager:
    """
    Authoritative internal clock manager for GARUDA simulations.
    Ensures at most one background clock loop per simulation run, preventing
    duplicate publishers, race conditions, or duplicate clock loops.
    Thread-safe: schedules workers onto the main server asyncio event loop.
    """
    _instance: Optional["SimulationClockManager"] = None

    def __init__(self):
        self._active_tasks: Dict[str, Any] = {}
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    @classmethod
    def get_instance(cls) -> "SimulationClockManager":
        if cls._instance is None:
            cls._instance = SimulationClockManager()
        return cls._instance

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop
        logger.info("[ClockManager] Captured main server event loop.")

    def is_running(self, run_id: str) -> bool:
        task = self._active_tasks.get(run_id)
        if not task:
            return False
        if hasattr(task, 'done'):
            return not task.done()
        return True

    def start_clock(self, run_id: str) -> bool:
        """
        Starts a single authoritative clock loop for this simulation run.
        If a loop is already running, does not create a duplicate.
        """
        if self.is_running(run_id):
            logger.debug(f"[ClockManager] Run {run_id} clock is already running; skipping duplicate start.")
            return False

        loop = self._loop
        if not loop or loop.is_closed():
            try:
                loop = asyncio.get_running_loop()
                self._loop = loop
            except RuntimeError:
                logger.warning(f"[ClockManager] No active event loop available to start clock for {run_id}")
                return False

        try:
            try:
                curr_loop = asyncio.get_running_loop()
                if curr_loop == loop:
                    task = loop.create_task(self._clock_worker(run_id))
                else:
                    task = asyncio.run_coroutine_threadsafe(self._clock_worker(run_id), loop)
            except RuntimeError:
                task = asyncio.run_coroutine_threadsafe(self._clock_worker(run_id), loop)

            self._active_tasks[run_id] = task
            logger.info(f"[ClockManager] Started authoritative clock loop for run {run_id}")
            return True
        except Exception as e:
            logger.error(f"[ClockManager] Failed to launch clock task for {run_id}: {e}", exc_info=True)
            return False

    def stop_clock(self, run_id: str) -> None:
        """
        Cancels and cleans up the clock loop for a paused, reset, or completed run.
        """
        task = self._active_tasks.pop(run_id, None)
        if task:
            task.cancel()
            logger.info(f"[ClockManager] Stopped clock loop for run {run_id}")

    async def _clock_worker(self, run_id: str) -> None:
        """
        Steps the simulation clock by 1.0 second per real-time second.
        Updates SimulationRun.current_sim_time in SQLite and commits.
        Terminates cleanly when the run finishes, pauses, or is cancelled.
        """
        try:
            while True:
                await asyncio.sleep(1.0)
                db: Session = SessionLocal()
                try:
                    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
                    if not run or run.status != "RUNNING":
                        logger.info(f"[ClockManager] Run {run_id} is no longer RUNNING (status: {run.status if run else 'None'}). Terminating loop.")
                        break

                    new_time = round(run.current_sim_time + 1.0, 2)
                    if new_time >= run.duration_seconds:
                        run.current_sim_time = float(run.duration_seconds)
                        run.status = "COMPLETED"
                        run.completed_at = datetime.utcnow()
                        db.commit()
                        logger.info(f"[ClockManager] Run {run_id} reached duration ({run.duration_seconds}s). Marked COMPLETED.")
                        break
                    else:
                        run.current_sim_time = new_time
                        db.commit()
                except Exception as e:
                    logger.error(f"[ClockManager] Error stepping clock for {run_id}: {e}", exc_info=True)
                    break
                finally:
                    db.close()
        except asyncio.CancelledError:
            logger.info(f"[ClockManager] Clock worker for {run_id} was cancelled cleanly.")
        finally:
            self._active_tasks.pop(run_id, None)


clock_manager = SimulationClockManager.get_instance()
