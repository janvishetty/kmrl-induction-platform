import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useApiData } from "@/lib/kmrl/hooks";
import { fetchStations, fetchTrainsets, fetchAlerts } from "@/lib/kmrl/api";
import { MAINTENANCE_SITES, type OpsState, stateColor } from "@/lib/kmrl/network";
import { useApp } from "@/lib/kmrl/store";
import { cn } from "@/lib/utils";
import {
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  LocateFixed,
  Frame,
  Layers,
  Play,
  Pause,
  MessageSquare,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

const KOCHI_CENTER: [number, number] = [10.03, 76.315];
const RAIL = "#3f8fa3";

// Complete metro route from shapes.txt (469 coordinate points)
const METRO_LINE_COORDS: [number, number][] = [
  [10.111073, 76.349005], [10.110612, 76.349225], [10.11023, 76.34939], [10.109944, 76.349489],
  [10.109665, 76.349567], [10.10928, 76.34968], [10.10867, 76.349816], [10.108132, 76.349916],
  [10.107836, 76.349969], [10.107647, 76.350003], [10.107168, 76.350085], [10.10684, 76.350123],
  [10.106508, 76.350158], [10.106104, 76.350173], [10.10571, 76.350159], [10.105427, 76.350153],
  [10.105146, 76.350132], [10.104851, 76.350097], [10.104505, 76.350036], [10.103986, 76.349931],
  [10.103537, 76.34981], [10.103105, 76.349663], [10.102702, 76.349501], [10.102306, 76.349328],
  [10.101962, 76.349149], [10.101614, 76.34896], [10.100667, 76.348323], [10.100146, 76.348002],
  [10.099589, 76.347675], [10.099002, 76.347356], [10.098692, 76.347213], [10.098354, 76.347081],
  [10.097672, 76.346897], [10.097381, 76.346842], [10.097023, 76.346788], [10.096422, 76.346727],
  [10.095836, 76.346672], [10.095263, 76.346612], [10.095034, 76.346579], [10.094802, 76.346528],
  [10.094312, 76.346413], [10.093838, 76.346277], [10.093223, 76.346084], [10.092429, 76.345752],
  [10.09218, 76.345637], [10.091901, 76.345494], [10.091166, 76.345081], [10.090452, 76.34466],
  [10.08975, 76.344259], [10.088828, 76.343699], [10.08728, 76.342786], [10.086464, 76.342302],
  [10.085773, 76.341914], [10.085085, 76.341513], [10.084632, 76.341266], [10.084222, 76.341051],
  [10.083455, 76.340641], [10.082965, 76.340384], [10.082448, 76.340135], [10.081756, 76.339806],
  [10.081167, 76.339565], [10.080682, 76.339377], [10.080162, 76.339188], [10.079233, 76.338857],
  [10.077979, 76.338384], [10.077665, 76.338245], [10.077368, 76.338085], [10.077196, 76.337971],
  [10.077038, 76.337855], [10.076825, 76.337688], [10.076615, 76.337508], [10.076265, 76.337144],
  [10.075975, 76.336803], [10.075261, 76.336068], [10.074797, 76.335563], [10.074515, 76.335277],
  [10.074311, 76.33505], [10.074044, 76.334768], [10.073882, 76.334613], [10.073646, 76.334389],
  [10.073384, 76.334167], [10.073269, 76.334078], [10.072749, 76.33368], [10.072219, 76.333236],
  [10.071763, 76.332879], [10.071511, 76.332668], [10.071301, 76.332474], [10.071101, 76.33226],
  [10.070784, 76.331923], [10.070521, 76.331658], [10.070346, 76.331489], [10.06983, 76.330993],
  [10.068937, 76.330061], [10.068701, 76.329821], [10.0684, 76.329553], [10.068059, 76.329293],
  [10.067712, 76.329012], [10.067442, 76.328813], [10.067121, 76.328612], [10.066517, 76.328277],
  [10.066176, 76.328092], [10.065892, 76.327932], [10.065473, 76.327678], [10.065071, 76.327454],
  [10.064489, 76.327098], [10.06426, 76.326937], [10.064042, 76.32675], [10.063707, 76.326435],
  [10.063496, 76.326214], [10.063176, 76.32587], [10.062931, 76.325562], [10.062607, 76.325079],
  [10.062372, 76.324671], [10.062073, 76.324201], [10.061827, 76.323855], [10.061624, 76.3236],
  [10.061369, 76.32334], [10.061107, 76.323108], [10.060807, 76.32287], [10.060563, 76.322713],
  [10.060281, 76.322559], [10.060019, 76.322435], [10.059679, 76.322316], [10.059147, 76.322128],
  [10.058591, 76.321935], [10.058161, 76.321789], [10.0577, 76.321646], [10.05724, 76.321517],
  [10.056869, 76.321441], [10.056414, 76.321379], [10.055935, 76.321305], [10.055669, 76.321267],
  [10.055272, 76.321148], [10.054971, 76.321032], [10.054513, 76.320812], [10.054061, 76.320602],
  [10.053663, 76.320414], [10.05349, 76.320336], [10.053288, 76.320259], [10.052058, 76.319934],
  [10.05112, 76.319544], [10.050093, 76.319227], [10.048751, 76.318865], [10.046715, 76.318239],
  [10.04523, 76.317759], [10.04376, 76.31731], [10.041889, 76.316736], [10.041034, 76.316475],
  [10.040284, 76.31621], [10.03957, 76.315904], [10.037996, 76.315218], [10.037121, 76.314805],
  [10.036553, 76.314562], [10.036034, 76.314328], [10.035815, 76.314229], [10.0352, 76.313944],
  [10.034925, 76.313817], [10.034091, 76.313456], [10.033675, 76.313262], [10.03328, 76.313053],
  [10.032542, 76.312641], [10.032296, 76.312496], [10.030994, 76.311731], [10.029354, 76.310736],
  [10.028661, 76.310361], [10.028623, 76.310339], [10.026627, 76.309177], [10.025351, 76.308433],
  [10.023842, 76.307572], [10.021382, 76.306136], [10.020246, 76.305504], [10.019753, 76.305215],
  [10.019279, 76.30491], [10.018855, 76.304527], [10.01843, 76.304096], [10.018098, 76.303725],
  [10.017925, 76.303542], [10.01773, 76.303368], [10.017515, 76.303181], [10.017247, 76.30299],
  [10.01721, 76.302964], [10.017121, 76.302905], [10.016763, 76.302667], [10.016603, 76.302562],
  [10.016421, 76.302461], [10.016304, 76.302413], [10.016189, 76.302386], [10.015959, 76.302348],
  [10.015708, 76.302329], [10.015197, 76.302301], [10.01479, 76.302284], [10.014423, 76.302271],
  [10.01423, 76.302288], [10.014014, 76.302333], [10.013249, 76.302539], [10.011647, 76.30299],
  [10.010632, 76.303293], [10.009624, 76.303623], [10.008211, 76.304133], [10.00743, 76.304402],
  [10.006974, 76.304559], [10.006406, 76.304763], [10.00575, 76.304971], [10.005463, 76.30506],
  [10.005268, 76.305099], [10.005062, 76.305125], [10.004718, 76.305122], [10.004466, 76.305086],
  [10.003951, 76.304933], [10.003643, 76.304823], [10.0034, 76.304725], [10.00307, 76.304555],
  [10.002772, 76.304333], [10.002472, 76.304083], [10.002186, 76.303803], [10.002071, 76.303698],
  [10.001963, 76.303579], [10.001866, 76.303441], [10.001761, 76.303243], [10.001653, 76.303008],
  [10.00157, 76.302733], [10.001511, 76.302424], [10.001297, 76.301396], [10.001157, 76.30062],
  [10.00108, 76.300312], [10.000914, 76.299996], [10.000457, 76.299255], [9.999857, 76.298319],
  [9.999673, 76.298046], [9.999482, 76.297769], [9.999211, 76.297411], [9.998671, 76.296815],
  [9.998164, 76.296226], [9.997528, 76.295447], [9.996914, 76.294655], [9.996193, 76.293627],
  [9.995893, 76.293195], [9.995722, 76.292969], [9.995547, 76.292738], [9.995352, 76.292502],
  [9.995129, 76.292245], [9.994843, 76.291931], [9.994372, 76.291468], [9.993809, 76.290927],
  [9.992975, 76.290138], [9.992645, 76.289814], [9.992362, 76.289512], [9.992085, 76.289204],
  [9.991603, 76.288637], [9.991378, 76.28836], [9.990939, 76.287776], [9.990814, 76.287633],
  [9.990659, 76.287493], [9.99041, 76.287293], [9.990193, 76.287143], [9.989733, 76.286811],
  [9.989445, 76.286623], [9.9892, 76.286466], [9.988971, 76.286336], [9.988774, 76.286228],
  [9.988569, 76.286101], [9.988308, 76.28593], [9.987975, 76.285689], [9.987681, 76.285425],
  [9.987452, 76.285213], [9.987102, 76.284793], [9.98687, 76.284454], [9.98679, 76.284336],
  [9.986622, 76.284042], [9.986474, 76.283727], [9.986341, 76.283388], [9.986187, 76.282952],
  [9.98605, 76.282665], [9.985946, 76.282502], [9.9858, 76.282342], [9.985664, 76.282229],
  [9.985538, 76.282135], [9.985375, 76.28206], [9.985205, 76.282004], [9.985015, 76.281961],
  [9.984788, 76.281952], [9.984611, 76.281966], [9.984417, 76.282007], [9.984103, 76.282117],
  [9.983446, 76.282351], [9.98267, 76.282619], [9.982231, 76.282733], [9.981817, 76.282875],
  [9.981585, 76.282933], [9.980666, 76.283072], [9.980197, 76.283139], [9.979734, 76.283208],
  [9.979424, 76.283274], [9.979116, 76.283375], [9.978738, 76.283487], [9.978358, 76.283606],
  [9.977722, 76.283831], [9.977104, 76.284054], [9.976658, 76.284212], [9.976205, 76.284346],
  [9.975732, 76.284462], [9.975289, 76.284565], [9.974702, 76.284709], [9.974238, 76.28483],
  [9.974096, 76.284867], [9.973268, 76.285056], [9.972916, 76.285133], [9.972535, 76.285244],
  [9.970461, 76.28556], [9.970216, 76.285612], [9.969983, 76.28569], [9.969507, 76.285856],
  [9.969239, 76.285951], [9.969125, 76.286016], [9.96901, 76.286099], [9.968882, 76.286219],
  [9.9688, 76.286326], [9.968704, 76.286491], [9.968648, 76.286656], [9.968606, 76.286815],
  [9.968602, 76.287062], [9.968626, 76.287527], [9.968611, 76.287784], [9.968581, 76.288015],
  [9.968527, 76.288321], [9.968511, 76.288555], [9.968522, 76.288781], [9.968589, 76.289247],
  [9.968639, 76.289567], [9.968669, 76.289858], [9.968672, 76.290096], [9.968665, 76.290222],
  [9.968619, 76.290401], [9.968582, 76.290513], [9.968485, 76.290697], [9.968382, 76.290829],
  [9.968272, 76.290941], [9.968147, 76.291036], [9.96803, 76.291112], [9.967606, 76.291293],
  [9.967146, 76.291471], [9.966665, 76.291642], [9.966336, 76.291763], [9.966168, 76.291835],
  [9.966065, 76.291899], [9.965962, 76.291968], [9.965826, 76.29209], [9.965703, 76.292232],
  [9.965605, 76.292385], [9.965541, 76.292534], [9.965475, 76.292731], [9.96544, 76.293308],
  [9.965557, 76.293908], [9.965601, 76.294144], [9.965784, 76.294926], [9.965881, 76.295328],
  [9.966016, 76.295985], [9.966103, 76.296452], [9.966178, 76.296793], [9.966249, 76.297106],
  [9.966333, 76.297484], [9.966442, 76.297822], [9.966581, 76.298188], [9.966619, 76.298286],
  [9.966676, 76.298433], [9.96684, 76.298858], [9.967007, 76.299268], [9.967245, 76.299823],
  [9.967414, 76.300255], [9.967463, 76.300435], [9.967498, 76.300545], [9.967564, 76.300885],
  [9.96762, 76.301462], [9.967654, 76.302074], [9.967715, 76.302768], [9.967754, 76.303517],
  [9.967813, 76.304477], [9.967802, 76.304922], [9.967717, 76.305394], [9.967469, 76.306062],
  [9.967202, 76.306703], [9.967054, 76.306982], [9.966967, 76.307344], [9.966999, 76.30761],
  [9.967126, 76.308323], [9.967167, 76.308478], [9.96725, 76.308793], [9.967358, 76.309152],
  [9.967435, 76.309637], [9.96749, 76.310217], [9.967604, 76.31071], [9.96768, 76.311204],
  [9.967789, 76.311767], [9.967937, 76.312462], [9.968143, 76.313414], [9.968373, 76.31449],
  [9.968518, 76.315131], [9.968608, 76.315646], [9.968774, 76.316681], [9.968779, 76.316794],
  [9.968703, 76.317287], [9.968705, 76.31822], [9.968829, 76.319028], [9.968829, 76.319404],
  [9.968734, 76.31964], [9.968491, 76.319972], [9.968311, 76.320112], [9.968037, 76.320241],
  [9.967603, 76.320391], [9.967571, 76.320404], [9.966526, 76.320831], [9.966061, 76.320981],
  [9.965448, 76.320959], [9.96511, 76.320874], [9.963975, 76.320439], [9.963493, 76.320294],
  [9.963028, 76.320273], [9.962595, 76.320359], [9.962183, 76.320519], [9.961823, 76.320777],
  [9.961549, 76.32112], [9.961189, 76.321678], [9.960031, 76.323676], [9.959637, 76.32434],
  [9.959358, 76.324804], [9.959171, 76.325075], [9.959009, 76.325266], [9.95807, 76.325943],
  [9.957448, 76.32637], [9.95674, 76.326754], [9.955904, 76.327169], [9.955402, 76.327448],
  [9.954712, 76.327874], [9.954449, 76.328045], [9.95426, 76.328272], [9.954113, 76.32861],
  [9.953959, 76.329054], [9.953832, 76.329416], [9.953689, 76.329556], [9.952912, 76.330047],
  [9.951989, 76.330631], [9.951746, 76.330785], [9.950877, 76.331295], [9.950359, 76.331598],
  [9.950263, 76.33165], [9.950221, 76.331805], [9.950294, 76.33214], [9.951508, 76.335225],
  [9.952925, 76.339459], [9.953253, 76.340438], [9.954009, 76.34293], [9.95467, 76.34592],
  [9.954839, 76.346633], [9.955045, 76.347481], [9.955362, 76.348393], [9.955446, 76.34901],
  [9.955489, 76.34953], [9.955309, 76.349745], [9.954669, 76.350018], [9.95328, 76.350683],
  [9.950801, 76.35188], [9.951662, 76.351488], [9.954062, 76.350297], [9.955071, 76.349863],
  [9.95543, 76.349654], [9.955494, 76.349326], [9.955404, 76.348709], [9.955251, 76.348017],
  [9.954955, 76.347175]
];

// Real Kochi Metro stations from stops.txt with translations
const STATIONS = [
  { id: "STN-01", code: "ALVA", name: "Aluva", nameMl: "ആലുവ", lat: 10.1099, lng: 76.3495, isTerminal: true },
  { id: "STN-02", code: "PNCU", name: "Pulinchodu", nameMl: "പുളിഞ്ചോട്", lat: 10.0951, lng: 76.3466, isTerminal: false },
  { id: "STN-03", code: "CPPY", name: "Companypady", nameMl: "കമ്പനിപ്പടി", lat: 10.0873, lng: 76.3428, isTerminal: false },
  { id: "STN-04", code: "ATTK", name: "Ambattukavu", nameMl: "അമ്പാട്ടുകാവ്", lat: 10.0793, lng: 76.3389, isTerminal: false },
  { id: "STN-05", code: "MUTT", name: "Muttom", nameMl: "മുട്ടം", lat: 10.0727, lng: 76.3336, isTerminal: false },
  { id: "STN-06", code: "KLMT", name: "Kalamassery", nameMl: "കളമശ്ശേരി", lat: 10.0586, lng: 76.322, isTerminal: false },
  { id: "STN-07", code: "CCUV", name: "Cochin University", nameMl: "കൊച്ചിൻ യൂണിവേഴ്സിറ്റി", lat: 10.0467, lng: 76.3182, isTerminal: false },
  { id: "STN-08", code: "PDPM", name: "Pathadipalam", nameMl: "പത്തടിപ്പോലം", lat: 10.0361, lng: 76.3144, isTerminal: false },
  { id: "STN-09", code: "EDAP", name: "Edapally", nameMl: "ഇടപ്പള്ളി", lat: 10.0251, lng: 76.3083, isTerminal: false },
  { id: "STN-10", code: "CGPP", name: "Changampuzha Park", nameMl: "ചങ്ങമ്പുഴ പാർക്ക്", lat: 10.0152, lng: 76.3023, isTerminal: false },
  { id: "STN-11", code: "PARV", name: "Palarivattom", nameMl: "പാലാരിവട്ടം", lat: 10.0064, lng: 76.3048, isTerminal: false },
  { id: "STN-12", code: "JLSD", name: "JLN Stadium", nameMl: "ജെ എൽ എൻ സ്റ്റേഡിയം", lat: 10.0002, lng: 76.2989, isTerminal: false },
  { id: "STN-13", code: "KALR", name: "Kaloor", nameMl: "കലൂർ", lat: 9.9943, lng: 76.2914, isTerminal: false },
  { id: "STN-14", code: "TNHL", name: "Town Hall", nameMl: "ടൗൺ ഹാൾ", lat: 9.9913775, lng: 76.2883601, isTerminal: false },
  { id: "STN-15", code: "MGRD", name: "MG Road", nameMl: "എം.ജി റോഡ്", lat: 9.9834, lng: 76.2823, isTerminal: false },
  { id: "STN-16", code: "MACE", name: "Maharajas College", nameMl: "മഹാരാജാസ് കോളേജ്", lat: 9.9732, lng: 76.2851, isTerminal: false },
  { id: "STN-17", code: "ERSH", name: "Ernakulam South", nameMl: "എറണാകുളം സൗത്ത്", lat: 9.9686042, lng: 76.2895744, isTerminal: false },
  { id: "STN-18", code: "KVTR", name: "Kadavanthra", nameMl: "കടവന്ത്ര", lat: 9.9665809, lng: 76.2981877, isTerminal: false },
  { id: "STN-19", code: "EMKM", name: "Elamkulam", nameMl: "ഇളങ്കുളം", lat: 9.9671248, lng: 76.3084899, isTerminal: false },
  { id: "STN-20", code: "VYTA", name: "Vyttila", nameMl: "വൈറ്റില", lat: 9.9675457, lng: 76.3203664, isTerminal: false },
  { id: "STN-21", code: "THYK", name: "Thykoodam", nameMl: "തൈക്കൂടം", lat: 9.9600311, lng: 76.3236762, isTerminal: false },
  { id: "STN-22", code: "PETT", name: "Pettah", nameMl: "പേട്ട", lat: 9.9524842, lng: 76.3302101, isTerminal: false },
  { id: "STN-23", code: "VAKK", name: "Vadakkekotta", nameMl: "വടക്കേക്കോട്ട", lat: 9.952838, lng: 76.3394827, isTerminal: false },
  { id: "STN-24", code: "SNJN", name: "SN Junction", nameMl: "എസ്. എൻ. ജംഗ്ഷൻ", lat: 9.9547532, lng: 76.3458505, isTerminal: false },
  { id: "STN-25", code: "TPHT", name: "Tripunithura", nameMl: "തൃപ്പൂണിത്തുറ", lat: 9.95078, lng: 76.35183, isTerminal: true },
];

type LayerKey = "stations" | "trains" | "maintenance" | "alerts";

type StationType = {
  id: string;
  code: string;
  name: string;
  nameMl: string;
  lat: number;
  lng: number;
  isTerminal: boolean;
  state: OpsState;
  platformStatus: string;
  activeTrains: string[];
  footfall: string;
  maintenance: string;
  alerts: string[];
};

type TrainType = {
  id: string;
  status: string;
  condition: OpsState;
  conditionNote: string;
  assignment: string;
  driver: string;
  occupancy: string;
  speedKph: number;
  direction: 1 | -1;
  progress: number;
  lat: number;
  lng: number;
};

type AlertType = {
  id: string;
  severity: OpsState;
  location: string;
  description: string;
  affects: string;
  response: string;
  raisedAt: string;
  lat: number;
  lng: number;
};

function trainIcon(t: TrainType, highlighted: boolean, dark: boolean) {
  const chrome = dark ? "rgba(12,20,28,.92)" : "rgba(255,255,255,.95)";
  const color = t.status === "IBL" ? stateColor.critical : t.condition === "warning" ? stateColor.warning : RAIL;
  return L.divIcon({
    className: "",
    iconSize: [58, 22],
    iconAnchor: [29, 11],
    html: `<div style="display:flex;align-items:center;gap:4px;padding:2px 6px;border-radius:6px;
      background:${chrome};border:1px solid ${color};color:${color};
      font:600 10px/1 'IBM Plex Mono',monospace;white-space:nowrap;
      box-shadow:${highlighted ? `0 0 0 3px ${color}55, 0 0 14px ${color}` : "0 1px 4px rgba(0,0,0,.5)"};">
      <span style="width:6px;height:6px;border-radius:9px;background:${color}"></span>${t.id.replace("KMRL-", "").replace("TS-", "")}
    </div>`,
  });
}

function shapeIcon(kind: "maintenance" | "alert", state: OpsState, highlighted: boolean, dark: boolean) {
  const chrome = dark ? "rgba(12,20,28,.92)" : "rgba(255,255,255,.95)";
  const color = stateColor[state];
  const glyph = kind === "maintenance" ? "&#9881;" : "!";
  return L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="width:22px;height:22px;display:grid;place-items:center;color:${color};
      background:${chrome};border:1px solid ${color};
      border-radius:${kind === "maintenance" ? "5px" : "11px"};font:700 12px/1 'IBM Plex Mono',monospace;
      box-shadow:${highlighted ? `0 0 0 4px ${color}44, 0 0 16px ${color}` : "0 1px 4px rgba(0,0,0,.5)"};">${glyph}</div>`,
  });
}

