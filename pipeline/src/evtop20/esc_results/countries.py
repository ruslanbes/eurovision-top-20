from __future__ import annotations

from evtop20.title_parse.countries import COUNTRY_ALIASES

# EurovisionAPI/dataset `data/countries.json` (release 2026.5).
_CODE_TO_COUNTRY_NAME: dict[str, str] = {
    "AL": "Albania",
    "AD": "Andorra",
    "AM": "Armenia",
    "AU": "Australia",
    "AT": "Austria",
    "AZ": "Azerbaijan",
    "BY": "Belarus",
    "BE": "Belgium",
    "BA": "Bosnia and Herzegovina",
    "BG": "Bulgaria",
    "HR": "Croatia",
    "CY": "Cyprus",
    "CZ": "Czechia",
    "DK": "Denmark",
    "EE": "Estonia",
    "FI": "Finland",
    "FR": "France",
    "GE": "Georgia",
    "DE": "Germany",
    "GR": "Greece",
    "HU": "Hungary",
    "IS": "Iceland",
    "IE": "Ireland",
    "IL": "Israel",
    "IT": "Italy",
    "KZ": "Kazakhstan",
    "LV": "Latvia",
    "LT": "Lithuania",
    "LU": "Luxembourg",
    "MT": "Malta",
    "MD": "Moldova",
    "MC": "Monaco",
    "ME": "Montenegro",
    "MA": "Morocco",
    "MK": "North Macedonia",
    "NL": "Netherlands",
    "NO": "Norway",
    "PL": "Poland",
    "PT": "Portugal",
    "RO": "Romania",
    "RU": "Russia",
    "SM": "San Marino",
    "RS": "Serbia",
    "CS": "Serbia and Montenegro",
    "SK": "Slovakia",
    "SI": "Slovenia",
    "ES": "Spain",
    "SE": "Sweden",
    "CH": "Switzerland",
    "TR": "Turkey",
    "UA": "Ukraine",
    "GB": "United Kingdom",
    "GB-WLS": "Wales",
    "YU": "Yugoslavia",
}

_COUNTRY_TO_CODE: dict[str, str] = {
    name: code for code, name in _CODE_TO_COUNTRY_NAME.items()
}
for alias, canonical in {
    **COUNTRY_ALIASES,
    "Bosnia & Herzegovina": "Bosnia and Herzegovina",
}.items():
    if canonical in _COUNTRY_TO_CODE:
        _COUNTRY_TO_CODE[alias] = _COUNTRY_TO_CODE[canonical]


def country_to_code(country: str) -> str | None:
    return _COUNTRY_TO_CODE.get(country)
