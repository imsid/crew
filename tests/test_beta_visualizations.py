from __future__ import annotations

import httpx

from crew.beta.visualizations import _describe_bigquery_http_error


def test_describe_bigquery_http_error_uses_error_payload_details() -> None:
    request = httpx.Request(
        "POST",
        "https://bigquery.googleapis.com/bigquery/v2/projects/mash-487416/queries",
    )
    response = httpx.Response(
        400,
        request=request,
        json={
            "error": {
                "message": "Unrecognized name: experiment_version at [8:9]",
                "errors": [
                    {
                        "reason": "invalidQuery",
                        "message": "Unrecognized name: experiment_version at [8:9]",
                        "location": "query",
                    }
                ],
            }
        },
    )
    exc = httpx.HTTPStatusError("bad request", request=request, response=response)

    message = _describe_bigquery_http_error(exc)

    assert message == (
        "HTTP 400 - invalidQuery: Unrecognized name: experiment_version at [8:9] "
        "(location: query)"
    )
