#!/bin/bash
curl -s -X POST 'http://localhost:8000/api/v1/organisations' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Test Organisation",
    "category": "CGPI",
    "email": "contact@test.com",
    "language": "FR",
    "is_active": true
  }'
