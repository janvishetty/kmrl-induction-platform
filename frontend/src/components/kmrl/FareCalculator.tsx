import { useState, useMemo } from "react";
import { useApp } from "@/lib/kmrl/store";
import { cn } from "@/lib/utils";
import { IndianRupee, ArrowRightLeft } from "lucide-react";

// Fare data from fare_attributes.txt
const FARE_ATTRIBUTES = {
  F1: { price: 60.0, currency: "INR" },
  F2: { price: 50.0, currency: "INR" },
  F3: { price: 40.0, currency: "INR" },
  F4: { price: 30.0, currency: "INR" },
  F5: { price: 20.0, currency: "INR" },
  F6: { price: 10.0, currency: "INR" },
};

// Station data from stops.txt with translations (English & Malayalam only)
const STATIONS = [
  { id: "ALVA", name: "Aluva", nameMl: "ആലുവ" },
  { id: "PNCU", name: "Pulinchodu", nameMl: "പുളിഞ്ചോട്" },
  { id: "CPPY", name: "Companypady", nameMl: "കമ്പനിപ്പടി" },
  { id: "ATTK", name: "Ambattukavu", nameMl: "അമ്പാട്ടുകാവ്" },
  { id: "MUTT", name: "Muttom", nameMl: "മുട്ടം" },
  { id: "KLMT", name: "Kalamassery", nameMl: "കളമശ്ശേരി" },
  { id: "CCUV", name: "Cochin University", nameMl: "കൊച്ചിൻ യൂണിവേഴ്സിറ്റി" },
  { id: "PDPM", name: "Pathadipalam", nameMl: "പത്തടിപ്പോലം" },
  { id: "EDAP", name: "Edapally", nameMl: "ഇടപ്പള്ളി" },
  { id: "CGPP", name: "Changampuzha Park", nameMl: "ചങ്ങമ്പുഴ പാർക്ക്" },
  { id: "PARV", name: "Palarivattom", nameMl: "പാലാരിവട്ടം" },
  { id: "JLSD", name: "JLN Stadium", nameMl: "ജെ എൽ എൻ സ്റ്റേഡിയം" },
  { id: "KALR", name: "Kaloor", nameMl: "കലൂർ" },
  { id: "TNHL", name: "Town Hall", nameMl: "ടൗൺ ഹാൾ" },
  { id: "MGRD", name: "MG Road", nameMl: "എം.ജി റോഡ്" },
  { id: "MACE", name: "Maharajas College", nameMl: "മഹാരാജാസ് കോളേജ്" },
  { id: "ERSH", name: "Ernakulam South", nameMl: "എറണാകുളം സൗത്ത്" },
  { id: "KVTR", name: "Kadavanthra", nameMl: "കടവന്ത്ര" },
  { id: "EMKM", name: "Elamkulam", nameMl: "ഇളങ്കുളം" },
  { id: "VYTA", name: "Vyttila", nameMl: "വൈറ്റില" },
  { id: "THYK", name: "Thykoodam", nameMl: "തൈക്കൂടം" },
  { id: "PETT", name: "Pettah", nameMl: "പേട്ട" },
  { id: "VAKK", name: "Vadakkekotta", nameMl: "വടക്കേക്കോട്ട" },
  { id: "SNJN", name: "SN Junction", nameMl: "എസ്. എൻ. ജംഗ്ഷൻ" },
  { id: "TPHT", name: "Tripunithura", nameMl: "തൃപ്പൂണിത്തുറ" },
];

