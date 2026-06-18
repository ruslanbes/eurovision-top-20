from __future__ import annotations

VIRTUAL_WORLD_COUNTRY = "World"

# Canonical country name -> flag emoji for Eurovision entrants in this corpus.
COUNTRY_TO_FLAG: dict[str, str] = {
    "Albania": "🇦🇱",
    "Armenia": "🇦🇲",
    "Australia": "🇦🇺",
    "Austria": "🇦🇹",
    "Azerbaijan": "🇦🇿",
    "Belgium": "🇧🇪",
    "Bulgaria": "🇧🇬",
    "Croatia": "🇭🇷",
    "Cyprus": "🇨🇾",
    "Czechia": "🇨🇿",
    "Denmark": "🇩🇰",
    "Estonia": "🇪🇪",
    "Finland": "🇫🇮",
    "France": "🇫🇷",
    "Georgia": "🇬🇪",
    "Germany": "🇩🇪",
    "Greece": "🇬🇷",
    "Iceland": "🇮🇸",
    "Ireland": "🇮🇪",
    "Israel": "🇮🇱",
    "Italy": "🇮🇹",
    "Latvia": "🇱🇻",
    "Lithuania": "🇱🇹",
    "Luxembourg": "🇱🇺",
    "Malta": "🇲🇹",
    "Moldova": "🇲🇩",
    "Netherlands": "🇳🇱",
    "North Macedonia": "🇲🇰",
    "Norway": "🇳🇴",
    "Poland": "🇵🇱",
    "Portugal": "🇵🇹",
    "Romania": "🇷🇴",
    "Russia": "🇷🇺",
    "San Marino": "🇸🇲",
    "Serbia": "🇷🇸",
    "Slovakia": "🇸🇰",
    "Slovenia": "🇸🇮",
    "Spain": "🇪🇸",
    "Sweden": "🇸🇪",
    "Switzerland": "🇨🇭",
    "Turkey": "🇹🇷",
    "Ukraine": "🇺🇦",
    "United Kingdom": "🇬🇧",
    VIRTUAL_WORLD_COUNTRY: "🌍",
}

# Alternate spellings seen in video titles -> canonical country name.
COUNTRY_ALIASES: dict[str, str] = {
    "Czech Republic": "Czechia",
    "F.Y.R. Macedonia": "North Macedonia",
    "The Netherlands": "Netherlands",
    "Türkiye": "Turkey",
}

FLAG_TO_COUNTRY: dict[str, str] = {
    flag: country for country, flag in COUNTRY_TO_FLAG.items()
}
