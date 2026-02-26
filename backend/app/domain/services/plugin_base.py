from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class PluginMetadata(BaseModel):
    id: str
    name: str
    description: str
    version: str
    enabled: bool = True
    config_schema: Dict[str, Any] = {}

class IPlugin(ABC):
    @property
    @abstractmethod
    def metadata(self) -> PluginMetadata:
        pass

    @abstractmethod
    async def execute(self, input_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        pass

class PluginRegistry:
    def __init__(self):
        self._plugins: Dict[str, IPlugin] = {}

    def register(self, plugin: IPlugin):
        self._plugins[plugin.metadata.id] = plugin

    def get_plugin(self, plugin_id: str) -> Optional[IPlugin]:
        return self._plugins.get(plugin_id)

    def list_plugins(self) -> List[PluginMetadata]:
        return [p.metadata for p in self._plugins.values()]
