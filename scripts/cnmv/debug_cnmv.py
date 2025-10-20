#!/usr/bin/env python3
"""
Debug script to see what we're getting from CNMV
"""
import requests

url = "https://cnmv.es/Portal/Consultas/ListadoEntidad.aspx?id=2&tipoent=0"
headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

print(f"Fetching {url}...")
response = requests.get(url, headers=headers)
print(f"Status: {response.status_code}")
print(f"Content length: {len(response.content)}")
print("\nFirst 2000 characters of HTML:")
print(response.text[:2000])
print("\n\nSearching for 'URQUIJO' in content...")
if 'URQUIJO' in response.text:
    print("Found URQUIJO!")
    # Find context around it
    idx = response.text.index('URQUIJO')
    print(response.text[max(0, idx-200):idx+200])
else:
    print("URQUIJO not found in response")

print("\n\nSearching for 'table' tag...")
if '<table' in response.text.lower():
    print("Found table tag!")
else:
    print("No table tag found - likely JavaScript-rendered content")