// Fare rules from fare_rules.txt
const FARE_RULES: Record<string, Record<string, string>> = {
  "TPHT": { "ALVA": "F1", "PNCU": "F1", "CPPY": "F1", "ATTK": "F1", "MUTT": "F1", "KLMT": "F1", "CCUV": "F1", "PDPM": "F1", "EDAP": "F2", "CGPP": "F2", "PARV": "F2", "JLSD": "F2", "KALR": "F2", "TNHL": "F3", "MGRD": "F3", "MACE": "F3", "ERSH": "F3", "KVTR": "F4", "EMKM": "F4", "VYTA": "F4", "THYK": "F5", "PETT": "F5", "VAKK": "F5", "SNJN": "F6", "TPHT": "F6" },
  "ALVA": { "TPHT": "F1", "PNCU": "F6", "CPPY": "F5", "ATTK": "F5", "MUTT": "F5", "KLMT": "F4", "CCUV": "F4", "PDPM": "F4", "EDAP": "F3", "CGPP": "F3", "PARV": "F3", "JLSD": "F3", "KALR": "F2", "TNHL": "F2", "MGRD": "F2", "MACE": "F2", "ERSH": "F2", "KVTR": "F1", "EMKM": "F1", "VYTA": "F1", "THYK": "F1", "PETT": "F1", "VAKK": "F1", "SNJN": "F1", "ALVA": "F6" },
  "PNCU": { "TPHT": "F1", "ALVA": "F6", "CPPY": "F6", "ATTK": "F5", "MUTT": "F5", "KLMT": "F5", "CCUV": "F4", "PDPM": "F4", "EDAP": "F4", "CGPP": "F3", "PARV": "F3", "JLSD": "F3", "KALR": "F3", "TNHL": "F2", "MGRD": "F2", "MACE": "F2", "ERSH": "F2", "KVTR": "F2", "EMKM": "F1", "VYTA": "F1", "THYK": "F1", "PETT": "F1", "VAKK": "F1", "SNJN": "F1", "PNCU": "F6" },
  "CPPY": { "TPHT": "F1", "ALVA": "F5", "PNCU": "F6", "ATTK": "F6", "MUTT": "F5", "KLMT": "F5", "CCUV": "F5", "PDPM": "F4", "EDAP": "F4", "CGPP": "F4", "PARV": "F3", "JLSD": "F3", "KALR": "F3", "TNHL": "F3", "MGRD": "F2", "MACE": "F2", "ERSH": "F2", "KVTR": "F2", "EMKM": "F2", "VYTA": "F1", "THYK": "F1", "PETT": "F1", "VAKK": "F1", "SNJN": "F1", "CPPY": "F6" },
  "ATTK": { "TPHT": "F1", "ALVA": "F5", "PNCU": "F5", "CPPY": "F6", "MUTT": "F6", "KLMT": "F5", "CCUV": "F5", "PDPM": "F5", "EDAP": "F4", "CGPP": "F4", "PARV": "F4", "JLSD": "F3", "KALR": "F3", "TNHL": "F3", "MGRD": "F3", "MACE": "F2", "ERSH": "F2", "KVTR": "F2", "EMKM": "F2", "VYTA": "F2", "THYK": "F1", "PETT": "F1", "VAKK": "F1", "SNJN": "F1", "ATTK": "F6" },
  "MUTT": { "TPHT": "F1", "ALVA": "F5", "PNCU": "F5", "CPPY": "F5", "ATTK": "F6", "KLMT": "F6", "CCUV": "F5", "PDPM": "F5", "EDAP": "F5", "CGPP": "F4", "PARV": "F4", "JLSD": "F4", "KALR": "F3", "TNHL": "F3", "MGRD": "F3", "MACE": "F3", "ERSH": "F2", "KVTR": "F2", "EMKM": "F2", "VYTA": "F2", "THYK": "F2", "PETT": "F1", "VAKK": "F1", "SNJN": "F1", "MUTT": "F6" },
  "KLMT": { "TPHT": "F1", "ALVA": "F4", "PNCU": "F5", "CPPY": "F5", "ATTK": "F5", "MUTT": "F6", "CCUV": "F6", "PDPM": "F5", "EDAP": "F5", "CGPP": "F5", "PARV": "F4", "JLSD": "F4", "KALR": "F4", "TNHL": "F3", "MGRD": "F3", "MACE": "F3", "ERSH": "F3", "KVTR": "F2", "EMKM": "F2", "VYTA": "F2", "THYK": "F2", "PETT": "F2", "VAKK": "F1", "SNJN": "F1", "KLMT": "F6" },
  "CCUV": { "TPHT": "F1", "ALVA": "F4", "PNCU": "F4", "CPPY": "F5", "ATTK": "F5", "MUTT": "F5", "KLMT": "F6", "PDPM": "F6", "EDAP": "F5", "CGPP": "F5", "PARV": "F5", "JLSD": "F4", "KALR": "F4", "TNHL": "F4", "MGRD": "F3", "MACE": "F3", "ERSH": "F3", "KVTR": "F3", "EMKM": "F2", "VYTA": "F2", "THYK": "F2", "PETT": "F2", "VAKK": "F2", "SNJN": "F1", "CCUV": "F6" },
  "PDPM": { "TPHT": "F2", "ALVA": "F4", "PNCU": "F4", "CPPY": "F4", "ATTK": "F5", "MUTT": "F5", "KLMT": "F5", "CCUV": "F6", "EDAP": "F6", "CGPP": "F5", "PARV": "F5", "JLSD": "F5", "KALR": "F4", "TNHL": "F4", "MGRD": "F4", "MACE": "F3", "ERSH": "F3", "KVTR": "F3", "EMKM": "F3", "VYTA": "F2", "THYK": "F2", "PETT": "F2", "VAKK": "F2", "SNJN": "F2", "PDPM": "F6" },
  "EDAP": { "TPHT": "F2", "ALVA": "F3", "PNCU": "F4", "CPPY": "F4", "ATTK": "F4", "MUTT": "F5", "KLMT": "F5", "CCUV": "F5", "PDPM": "F6", "CGPP": "F6", "PARV": "F5", "JLSD": "F5", "KALR": "F5", "TNHL": "F4", "MGRD": "F4", "MACE": "F4", "ERSH": "F3", "KVTR": "F3", "EMKM": "F3", "VYTA": "F3", "THYK": "F2", "PETT": "F2", "VAKK": "F2", "SNJN": "F2", "EDAP": "F6" },
  "CGPP": { "TPHT": "F2", "ALVA": "F3", "PNCU": "F3", "CPPY": "F4", "ATTK": "F4", "MUTT": "F4", "KLMT": "F5", "CCUV": "F5", "PDPM": "F5", "EDAP": "F6", "PARV": "F6", "JLSD": "F5", "KALR": "F5", "TNHL": "F5", "MGRD": "F4", "MACE": "F4", "ERSH": "F4", "KVTR": "F3", "EMKM": "F3", "VYTA": "F3", "THYK": "F3", "PETT": "F2", "VAKK": "F2", "SNJN": "F2", "CGPP": "F6" },
  "PARV": { "TPHT": "F2", "ALVA": "F3", "PNCU": "F3", "CPPY": "F3", "ATTK": "F4", "MUTT": "F4", "KLMT": "F4", "CCUV": "F5", "PDPM": "F5", "EDAP": "F5", "CGPP": "F6", "JLSD": "F6", "KALR": "F5", "TNHL": "F5", "MGRD": "F5", "MACE": "F4", "ERSH": "F4", "KVTR": "F4", "EMKM": "F3", "VYTA": "F3", "THYK": "F3", "PETT": "F3", "VAKK": "F2", "SNJN": "F2", "PARV": "F6" },
  "JLSD": { "TPHT": "F2", "ALVA": "F3", "PNCU": "F3", "CPPY": "F3", "ATTK": "F3", "MUTT": "F4", "KLMT": "F4", "CCUV": "F4", "PDPM": "F5", "EDAP": "F5", "CGPP": "F5", "PARV": "F6", "KALR": "F6", "TNHL": "F5", "MGRD": "F5", "MACE": "F5", "ERSH": "F4", "KVTR": "F4", "EMKM": "F4", "VYTA": "F3", "THYK": "F3", "PETT": "F3", "VAKK": "F3", "SNJN": "F2", "JLSD": "F6" },
  "KALR": { "TPHT": "F2", "ALVA": "F2", "PNCU": "F3", "CPPY": "F3", "ATTK": "F3", "MUTT": "F3", "KLMT": "F4", "CCUV": "F4", "PDPM": "F4", "EDAP": "F5", "CGPP": "F5", "PARV": "F5", "JLSD": "F6", "TNHL": "F6", "MGRD": "F5", "MACE": "F5", "ERSH": "F5", "KVTR": "F4", "EMKM": "F4", "VYTA": "F4", "THYK": "F3", "PETT": "F3", "VAKK": "F3", "SNJN": "F3", "KALR": "F6" },
  "TNHL": { "TPHT": "F3", "ALVA": "F2", "PNCU": "F2", "CPPY": "F3", "ATTK": "F3", "MUTT": "F3", "KLMT": "F3", "CCUV": "F4", "PDPM": "F4", "EDAP": "F4", "CGPP": "F5", "PARV": "F5", "JLSD": "F5", "KALR": "F6", "MGRD": "F6", "MACE": "F5", "ERSH": "F5", "KVTR": "F5", "EMKM": "F4", "VYTA": "F4", "THYK": "F4", "PETT": "F3", "VAKK": "F3", "SNJN": "F3", "TNHL": "F6" },
  "MGRD": { "TPHT": "F3", "ALVA": "F2", "PNCU": "F2", "CPPY": "F2", "ATTK": "F3", "MUTT": "F3", "KLMT": "F3", "CCUV": "F3", "PDPM": "F4", "EDAP": "F4", "CGPP": "F4", "PARV": "F5", "JLSD": "F5", "KALR": "F5", "TNHL": "F6", "MACE": "F6", "ERSH": "F5", "KVTR": "F5", "EMKM": "F5", "VYTA": "F4", "THYK": "F4", "PETT": "F4", "VAKK": "F3", "SNJN": "F3", "MGRD": "F6" },
  "MACE": { "TPHT": "F3", "ALVA": "F2", "PNCU": "F2", "CPPY": "F2", "ATTK": "F2", "MUTT": "F3", "KLMT": "F3", "CCUV": "F3", "PDPM": "F3", "EDAP": "F4", "CGPP": "F4", "PARV": "F4", "JLSD": "F5", "KALR": "F5", "TNHL": "F5", "MGRD": "F6", "ERSH": "F6", "KVTR": "F5", "EMKM": "F5", "VYTA": "F5", "THYK": "F4", "PETT": "F4", "VAKK": "F4", "SNJN": "F3", "MACE": "F6" },
  "ERSH": { "TPHT": "F3", "ALVA": "F2", "PNCU": "F2", "CPPY": "F2", "ATTK": "F2", "MUTT": "F2", "KLMT": "F3", "CCUV": "F3", "PDPM": "F3", "EDAP": "F3", "CGPP": "F4", "PARV": "F4", "JLSD": "F4", "KALR": "F5", "TNHL": "F5", "MGRD": "F5", "MACE": "F6", "KVTR": "F6", "EMKM": "F5", "VYTA": "F5", "THYK": "F5", "PETT": "F4", "VAKK": "F4", "SNJN": "F4", "ERSH": "F6" },
  "KVTR": { "TPHT": "F4", "ALVA": "F1", "PNCU": "F2", "CPPY": "F2", "ATTK": "F2", "MUTT": "F2", "KLMT": "F2", "CCUV": "F3", "PDPM": "F3", "EDAP": "F3", "CGPP": "F3", "PARV": "F4", "JLSD": "F4", "KALR": "F4", "TNHL": "F5", "MGRD": "F5", "MACE": "F5", "ERSH": "F6", "EMKM": "F6", "VYTA": "F5", "THYK": "F5", "PETT": "F5", "VAKK": "F4", "SNJN": "F4", "KVTR": "F6" },
  "EMKM": { "TPHT": "F4", "ALVA": "F1", "PNCU": "F1", "CPPY": "F2", "ATTK": "F2", "MUTT": "F2", "KLMT": "F2", "CCUV": "F2", "PDPM": "F3", "EDAP": "F3", "CGPP": "F3", "PARV": "F3", "JLSD": "F4", "KALR": "F4", "TNHL": "F4", "MGRD": "F5", "MACE": "F5", "ERSH": "F5", "KVTR": "F6", "VYTA": "F6", "THYK": "F5", "PETT": "F5", "VAKK": "F5", "SNJN": "F4", "EMKM": "F6" },
  "VYTA": { "TPHT": "F4", "ALVA": "F1", "PNCU": "F1", "CPPY": "F1", "ATTK": "F2", "MUTT": "F2", "KLMT": "F2", "CCUV": "F2", "PDPM": "F2", "EDAP": "F3", "CGPP": "F3", "PARV": "F3", "JLSD": "F3", "KALR": "F4", "TNHL": "F4", "MGRD": "F4", "MACE": "F5", "ERSH": "F5", "KVTR": "F5", "EMKM": "F6", "THYK": "F6", "PETT": "F5", "VAKK": "F5", "SNJN": "F5", "VYTA": "F6" },
  "THYK": { "TPHT": "F5", "ALVA": "F1", "PNCU": "F1", "CPPY": "F1", "ATTK": "F1", "MUTT": "F2", "KLMT": "F2", "CCUV": "F2", "PDPM": "F2", "EDAP": "F2", "CGPP": "F3", "PARV": "F3", "JLSD": "F3", "KALR": "F3", "TNHL": "F4", "MGRD": "F4", "MACE": "F4", "ERSH": "F5", "KVTR": "F5", "EMKM": "F5", "VYTA": "F6", "PETT": "F6", "VAKK": "F5", "SNJN": "F5", "THYK": "F6" },
  "PETT": { "TPHT": "F5", "ALVA": "F1", "PNCU": "F1", "CPPY": "F1", "ATTK": "F1", "MUTT": "F1", "KLMT": "F2", "CCUV": "F2", "PDPM": "F2", "EDAP": "F2", "CGPP": "F2", "PARV": "F3", "JLSD": "F3", "KALR": "F3", "TNHL": "F3", "MGRD": "F4", "MACE": "F4", "ERSH": "F4", "KVTR": "F5", "EMKM": "F5", "VYTA": "F5", "THYK": "F6", "VAKK": "F6", "SNJN": "F5", "PETT": "F6" },
  "VAKK": { "TPHT": "F5", "ALVA": "F1", "PNCU": "F1", "CPPY": "F1", "ATTK": "F1", "MUTT": "F1", "KLMT": "F1", "CCUV": "F2", "PDPM": "F2", "EDAP": "F2", "CGPP": "F2", "PARV": "F2", "JLSD": "F3", "KALR": "F3", "TNHL": "F3", "MGRD": "F3", "MACE": "F4", "ERSH": "F4", "KVTR": "F4", "EMKM": "F5", "VYTA": "F5", "THYK": "F5", "PETT": "F6", "SNJN": "F6", "VAKK": "F6" },
  "SNJN": { "TPHT": "F6", "ALVA": "F1", "PNCU": "F1", "CPPY": "F1", "ATTK": "F1", "MUTT": "F1", "KLMT": "F1", "CCUV": "F1", "PDPM": "F2", "EDAP": "F2", "CGPP": "F2", "PARV": "F2", "JLSD": "F2", "KALR": "F3", "TNHL": "F3", "MGRD": "F3", "MACE": "F3", "ERSH": "F4", "KVTR": "F4", "EMKM": "F4", "VYTA": "F5", "THYK": "F5", "PETT": "F5", "VAKK": "F6", "SNJN": "F6" },
};