function StatePill({ state, label }: { state: OpsState; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider"
      style={{ color: stateColor[state], background: `${stateColor[state]}1f`, border: `1px solid ${stateColor[state]}55` }}
    >
      <span className="size-1.5 rounded-full" style={{ background: stateColor[state] }} />
      {label}
    </span>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 py-0.5 text-[11px]">
      <span className="w-24 shrink-0 font-mono uppercase tracking-wider text-muted-foreground">{k}</span>
      <span className="flex-1 text-foreground">{v}</span>
    </div>
  );
}

function MapBridge({ onReady }: { onReady: (m: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
    setTimeout(() => map.invalidateSize(), 200);
  }, [map, onReady]);
  return null;
}

export default function SmartMapView() {
  const { mapFocus, setMapFocus, askKoraAbout, theme, lang } = useApp();
  const dark = theme === "dark";
  
  const { data: stationsData } = useApiData(fetchStations);
  const { data: trainsData } = useApiData(fetchTrainsets);
  const { data: alertsData } = useApiData(fetchAlerts);

  const [running, setRunning] = useState(true);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    stations: true,
    trains: true,
    maintenance: true,
    alerts: true,
  });
  const [fullscreen, setFullscreen] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Merge API data with GTFS station data
  const stations: StationType[] = useMemo(() => {
    const apiStations = Array.isArray(stationsData) ? stationsData : (stationsData as any)?.data || [];
    
    // Use GTFS data as base, merge with API data if available
    return STATIONS.map((gtfsStation) => {
      const apiStation = apiStations.find((s: any) => s.id === gtfsStation.id);
      return {
        id: gtfsStation.id,
        code: gtfsStation.code,
        name: gtfsStation.name,
        nameMl: gtfsStation.nameMl,
        lat: apiStation?.lat ?? gtfsStation.lat,
        lng: apiStation?.lng ?? gtfsStation.lng,
        isTerminal: gtfsStation.isTerminal,
        state: "normal" as OpsState,
        platformStatus: "Operational",
        activeTrains: [],
        footfall: "Normal",
        maintenance: "None",
        alerts: [],
      };
    });
  }, [stationsData]);

  const trains: TrainType[] = useMemo(() => {
    const raw = Array.isArray(trainsData) ? trainsData : (trainsData as any)?.data || [];
    return raw.map((t: any, idx: number) => {
      const progress = idx / Math.max(raw.length - 1, 1);
      const routeIdx = Math.round(progress * (METRO_LINE_COORDS.length - 1));
      const boundedIdx = Math.min(Math.max(routeIdx, 0), METRO_LINE_COORDS.length - 1);
      const pos = METRO_LINE_COORDS[boundedIdx] as [number, number];
      
      return {
        id: t.train_id || t.id || `TS-${String(idx + 1).padStart(2, "0")}`,
        status: t.status || "SERVICE",
        condition: "normal" as OpsState,
        conditionNote: "All systems nominal",
        assignment: "Revenue Service",
        driver: "Auto / Staff",
        occupancy: "Moderate",
        speedKph: t.status === "SERVICE" ? 45 : 0,
        direction: 1 as 1 | -1,
        progress,
        lat: pos[0],
        lng: pos[1],
      };
    });
  }, [trainsData]);

  const alerts: AlertType[] = useMemo(() => {
    const raw = Array.isArray(alertsData) ? alertsData : (alertsData as any)?.data || [];
    return raw.map((a: any, idx: number) => {
      const st = stations[idx % Math.max(stations.length, 1)];
      return {
        id: a.id,
        severity: (a.severity === "critical" ? "critical" : a.severity === "warning" ? "warning" : "normal") as OpsState,
        location: st ? (lang === "ml" ? st.nameMl : st.name) : "Network",
        description: a.title || "Operational Alert",
        affects: "Operations",
        response: "Control room notified",
        raisedAt: new Date().toLocaleTimeString(),
        lat: st?.lat ?? 10.03,
        lng: st?.lng ?? 76.315,
      };
    });
  }, [alertsData, stations, lang]);

  const networkStatus = useMemo(() => {
    const inService = trains.filter((t) => t.status === "SERVICE").length;
    const underMaintenance = trains.filter((t) => t.status === "IBL").length;
    const activeAlerts = alerts.filter((a) => a.severity === "critical" || a.severity === "warning").length;
    return {
      stations: stations.length,
      inService,
      underMaintenance,
      activeAlerts,
    };
  }, [trains, alerts, stations]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      // Simulation logic
    }, 700);
    return () => clearInterval(id);
  }, [running]);

  const highlighted = useMemo(() => new Set(mapFocus?.ids ?? []), [mapFocus]);

  const fitRoute = useCallback(() => {
    mapRef.current?.fitBounds(L.latLngBounds(METRO_LINE_COORDS.map((p) => L.latLng(p[0], p[1]))), { padding: [50, 50] });
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapFocus) return;
    const pts: [number, number][] = [];
    if (mapFocus.kind === "station") stations.filter((s) => highlighted.has(s.id)).forEach((s) => pts.push([s.lat, s.lng]));
    if (mapFocus.kind === "maintenance") MAINTENANCE_SITES.filter((m) => highlighted.has(m.id)).forEach((m) => pts.push([m.lat, m.lng]));
    if (mapFocus.kind === "alert") alerts.filter((a) => highlighted.has(a.id)).forEach((a) => pts.push([a.lat, a.lng]));
    
    if (mapFocus.kind === "network" || pts.length === 0) {
      fitRoute();
      return;
    }
    if (pts.length === 1) {
      const first = pts[0];
      if (first) map.flyTo(first, 15, { duration: 0.9 });
    } else {
      map.flyToBounds(L.latLngBounds(pts.map((p) => L.latLng(p[0], p[1]))), { padding: [70, 70], duration: 0.9 });
    }
  }, [mapFocus?.ts, stations, alerts, fitRoute, highlighted]);

  const toggleFullscreen = () => {
    setFullscreen((f) => !f);
    setTimeout(() => mapRef.current?.invalidateSize(), 250);
  };

  const ctrlBtn = "grid size-9 place-items-center rounded-md border border-border bg-card/90 text-muted-foreground backdrop-blur transition-colors hover:border-primary/60 hover:text-primary";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-card",
        fullscreen ? "fixed inset-0 z-50 rounded-none" : "h-[68vh] min-h-[520px] w-full",
      )}
    >
      <MapContainer
        center={KOCHI_CENTER}
        zoom={12}
        zoomControl={false}
        scrollWheelZoom
        className="size-full"
        style={{ background: "var(--map-surface)" }}
      >
        <MapBridge onReady={(m) => (mapRef.current = m)} />
        <TileLayer
          key={dark ? "dark" : "light"}
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url={`https://{s}.basemaps.cartocdn.com/${dark ? "dark_all" : "light_all"}/{z}/{x}/{y}{r}.png`}
        />

        <Polyline positions={METRO_LINE_COORDS} pathOptions={{ color: dark ? "#0e3b45" : "#cfdde1", weight: 11, opacity: 0.9, lineCap: "round" }} />
        <Polyline positions={METRO_LINE_COORDS} pathOptions={{ color: RAIL, weight: 4, opacity: 0.95, lineCap: "round" }} />

        {layers.stations &&
          stations.map((s) => {
            const hl = highlighted.has(s.id);
            return (
              <CircleMarker
                key={s.id}
                center={[s.lat, s.lng]}
                radius={hl ? 11 : s.isTerminal ? 8 : 6}
                pathOptions={{
                  color: stateColor[s.state],
                  weight: hl ? 4 : 2,
                  fillColor: dark ? "#0b1218" : "#ffffff",
                  fillOpacity: 1,
                }}
              >
                <Popup minWidth={280}>
                  <div className="space-y-2 font-sans">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{lang === "ml" ? s.nameMl : s.name}</p>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {s.code} · Station {s.id}
                        </p>
                      </div>
                      <StatePill state={s.state} label={s.state} />
                    </div>
                    <div className="border-t border-border pt-1">
                      <Row k="Platforms" v={s.platformStatus} />
                      <Row k="Active trains" v={s.activeTrains.length ? s.activeTrains.join(", ") : "None at platform"} />
                      <Row k="Passengers" v={s.footfall} />
                      <Row k="Maintenance" v={s.maintenance} />
                      <Row k="Alerts" v={s.alerts.length ? s.alerts.join(" · ") : "No open alerts"} />
                    </div>
                    <button
                      onClick={() => askKoraAbout(`What is the status of ${lang === "ml" ? s.nameMl : s.name}?`)}
                      className="flex w-full items-center justify-center gap-1.5 rounded border border-primary/50 bg-primary/10 px-2 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/20"
                    >
                      <MessageSquare className="size-3" /> Ask KORA about this
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {layers.trains &&
          trains.map((t) => {
            const nearIdx = Math.round(t.progress * (stations.length - 1));
            const near = stations[Math.min(Math.max(nearIdx, 0), stations.length - 1)];
            const nxt = stations[Math.min(stations.length - 1, nearIdx + (t.direction > 0 ? 1 : -1))];

            return (
              <Marker key={t.id} position={[t.lat, t.lng] as [number, number]} icon={trainIcon(t, highlighted.has(t.id), dark)} zIndexOffset={500}>
                <Popup minWidth={280}>
                  <div className="space-y-2 font-sans">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{t.id}</p>
                      <StatePill
                        state={t.status === "IBL" ? "critical" : t.status === "STANDBY" ? "warning" : "normal"}
                        label={t.status}
                      />
                    </div>
                    <div className="border-t border-border pt-1">
                      <Row k="Location" v={`Near ${lang === "ml" ? (near?.nameMl ?? near?.name ?? "Unknown") : (near?.name ?? "Unknown")}`} />
                      <Row k="Next stop" v={t.speedKph > 0 ? (lang === "ml" ? (nxt?.nameMl ?? nxt?.name ?? "Unknown") : (nxt?.name ?? "Unknown")) : "Stationary"} />
                      <Row k="Speed" v={`${t.speedKph} km/h`} />
                      <Row k="Condition" v={t.conditionNote} />
                      <Row k="Assignment" v={t.assignment} />
                      <Row k="Operator" v={t.driver} />
                      <Row k="Occupancy" v={t.occupancy} />
                    </div>
                    <button
                      onClick={() => askKoraAbout(`Where is train ${t.id}?`)}
                      className="flex w-full items-center justify-center gap-1.5 rounded border border-primary/50 bg-primary/10 px-2 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/20"
                    >
                      <MessageSquare className="size-3" /> Ask KORA about this
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {layers.maintenance &&
          MAINTENANCE_SITES.map((m) => (
            <Marker
              key={m.id}
              position={[m.lat, m.lng] as [number, number]}
              icon={shapeIcon("maintenance", m.state, highlighted.has(m.id), dark)}
              zIndexOffset={300}
            >
              <Popup minWidth={280}>
                <div className="space-y-2 font-sans">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{m.name}</p>
                    <StatePill state={m.state} label={m.priority} />
                  </div>
                  <div className="border-t border-border pt-1">
                    <Row k="Work order" v={m.workOrder} />
                    <Row k="Type" v={m.maintenanceType} />
                    <Row k="Team" v={m.team} />
                    <Row k="Status" v={m.status} />
                    <Row k="ETA" v={m.expectedCompletion} />
                  </div>
                  <button
                    onClick={() => askKoraAbout(`Which maintenance locations are active?`)}
                    className="flex w-full items-center justify-center gap-1.5 rounded border border-primary/50 bg-primary/10 px-2 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/20"
                  >
                    <MessageSquare className="size-3" /> Ask KORA about this
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

        {layers.alerts &&
          alerts.map((a) => (
            <Marker
              key={a.id}
              position={[a.lat, a.lng] as [number, number]}
              icon={shapeIcon("alert", a.severity, highlighted.has(a.id), dark)}
              zIndexOffset={700}
            >
              <Popup minWidth={280}>
                <div className="space-y-2 font-sans">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{a.location}</p>
                    <StatePill state={a.severity} label={a.severity} />
                  </div>
                  <div className="border-t border-border pt-1">
                    <Row k="Description" v={a.description} />
                    <Row k="Affects" v={a.affects} />
                    <Row k="Response" v={a.response} />
                    <Row k="Raised" v={a.raisedAt} />
                  </div>
                  <button
                    onClick={() => askKoraAbout(`What's happening at ${a.location}?`)}
                    className="flex w-full items-center justify-center gap-1.5 rounded border border-primary/50 bg-primary/10 px-2 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/20"
                  >
                    <MessageSquare className="size-3" /> Ask KORA about this
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-3 z-[1000] w-56 rounded-md border border-border bg-card/90 p-3 backdrop-blur">
        <p className="mono-label mb-2">Network status</p>
        <div className="space-y-1.5 text-xs">
          {[
            { l: "Stations", v: networkStatus.stations.toString(), c: RAIL },
            { l: "Trains in service", v: networkStatus.inService.toString(), c: stateColor.normal },
            { l: "Under maintenance", v: networkStatus.underMaintenance.toString(), c: stateColor.warning },
            { l: "Active alerts", v: networkStatus.activeAlerts.toString(), c: stateColor.critical },
          ].map((r) => (
            <div key={r.l} className="flex items-center justify-between">
              <span className="text-muted-foreground">{r.l}</span>
              <span className="font-mono font-semibold" style={{ color: r.c }}>
                {r.v}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-3 left-3 z-[1000] w-56 rounded-md border border-border bg-card/90 p-3 backdrop-blur">
        <p className="mono-label mb-2 flex items-center gap-1.5">
          <Layers className="size-3" /> Layers
        </p>
        <div className="space-y-1">
          {(
            [
              ["stations", "Metro stations"],
              ["trains", "Active trainsets"],
              ["maintenance", "Maintenance / IBL"],
              ["alerts", "Operational alerts"],
            ] as [LayerKey, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setLayers((p) => ({ ...p, [k]: !p[k] }))}
              className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-xs transition-colors hover:bg-secondary/60"
            >
              <span
                className={cn(
                  "grid size-3.5 place-items-center rounded-[3px] border text-[9px]",
                  layers[k] ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent",
                )}
              >
                ✓
              </span>
              <span className={layers[k] ? "text-foreground" : "text-muted-foreground"}>{label}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 border-t border-border pt-2">
          <p className="mono-label mb-1.5">Legend</p>
          <div className="space-y-1 text-[11px] text-muted-foreground">
            {(
              [
                ["normal", "Normal"],
                ["warning", "Warning"],
                ["critical", "Critical"],
              ] as [OpsState, string][]
            ).map(([s, l]) => (
              <div key={s} className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: stateColor[s] }} />
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-1.5">
        <button className={ctrlBtn} title="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
          <Plus className="size-4" />
        </button>
        <button className={ctrlBtn} title="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
          <Minus className="size-4" />
        </button>
        <button
          className={ctrlBtn}
          title="Reset to Kochi"
          onClick={() => {
            setMapFocus(null);
            mapRef.current?.flyTo(KOCHI_CENTER, 12, { duration: 0.8 });
          }}
        >
          <LocateFixed className="size-4" />
        </button>
        <button className={ctrlBtn} title="Fit entire route" onClick={fitRoute}>
          <Frame className="size-4" />
        </button>
        <button className={ctrlBtn} title="Fullscreen" onClick={toggleFullscreen}>
          {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
        <button
          className={ctrlBtn}
          title={running ? "Pause simulation" : "Resume simulation"}
          onClick={() => setRunning((r) => !r)}
        >
          {running ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
      </div>

      {mapFocus && mapFocus.ids.length > 0 && (
        <div className="absolute bottom-3 right-3 z-[1000] flex items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-xs text-primary backdrop-blur">
          Highlighting {mapFocus.ids.length} {mapFocus.kind}
          {mapFocus.ids.length > 1 ? "s" : ""} from KORA
          <button className="rounded border border-primary/40 px-1.5 py-0.5" onClick={() => setMapFocus(null)}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}