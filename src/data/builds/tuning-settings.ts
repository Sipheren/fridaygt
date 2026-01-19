// GT7 Tuning Settings Data
// Source: gt7data/gt7_tuning_settings.csv
// 62 settings organized by section (as displayed in GT7 UI)

export interface TuningSection {
  name: string;
  settings: string[];
}

export const TUNING_SECTIONS: TuningSection[] = [
  {
    name: "Tyres",
    settings: ["Front", "Rear"],
  },
  {
    name: "Suspension",
    settings: [
      "Suspension",
      "Body Height Adjustment",
      "Anti-Roll Bar",
      "Damping Ratio (Compression)",
      "Damping Ratio (Expansion)",
      "Natural Frequency",
      "Negative Camber Angle",
      "Toe Angle",
    ],
  },
  {
    name: "Differential Gear",
    settings: [
      "Differential",
      "Initial Torque",
      "Acceleration Sensitivity",
      "Braking Sensitivity",
      "Torque-Vectoring Centre Differential",
      "Front/Rear Torque Distribution",
    ],
  },
  {
    name: "Aerodynamics",
    settings: ["Downforce"],
  },
  {
    name: "ECU",
    settings: ["ECU", "Output Adjustment"],
  },
  {
    name: "Performance Adjustment",
    settings: ["Ballast", "Ballast Positioning", "Power Restrictor"],
  },
  {
    name: "Transmission",
    settings: [
      "Transmission",
      "Top Speed (Automatically Adjusted)",
      "Manual Adjustment",
    ],
  },
  {
    name: "Nitrous/Overtake",
    settings: ["Nitrous/Overtake", "Output Adjustment"],
  },
  {
    name: "Supercharger",
    settings: [
      "Turbocharger",
      "Anti-Lag",
      "Anti-Lag System",
      "Intercooler",
      "Supercharger",
    ],
  },
  {
    name: "Intake & Exhaust",
    settings: ["Air Cleaner", "Silencer", "Exhaust Manifold"],
  },
  {
    name: "Brakes",
    settings: [
      "Brake System",
      "Brake Pads",
      "Handbrake",
      "Handbrake Torque",
      "Brake Balance",
      "Front/Rear Balance",
    ],
  },
  {
    name: "Steering",
    settings: ["Steering Angle Kit", "4WS System", "Rear Steering Angle"],
  },
  {
    name: "Drivetrain",
    settings: ["Clutch & Flywheel", "Propeller Shaft"],
  },
  {
    name: "Engine Tuning",
    settings: [
      "Bore Up",
      "Stroke Up",
      "Engine Balance Tuning",
      "Polish Ports",
      "High Lift Camshaft",
      "Titanium Connecting Rods & Pistons",
      "Racing Crank Shaft",
      "High Compression Pistons",
    ],
  },
  {
    name: "Bodywork",
    settings: [
      "Weight Reduction: Stage 1",
      "Weight Reduction: Stage 2",
      "Weight Reduction: Stage 3",
      "Weight Reduction: Stage 4",
      "Weight Reduction: Stage 5",
      "Increase Body Rigidity",
    ],
  },
];

// Helper to get all unique setting names
export const ALL_TUNING_SETTINGS = TUNING_SECTIONS.flatMap((section) =>
  section.settings,
);

// Helper to get section for a specific setting
export function getTuningSection(settingName: string): string | undefined {
  for (const section of TUNING_SECTIONS) {
    if (section.settings.includes(settingName)) {
      return section.name;
    }
  }
  return undefined;
}
