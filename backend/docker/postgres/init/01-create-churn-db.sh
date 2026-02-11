#!/bin/bash
set -e
psql -v ON_ERROR_STOP=1 -U postgres <<-EOSQL
    DROP DATABASE IF EXISTS churn;
    CREATE DATABASE churn;
EOSQL
