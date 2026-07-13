CREATE USER crew_api WITH PASSWORD 'crew_api';
CREATE USER mash_host WITH PASSWORD 'mash_host';
CREATE DATABASE crew_app OWNER crew_api;
CREATE DATABASE mash_runtime OWNER mash_host;