export default function FareCalculator() {
  const { lang, t } = useApp();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const fare = useMemo(() => {
    if (!origin || !destination) return null;
    if (origin === destination) return FARE_ATTRIBUTES.F6.price;
    
    const fareId = FARE_RULES[origin]?.[destination];
    if (!fareId) return null;
    
    return FARE_ATTRIBUTES[fareId as keyof typeof FARE_ATTRIBUTES]?.price ?? null;
  }, [origin, destination]);

  // Fixed: Only checks for "ml", defaults to English ("en")
  const getStationName = (station: typeof STATIONS[0]) => {
    if (lang === "ml") return station.nameMl;
    return station.name;
  };

  return (
    <div className="min-h-screen bg-background p-5 lg:p-7">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{t("nav_fares") || "Fare Calculator"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Calculate fare between any two Kochi Metro stations
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          {/* Origin Station */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-foreground">
              From Station
            </label>
            <div className="relative">
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select origin station</option>
                {STATIONS.map((station) => (
                  <option key={station.id} value={station.id}>
                    {getStationName(station)} ({station.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <div className="mb-4 flex justify-center">
            <button
              onClick={() => {
                setOrigin(destination);
                setDestination(origin);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              title="Swap stations"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Destination Station */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-foreground">
              To Station
            </label>
            <div className="relative">
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select destination station</option>
                {STATIONS.map((station) => (
                  <option key={station.id} value={station.id}>
                    {getStationName(station)} ({station.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fare Display */}
          {fare !== null && (
            <div className="rounded-lg border border-primary/40 bg-primary/10 p-6 text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <IndianRupee className="h-6 w-6 text-primary" />
                <span className="text-4xl font-bold text-primary">
                  {fare.toFixed(0)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {origin && destination
                  ? `${getStationName(STATIONS.find((s) => s.id === origin)!)} → ${getStationName(STATIONS.find((s) => s.id === destination)!)}`
                  : "Select stations to see fare"}
              </p>
            </div>
          )}

          {!fare && origin && destination && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center">
              <p className="text-sm text-destructive">
                No fare information available for this route
              </p>
            </div>
          )}

          {/* Quick Info */}
          <div className="mt-6 rounded-md border border-border bg-muted/50 p-4">
            <h3 className="mb-2 text-sm font-semibold">Fare Information</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• F1: ₹60 - Longest distance</li>
              <li>• F2: ₹50</li>
              <li>• F3: ₹40</li>
              <li>• F4: ₹30</li>
              <li>• F5: ₹20</li>
              <li>• F6: ₹10 - Shortest distance / Same station</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}