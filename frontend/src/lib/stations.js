// Kochi Metro corridor — REAL GTFS reference data (Aluva -> Tripunithura, 25 stops).
// Coordinates and Malayalam names are taken directly from the project's GTFS feed.
// This is fixed geographic reference data, not operational data.
export const STATIONS = [
  { id: "ALVA", name: "Aluva", nameMl: "ആലുവ", lat: 10.1099, lng: 76.3495 },
  { id: "PNCU", name: "Pulinchodu", nameMl: "പുളിഞ്ചോട്", lat: 10.0951, lng: 76.3466 },
  { id: "CPPY", name: "Companypady", nameMl: "കമ്പനിപ്പടി", lat: 10.0873, lng: 76.3428 },
  { id: "ATTK", name: "Ambattukavu", nameMl: "അമ്പാട്ടുകാവ്", lat: 10.0793, lng: 76.3389 },
  { id: "MUTT", name: "Muttom", nameMl: "മുട്ടം", lat: 10.0727, lng: 76.3336 },
  { id: "KLMT", name: "Kalamassery", nameMl: "കളമശ്ശേരി", lat: 10.0586, lng: 76.322 },
  { id: "CCUV", name: "Cochin University", nameMl: "കൊച്ചിൻ യൂണിവേഴ്സിറ്റി", lat: 10.0467, lng: 76.3182 },
  { id: "PDPM", name: "Pathadipalam", nameMl: "പത്തടിപ്പോലം", lat: 10.0361, lng: 76.3144 },
  { id: "EDAP", name: "Edapally", nameMl: "ഇടപ്പള്ളി", lat: 10.0251, lng: 76.3083 },
  { id: "CGPP", name: "Changampuzha Park", nameMl: "ചങ്ങമ്പുഴ പാർക്ക്", lat: 10.0152, lng: 76.3023 },
  { id: "PARV", name: "Palarivattom", nameMl: "പാലാരിവട്ടം", lat: 10.0064, lng: 76.3048 },
  { id: "JLSD", name: "JLN Stadium", nameMl: "ജെ എൽ എൻ സ്റ്റേഡിയം", lat: 10.0002, lng: 76.2989 },
  { id: "KALR", name: "Kaloor", nameMl: "കലൂർ", lat: 9.9943, lng: 76.2914 },
  { id: "TNHL", name: "Town Hall", nameMl: "ടൗൺ ഹാൾ", lat: 9.9913775, lng: 76.2883601 },
  { id: "MGRD", name: "MG Road", nameMl: "എം.ജി റോഡ്", lat: 9.9834, lng: 76.2823 },
  { id: "MACE", name: "Maharajas College", nameMl: "മഹാരാജാസ് കോളേജ്", lat: 9.9732, lng: 76.2851 },
  { id: "ERSH", name: "Ernakulam South", nameMl: "എറണാകുളം സൗത്ത്", lat: 9.9686042, lng: 76.2895744 },
  { id: "KVTR", name: "Kadavanthra", nameMl: "കടവന്ത്ര", lat: 9.9665809, lng: 76.2981877 },
  { id: "EMKM", name: "Elamkulam", nameMl: "ഇളങ്കുളം", lat: 9.9671248, lng: 76.3084899 },
  { id: "VYTA", name: "Vyttila", nameMl: "വൈറ്റില", lat: 9.9675457, lng: 76.3203664 },
  { id: "THYK", name: "Thykoodam", nameMl: "തൈക്കൂടം", lat: 9.9600311, lng: 76.3236762 },
  { id: "PETT", name: "Pettah", nameMl: "പേട്ട", lat: 9.9524842, lng: 76.3302101 },
  { id: "VAKK", name: "Vadakkekotta", nameMl: "വടക്കേക്കോട്ട", lat: 9.952838, lng: 76.3394827 },
  { id: "SNJN", name: "SN Junction", nameMl: "എസ്. എൻ. ജംഗ്ഷൻ", lat: 9.9547532, lng: 76.3458505 },
  { id: "TPHT", name: "Tripunithura", nameMl: "തൃപ്പൂണിത്തുറ", lat: 9.95078, lng: 76.35183 },
];

// Stabling depots (from fitness-certificate depot assignments).
export const DEPOTS = [
  { id: "MUTTOM", name: "Muttom Depot", nameMl: "മുട്ടം ഡിപ്പോ", lat: 10.0705, lng: 76.3318 },
  { id: "KALAMASSERY", name: "Kalamassery Depot", nameMl: "കളമശ്ശേരി ഡിപ്പോ", lat: 10.06, lng: 76.318 },
];

export const CORRIDOR = STATIONS.map((s) => [s.lat, s.lng]);
export const KOCHI_CENTER = [10.01, 76.31];
