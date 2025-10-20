# CNMV SGIIC Companies Extraction Report

**Date:** October 20, 2025
**Source:** CNMV Registry (https://cnmv.es/Portal/Consultas/ListadoEntidad.aspx?id=2&tipoent=0)

## Summary

Successfully extracted **117 SGIIC companies** from the CNMV (Comisión Nacional del Mercado de Valores) registry. Note that the initial request mentioned 86 companies, but the actual registry contains 117 companies as of this extraction date.

## Output File

**Location:** `/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/scripts/cnmv/output/cnmv_all_sgiic_raw.json`

## Data Fields

Each company entry contains:
- `name`: Exact company name as registered with CNMV
- `register_number`: CNMV registration number (ranges from 1 to 296)
- `register_date`: Date of registration (DD/MM/YYYY format)
- `address`: Full address with street, postal code, and city
- `street`: Parsed street address
- `city`: Parsed city name
- `postal_code`: Parsed postal code
- `country`: "ES" (Spain)
- `source`: "CNMV Registry 2025"

## Data Quality

- **Total companies:** 117
- **Complete entries:** 117 (100%)
- **Missing data:** 0 (all entries have registration number, date, and address)
- **Address parsing:** 100% success rate (all postal codes and cities extracted)

## Geographic Distribution

| City | Count |
|------|-------|
| Madrid | 94 |
| Barcelona | 8 |
| Bilbao | 4 |
| Valencia | 2 |
| Zaragoza | 2 |
| Alcobendas | 1 |
| Girona | 1 |
| Majadahonda | 1 |
| Málaga | 1 |
| Mondragón | 1 |
| Tarragona | 1 |
| Vizcaya | 1 |

## Registration Numbers

The registry contains non-consecutive registration numbers ranging from:
- **Oldest:** #1 - URQUIJO GESTION (registered 12/11/1985)
- **Newest:** #296 - TESYS ACTIVOS FINANCIEROS SGIIC (registered 24/07/2025)

## Methodology

Data was extracted using the WebFetch tool in multiple batches, then compiled and structured into JSON format. All addresses were parsed to extract:
- Street address
- 5-digit postal codes
- City names

## Notes

1. The actual count of 117 companies exceeds the initial expectation of 86 companies mentioned in the request.
2. Some registration numbers are missing from the sequence (not all numbers from 1-296 are present), indicating companies that may have been deregistered or merged.
3. All 117 companies currently in the registry are included in the output file.
4. Two companies registered in 2025 indicate this is the most current data available.
