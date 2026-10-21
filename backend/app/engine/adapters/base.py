from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime


class BaseSimulatorAdapter(ABC):
    def __init__(self, name: str, default_endpoint: str):
        self.name = name
        self.default_endpoint = default_endpoint
        self._connected = False
        self._last_probe = datetime.utcnow()
        self._diagnostics = "Standby - probing for external hardware / software simulator."

    @abstractmethod
    def probe_connection(self) -> bool:
        """Inspects environment or port to verify if external simulator is genuinely active."""
        pass

    @abstractmethod
    def read_telemetry(self) -> Optional[Dict[str, Any]]:
        """Returns live external telemetry if connected, or None if unavailable."""
        pass

    def get_status(self) -> Dict[str, Any]:
        return {
            "adapter_name": self.name,
            "supported": True,
            "connection_status": "CONNECTED" if self._connected else "DISCONNECTED",
            "target_endpoint": self.default_endpoint,
            "last_probe_time": self._last_probe.isoformat(),
            "telemetry_streaming": self._connected,
            "diagnostics": self._diagnostics,
        }
