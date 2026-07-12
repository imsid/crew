from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest

from crew.shared.workspace_context import current_workspace_id


ROOT = Path(__file__).resolve().parents[1]


def test_crew_api_has_no_embedded_mash_runtime() -> None:
    app_source = (ROOT / "src/crew/beta/app.py").read_text(encoding="utf-8")
    sessions_source = (ROOT / "src/crew/beta/routes/sessions.py").read_text(
        encoding="utf-8"
    )
    assert "from mash.api" not in app_source
    assert "from mash.runtime" not in app_source
    assert ".mount(" not in app_source
    assert "mash_api_app" not in app_source
    assert ".host." not in sessions_source
    assert "ASGITransport" not in sessions_source


def test_crew_host_does_not_import_beta_application() -> None:
    host_source = (ROOT / "src/crew/host.py").read_text(encoding="utf-8")
    assert "crew.beta" not in host_source
    assert ".beta" not in host_source
    assert "CREW_DATABASE_URL" not in host_source


def test_request_metadata_selects_and_validates_workspace(
    tmp_path: Path, monkeypatch
) -> None:
    (tmp_path / "marketing_db").mkdir()
    monkeypatch.setenv("CREW_WORKSPACE_ROOT", str(tmp_path))
    with patch(
        "crew.shared.workspace_context.get_request_metadata",
        return_value={"workspace": "marketing_db"},
    ):
        assert current_workspace_id() == "marketing_db"

    with patch(
        "crew.shared.workspace_context.get_request_metadata",
        return_value={"workspace": "missing"},
    ):
        with pytest.raises(ValueError, match="does not exist"):
            current_workspace_id()


def test_request_metadata_rejects_empty_workspace() -> None:
    with patch(
        "crew.shared.workspace_context.get_request_metadata",
        return_value={"workspace": ""},
    ):
        with pytest.raises(ValueError, match="non-empty"):
            current_workspace_id()
