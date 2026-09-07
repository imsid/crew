"""One module per table: the SQL that reads and writes it, and nothing else.

Everything that touches BigQuery for the play workflows lives here, split by the
table it addresses:

``play_candidates`` — the shared candidate table every play workflow writes its run
into. ``plays`` — the play definitions the agent creates for a run. ``usage`` — the
``product_usage_db`` signal queries.

Workflow code and agent tools call these functions directly. There is no service
layer in between.
"""
