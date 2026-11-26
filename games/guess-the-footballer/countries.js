// football-data.org's country names, as the season files have them -> ISO code; some countries have two names there.
const COUNTRY_CODES = {
    "Albania": 'AL', "Algeria": 'DZ', "Angola": 'AO', "Argentina": 'AR', "Armenia": 'AM', "Australia": 'AU',
    "Austria": 'AT', "Belgium": 'BE', "Benin": 'BJ', "Bosnia-Herzegovina": 'BA', "Brazil": 'BR', "Bulgaria": 'BG',
    "Burkina Faso": 'BF', "Burundi": 'BI', "Cameroon": 'CM', "Canada": 'CA', "Cape Verde Islands": 'CV',
    "Central African Republic": 'CF', "Chile": 'CL', "China PR": 'CN', "Colombia": 'CO', "Comoros": 'KM',
    "Congo": 'CG', "Congo DR": 'CD', "Costa Rica": 'CR', "Croatia": 'HR', "Czech Republic": 'CZ', "DR Congo": 'CD',
    "Denmark": 'DK', "Dominican Republic": 'DO', "Ecuador": 'EC', "Egypt": 'EG', "England": 'GB-ENG',
    "Equatorial Guinea": 'GQ', "Finland": 'FI', "France": 'FR', "Gabon": 'GA', "Gambia": 'GM', "Georgia": 'GE',
    "Germany": 'DE', "Ghana": 'GH', "Greece": 'GR', "Guadeloupe": 'GP', "Guinea": 'GN', "Guinea-Bissau": 'GW',
    "Haiti": 'HT', "Hungary": 'HU', "Iceland": 'IS', "Indonesia": 'ID', "Ireland": 'IE', "Israel": 'IL',
    "Italy": 'IT', "Ivory Coast": 'CI', "Jamaica": 'JM', "Japan": 'JP', "Kenya": 'KE', "Korea, South": 'KR',
    "Kosovo": 'XK', "Libya": 'LY', "Lithuania": 'LT', "Luxembourg": 'LU', "Malaysia": 'MY', "Mali": 'ML',
    "Martinique": 'MQ', "Mauritania": 'MR', "Mexico": 'MX', "Montenegro": 'ME', "Morocco": 'MA', "Mozambique": 'MZ',
    "Netherlands": 'NL', "New Zealand": 'NZ', "Niger": 'NE', "Nigeria": 'NG', "North Macedonia": 'MK',
    "Northern Ireland": 'GB-NIR', "Norway": 'NO', "Paraguay": 'PY', "Peru": 'PE', "Philippines": 'PH', "Poland": 'PL',
    "Portugal": 'PT', "Romania": 'RO', "Russia": 'RU', "Saudi Arabia": 'SA', "Scotland": 'GB-SCT', "Senegal": 'SN',
    "Serbia": 'RS', "Sierra Leone": 'SL', "Slovakia": 'SK', "Slovenia": 'SI', "South Korea": 'KR', "Spain": 'ES',
    "Suriname": 'SR', "Sweden": 'SE', "Switzerland": 'CH', "Tanzania": 'TZ', "Thailand": 'TH', "Togo": 'TG',
    "Tunisia": 'TN', "Turkey": 'TR', "USA": 'US', "Ukraine": 'UA', "Uruguay": 'UY', "Uzbekistan": 'UZ',
    "Venezuela": 'VE', "Wales": 'GB-WLS', "Zambia": 'ZM',
};

if (typeof module !== 'undefined') module.exports = { COUNTRY_CODES };
