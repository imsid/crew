from __future__ import annotations

from importlib.metadata import PackageNotFoundError, version


def crew_version() -> str:
    try:
        return version("mash-crew")
    except PackageNotFoundError:
        return "0.0.0+dev"
