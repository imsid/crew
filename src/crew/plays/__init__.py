"""Warehouse and CRM access for play workflows.

The deterministic half of the 'Own NRR' motion: BigQuery reads through
:class:`PlayRuntimeContext` that manufacture the dip and product-qualified-account
signals. Judgment over those numbers belongs to the ``growth`` agent. See
src/crew/context/** for the company context it reasons over.
"""

from __future__ import annotations

from .context import PlayRuntimeContext

__all__ = ["PlayRuntimeContext"]
