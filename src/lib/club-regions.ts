export interface ClubCreationRegion {
  id: string;
  label: string;
  country: string;
  countryCode: string;
}

export const clubCreationRegions: ClubCreationRegion[] = [
  { id: "albania", label: "Albania", country: "Albania", countryCode: "AL" },
  { id: "andorra", label: "Andorra", country: "Andorra", countryCode: "AD" },
  { id: "armenia", label: "Armenia", country: "Armenia", countryCode: "AM" },
  { id: "austria", label: "Austria", country: "Austria", countryCode: "AT" },
  { id: "canada", label: "Canada", country: "Canada", countryCode: "CA" },
  { id: "ca-ab", label: "Alberta", country: "Canada", countryCode: "CA" },
  { id: "ca-bc", label: "British Columbia", country: "Canada", countryCode: "CA" },
  { id: "ca-mb", label: "Manitoba", country: "Canada", countryCode: "CA" },
  { id: "ca-nb", label: "New Brunswick", country: "Canada", countryCode: "CA" },
  { id: "ca-ns", label: "Nova Scotia", country: "Canada", countryCode: "CA" },
  { id: "ca-on", label: "Ontario", country: "Canada", countryCode: "CA" },
  { id: "ca-qc", label: "Quebec", country: "Canada", countryCode: "CA" },
  { id: "ca-sk", label: "Saskatchewan", country: "Canada", countryCode: "CA" },
  { id: "azerbaijan", label: "Azerbaijan", country: "Azerbaijan", countryCode: "AZ" },
  { id: "belarus", label: "Belarus", country: "Belarus", countryCode: "BY" },
  { id: "belgium", label: "Belgium", country: "Belgium", countryCode: "BE" },
  { id: "bosnia-and-herzegovina", label: "Bosnia and Herzegovina", country: "Bosnia and Herzegovina", countryCode: "BA" },
  { id: "bulgaria", label: "Bulgaria", country: "Bulgaria", countryCode: "BG" },
  { id: "croatia", label: "Croatia", country: "Croatia", countryCode: "HR" },
  { id: "cyprus", label: "Cyprus", country: "Cyprus", countryCode: "CY" },
  { id: "czech-republic", label: "Czech Republic", country: "Czech Republic", countryCode: "CZ" },
  { id: "denmark", label: "Denmark", country: "Denmark", countryCode: "DK" },
  { id: "estonia", label: "Estonia", country: "Estonia", countryCode: "EE" },
  { id: "faroe-islands", label: "Faroe Islands", country: "Faroe Islands", countryCode: "FO" },
  { id: "finland", label: "Finland", country: "Finland", countryCode: "FI" },
  { id: "france", label: "France", country: "France", countryCode: "FR" },
  { id: "georgia", label: "Georgia", country: "Georgia", countryCode: "GE" },
  { id: "germany", label: "Germany", country: "Germany", countryCode: "DE" },
  { id: "gibraltar", label: "Gibraltar", country: "Gibraltar", countryCode: "GI" },
  { id: "greece", label: "Greece", country: "Greece", countryCode: "GR" },
  { id: "hungary", label: "Hungary", country: "Hungary", countryCode: "HU" },
  { id: "iceland", label: "Iceland", country: "Iceland", countryCode: "IS" },
  { id: "ireland", label: "Ireland", country: "Ireland", countryCode: "IE" },
  { id: "italy", label: "Italy", country: "Italy", countryCode: "IT" },
  { id: "kosovo", label: "Kosovo", country: "Kosovo", countryCode: "XK" },
  { id: "latvia", label: "Latvia", country: "Latvia", countryCode: "LV" },
  { id: "liechtenstein", label: "Liechtenstein", country: "Liechtenstein", countryCode: "LI" },
  { id: "lithuania", label: "Lithuania", country: "Lithuania", countryCode: "LT" },
  { id: "luxembourg", label: "Luxembourg", country: "Luxembourg", countryCode: "LU" },
  { id: "malta", label: "Malta", country: "Malta", countryCode: "MT" },
  { id: "moldova", label: "Moldova", country: "Moldova", countryCode: "MD" },
  { id: "monaco", label: "Monaco", country: "Monaco", countryCode: "MC" },
  { id: "montenegro", label: "Montenegro", country: "Montenegro", countryCode: "ME" },
  { id: "netherlands", label: "Netherlands", country: "Netherlands", countryCode: "NL" },
  { id: "north-macedonia", label: "North Macedonia", country: "North Macedonia", countryCode: "MK" },
  { id: "norway", label: "Norway", country: "Norway", countryCode: "NO" },
  { id: "poland", label: "Poland", country: "Poland", countryCode: "PL" },
  { id: "portugal", label: "Portugal", country: "Portugal", countryCode: "PT" },
  { id: "romania", label: "Romania", country: "Romania", countryCode: "RO" },
  { id: "russia", label: "Russia", country: "Russia", countryCode: "RU" },
  { id: "san-marino", label: "San Marino", country: "San Marino", countryCode: "SM" },
  { id: "serbia", label: "Serbia", country: "Serbia", countryCode: "RS" },
  { id: "slovakia", label: "Slovakia", country: "Slovakia", countryCode: "SK" },
  { id: "slovenia", label: "Slovenia", country: "Slovenia", countryCode: "SI" },
  { id: "spain", label: "Spain", country: "Spain", countryCode: "ES" },
  { id: "sweden", label: "Sweden", country: "Sweden", countryCode: "SE" },
  { id: "switzerland", label: "Switzerland", country: "Switzerland", countryCode: "CH" },
  { id: "turkey", label: "Turkey", country: "Turkey", countryCode: "TR" },
  { id: "ukraine", label: "Ukraine", country: "Ukraine", countryCode: "UA" },
  { id: "united-kingdom", label: "United Kingdom", country: "United Kingdom", countryCode: "GB" },
  { id: "vatican-city", label: "Vatican City", country: "Vatican City", countryCode: "VA" },
  { id: "gb-eng", label: "England", country: "United Kingdom", countryCode: "GB" },
  { id: "gb-ni", label: "Northern Ireland", country: "United Kingdom", countryCode: "GB" },
  { id: "gb-sco", label: "Scotland", country: "United Kingdom", countryCode: "GB" },
  { id: "gb-wal", label: "Wales", country: "United Kingdom", countryCode: "GB" }
].sort((a, b) => a.country.localeCompare(b.country) || a.label.localeCompare(b.label));

export function getClubCreationRegion(regionId: string | null | undefined) {
  return regionId ? clubCreationRegions.find((region) => region.id === regionId) ?? null : null;
}

export function countryCodeForClubCountry(country: string | null | undefined) {
  if (!country) return null;
  const normalized = country.trim().toLowerCase();
  return clubCreationRegions.find((region) => region.country.toLowerCase() === normalized)?.countryCode ?? null;
}
