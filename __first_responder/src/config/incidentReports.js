// Detailed incident reports for each incident type
// Multiple variations for each type to add variety

export const INCIDENT_REPORTS = {
  // BASIC INCIDENTS
  NOISE_COMPLAINT: [
    "Caller reports loud music coming from {address}. Started approximately 30 minutes ago. Multiple neighbors affected.",
    "Excessive noise from a house party at the location. Caller states it's been going on for over an hour.",
    "Construction noise during evening hours. Workers appear to still be on site despite noise ordinance.",
    "Barking dogs at the residence have been going on for {time} hours. Owner appears to be absent.",
    "Vehicle with loud exhaust system repeatedly driving through the area. Disturbing residents."
  ],
  
  TRAFFIC_VIOLATION: [
    "Vehicle illegally parked in handicap space without proper permit. {vehicle_description}.",
    "Car blocking fire hydrant at the location. Has been there for over {time} hours.",
    "Multiple vehicles double-parked on street, blocking traffic flow.",
    "Commercial truck parked in residential zone overnight. License plate: {plate}.",
    "Abandoned vehicle partially blocking roadway. Appears to have been there several days."
  ],
  
  VANDALISM: [
    "Fresh graffiti discovered on {building_type} wall. Paint appears to be {color} spray paint.",
    "Multiple mailboxes knocked over on the street. Appears to be intentional damage.",
    "Vehicle windows smashed overnight. Glass scattered in parking area.",
    "Someone egged the front of the building. Damage discovered this morning.",
    "Park benches spray painted with offensive language. Children's play area affected."
  ],
  
  FOUND_PROPERTY: [
    "Wallet found on sidewalk containing ID and credit cards. Turned in by good samaritan.",
    "Bicycle left at location for several days. No identifying information visible.",
    "Backpack found at bus stop. Contains what appears to be school supplies.",
    "Set of car keys found in parking lot. Has {vehicle_make} key fob.",
    "Cell phone found on park bench. Screen is cracked but device still functional."
  ],
  
  // STANDARD INCIDENTS
  THEFT_UNDER_500: [
    "Store reports shoplifter took {item} valued at ${amount}. Suspect fled on foot heading {direction}.",
    "Bicycle stolen from front yard while owner was inside. Value approximately ${amount}.",
    "Package theft from porch. Delivery confirmed at {time}. Neighbor has doorbell camera footage.",
    "Gas drive-off reported. Vehicle took ${amount} in fuel without paying. {vehicle_description}.",
    "Tools stolen from unlocked vehicle overnight. Owner estimates ${amount} in losses."
  ],
  
  SHOPLIFTING: [
    "Security detained subject attempting to leave store with unpaid merchandise. Subject is cooperative.",
    "Employee observed customer concealing items in bag. Loss prevention maintaining visual.",
    "Known shoplifter entered store. Staff requesting police presence before confrontation.",
    "Juvenile caught stealing {item}. Parents have been contacted and are en route.",
    "Group distraction theft in progress. Multiple subjects working together."
  ],
  
  DISTURBANCE: [
    "Verbal argument between neighbors escalating. No weapons seen but getting heated.",
    "Group of individuals causing disturbance outside {location}. Refusing to disperse.",
    "Customer refusing to leave business after being asked. Becoming increasingly agitated.",
    "Large gathering in park after hours. Music and yelling disturbing nearby residents.",
    "Street fight between multiple individuals. Crowd gathering to watch."
  ],
  
  SUSPICIOUS_PERSON: [
    "Unknown subject looking into vehicle windows in parking lot. Checking door handles.",
    "Individual loitering near school playground. No children present but concerning behavior.",
    "Person going door-to-door claiming to be utility worker. No uniform or ID visible.",
    "Subject sitting in vehicle for extended period watching {location}. Been there {time} hours.",
    "Individual acting erratically near ATM. Possibly casing for potential victims."
  ],
  
  // INTERMEDIATE INCIDENTS
  CHECK_WELFARE: [
    "Elderly neighbor hasn't been seen in {time} days. Mail piling up, lights left on.",
    "Family requesting check on relative. Not answering phone calls since {day}.",
    "Coworker failed to show for work {time} days in a row. Very unusual, employer concerned.",
    "Strange smell coming from apartment. Neighbors concerned about occupant's wellbeing.",
    "Child called stating parent won't wake up. Unsure of situation, requesting immediate check."
  ],
  
  DOMESTIC_INCIDENT: [
    "Verbal argument between partners. Caller states it's getting louder. No weapons mentioned.",
    "Ex-partner at residence refusing to leave. Custody dispute over children.",
    "Neighbor reports hearing loud argument and things being thrown. Ongoing for {time} minutes.",
    "Subject violated restraining order. Currently at protected party's residence.",
    "Family dispute over property. Multiple family members involved, situation escalating."
  ],
  
  BURGLARY_RESIDENTIAL: [
    "Homeowner returned to find back door forced open. House has been ransacked. Suspects gone.",
    "Neighbor reports seeing unknown individuals loading items from house into van. Owners on vacation.",
    "Alarm company reports residential alarm. Keyholder en route, motion detected in multiple rooms.",
    "Window broken at rear of house. Caller can see someone inside with flashlight.",
    "Tool marks on door frame discovered. Entry attempted but appears unsuccessful."
  ],
  
  DUI_DWI: [
    "Vehicle swerving across lanes on {road}. Nearly struck several cars. {vehicle_description}.",
    "Driver passed out behind wheel at traffic light. Vehicle running, foot on brake.",
    "Erratic driver just left {location} after staff observed them heavily intoxicated.",
    "Wrong-way driver reported on {road}. Multiple callers reporting same vehicle.",
    "Vehicle crashed into mailbox and fled. Driver appeared impaired. Partial plate: {plate}."
  ],
  
  HIT_AND_RUN: [
    "Vehicle struck parked car and fled scene. Significant damage, witness got partial plate.",
    "Pedestrian struck in crosswalk. Vehicle fled {direction}. Victim conscious but injured.",
    "Multiple parked vehicles damaged by fleeing driver. Paint transfer and debris left at scene.",
    "Bicyclist struck by vehicle that didn't stop. Cyclist has minor injuries, refusing ambulance.",
    "Driver hit stop sign and utility pole, then fled on foot. Vehicle left running at scene."
  ],
  
  // ADVANCED INCIDENTS
  MVC_MAJOR: [
    "Multi-vehicle collision blocking all lanes. Smoke visible, possible entrapment. Major injuries likely.",
    "Head-on collision reported. Both vehicles with heavy damage. Multiple ambulances requested.",
    "Vehicle rolled over multiple times. Ejection reported. Landing in opposite lanes.",
    "School bus involved in collision. {number} children on board. Triage needed.",
    "Chain reaction crash involving {number} vehicles. Hazmat concerns due to leaking fluids."
  ],
  
  DANGEROUS_DRUGS: [
    "Known drug house with heavy traffic. Multiple individuals coming and going. Neighbors fed up.",
    "Subject overdosing in public restroom. Narcan administered by bystander. Still unresponsive.",
    "Large quantity of suspected narcotics found during traffic stop. K9 alerted on vehicle.",
    "Drug deal in progress behind {location}. Multiple subjects and vehicles involved.",
    "Suspicious package containing unknown white powder found. Building evacuated as precaution."
  ],
  
  ROBBERY: [
    "Armed robbery just occurred at {business}. Suspect displayed handgun. Fled with ${amount}.",
    "Strong-arm robbery of elderly victim. Suspect pushed victim down and took purse/wallet.",
    "Bank robbery in progress. Silent alarm activated. Suspect passed note to teller.",
    "Carjacking at gunpoint. Victim safe but shaken. Vehicle last seen heading {direction}.",
    "Home invasion robbery. Multiple suspects forced entry while residents home. Suspects fled."
  ],
  
  ASSAULT: [
    "Victim struck multiple times with blunt object. Conscious but bleeding from head wound.",
    "Large fight outside {location}. Multiple combatants, weapons possibly involved.",
    "Domestic violence incident. Victim has visible injuries, suspect still on scene.",
    "Random assault on street. Victim punched without provocation. Suspect fled on foot.",
    "Bar fight spilled into parking lot. Baseball bats and bottles being used as weapons."
  ],
  
  PURSUIT_VEHICLE: [
    "Vehicle fled traffic stop at high speed. Heading {direction} on {road}. Multiple units requested.",
    "Stolen vehicle spotted, refused to stop. Pursuit authorized. Speeds exceeding 90 mph.",
    "Suspect vehicle from earlier robbery fleeing area. Reckless driving through residential area.",
    "Motorcycle evading at extreme speeds. Splitting lanes and running red lights.",
    "Armed carjacking suspect fleeing in victim's vehicle. Considered armed and dangerous."
  ],
  
  // SPECIALIZED INCIDENTS
  SHOTS_FIRED: [
    "Multiple gunshots heard. Caller counted {number} shots. People running from area.",
    "Drive-by shooting reported. Vehicle fled scene. Multiple shell casings visible.",
    "Gunfire exchange between multiple parties. Ongoing situation. Take cover positions.",
    "Shots fired inside {location}. Screaming heard. Unknown if anyone hit.",
    "Automatic weapons fire reported. Multiple callers. Possible multiple shooters."
  ],
  
  BOMB_THREAT: [
    "Bomb threat called into {location}. Evacuation in progress. Specific time given: {time}.",
    "Suspicious package found with wires visible. Note attached with threats. Area being cleared.",
    "Email bomb threat received by multiple businesses in area. Coordinated threat suspected.",
    "Abandoned backpack at {location} with threatening note. K9 and bomb squad requested.",
    "Former employee made bomb threats to workplace. Currently evacuating {number} people."
  ],
  
  // CRITICAL INCIDENTS
  VIOLENT_PROTEST_LARGE: [
    "Large protest turning violent. Bottles and rocks being thrown. Multiple injuries reported.",
    "Riot conditions developing at {location}. Fires being set. Looting beginning.",
    "Counter-protesters clashing with main group. {number} estimated involved. Escalating rapidly.",
    "Protest blocked major intersection. Vehicles being damaged. Officers requesting immediate backup.",
    "Mass civil unrest spreading through district. Multiple agencies requested. Command post needed."
  ],
  
  ARMED_STANDOFF: [
    "Barricaded subject with hostages. Demands being made. SWAT and negotiators requested.",
    "Armed subject refusing to exit residence. Shots fired at officers. Perimeter established.",
    "Suicidal subject with weapons. Threatening suicide by cop. Area evacuated.",
    "Domestic turned into barricade situation. Children possibly inside. Negotiators needed.",
    "Bank robbery suspect barricaded with employees. Unknown number of hostages. Making demands."
  ],
  
  TERRORISM_THREAT: [
    "Credible threat to {target}. Federal agencies notified. Immediate response required.",
    "Multiple coordinated incidents reported. Pattern suggests terrorist activity. All units respond.",
    "Chemical agent released at {location}. Mass casualties. Hazmat and decon needed immediately.",
    "Active shooter at multiple locations. Coordinated attack suspected. Mass casualty incident.",
    "Critical infrastructure under attack. Power/water systems compromised. Multi-agency response."
  ],
  
  HIGH_RISE_TAKEOVER: [
    "Armed group has taken control of {building} floor {number}. Unknown number of hostages.",
    "Multiple gunmen in office building. Employees trapped on upper floors. Tactical response needed.",
    "Terrorist group claimed responsibility for building takeover. Demands being broadcast.",
    "Fire alarms pulled in high-rise during takeover. Evacuation complicated by armed suspects.",
    "Executive floor of {building} under siege. VIP hostages confirmed. Federal agencies en route."
  ],
  
  PRISONER_ESCAPE: [
    "Prison transport vehicle crashed. {number} inmates unaccounted for. Considered dangerous.",
    "Jail break in progress. Multiple inmates attempting escape. Perimeter breach confirmed.",
    "Escaped prisoner spotted in area. Armed and dangerous. Last seen wearing {description}.",
    "Courthouse escape during transport. Deputy injured. Suspect fled into surrounding area.",
    "Maximum security inmate escaped during medical transport. Manhunt underway. Public safety alert."
  ]
};

// Function to get a random report for an incident type
export const getRandomIncidentReport = (incidentType) => {
  const reports = INCIDENT_REPORTS[incidentType];
  if (!reports || reports.length === 0) {
    return `${incidentType.replace(/_/g, ' ').toLowerCase()} reported at location.`;
  }
  
  let report = reports[Math.floor(Math.random() * reports.length)];
  
  // Replace variables in report
  report = report.replace(/{time}/g, Math.floor(Math.random() * 4) + 1);
  report = report.replace(/{number}/g, Math.floor(Math.random() * 20) + 2);
  report = report.replace(/{amount}/g, Math.floor(Math.random() * 400) + 50);
  report = report.replace(/{direction}/g, ['north', 'south', 'east', 'west'][Math.floor(Math.random() * 4)]);
  report = report.replace(/{day}/g, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][Math.floor(Math.random() * 5)]);
  report = report.replace(/{color}/g, ['red', 'blue', 'black', 'white', 'silver'][Math.floor(Math.random() * 5)]);
  report = report.replace(/{vehicle_make}/g, ['Ford', 'Toyota', 'Honda', 'Chevrolet', 'Nissan'][Math.floor(Math.random() * 5)]);
  report = report.replace(/{vehicle_description}/g, getRandomVehicleDescription());
  report = report.replace(/{plate}/g, generatePartialPlate());
  report = report.replace(/{item}/g, ['electronics', 'clothing', 'tools', 'alcohol', 'groceries'][Math.floor(Math.random() * 5)]);
  report = report.replace(/{building_type}/g, ['business', 'school', 'residence', 'church', 'store'][Math.floor(Math.random() * 5)]);
  report = report.replace(/{location}/g, ['convenience store', 'gas station', 'restaurant', 'bank', 'pharmacy'][Math.floor(Math.random() * 5)]);
  report = report.replace(/{business}/g, ['7-Eleven', 'Shell Station', 'Wells Fargo', 'CVS Pharmacy', 'McDonald\'s'][Math.floor(Math.random() * 5)]);
  report = report.replace(/{road}/g, ['Main Street', 'Highway 1', 'Oak Avenue', 'Park Road', 'First Avenue'][Math.floor(Math.random() * 5)]);
  report = report.replace(/{target}/g, ['city hall', 'police station', 'power plant', 'water treatment facility', 'transportation hub'][Math.floor(Math.random() * 5)]);
  report = report.replace(/{building}/g, ['First National Bank Tower', 'City Center Plaza', 'Corporate Heights', 'Metro Tower', 'Downtown Financial Center'][Math.floor(Math.random() * 5)]);
  report = report.replace(/{description}/g, ['orange jumpsuit', 'blue prison uniform', 'gray corrections outfit', 'stolen civilian clothes'][Math.floor(Math.random() * 4)]);
  
  return report;
};

// Helper functions
function getRandomVehicleDescription() {
  const colors = ['red', 'blue', 'black', 'white', 'silver', 'gray', 'green'];
  const makes = ['Ford', 'Toyota', 'Honda', 'Chevrolet', 'Nissan', 'Dodge', 'BMW'];
  const types = ['sedan', 'SUV', 'pickup truck', 'van', 'coupe'];
  
  return `${colors[Math.floor(Math.random() * colors.length)]} ${makes[Math.floor(Math.random() * makes.length)]} ${types[Math.floor(Math.random() * types.length)]}`;
}

function generatePartialPlate() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const patterns = [
    () => `${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}-****`,
    () => `****-${numbers[Math.floor(Math.random() * 10)]}${numbers[Math.floor(Math.random() * 10)]}${numbers[Math.floor(Math.random() * 10)]}`,
    () => `${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}-${numbers[Math.floor(Math.random() * 10)]}${numbers[Math.floor(Math.random() * 10)]}**`,
    () => `${numbers[Math.floor(Math.random() * 10)]}${letters[Math.floor(Math.random() * 26)]}****`
  ];
  
  return patterns[Math.floor(Math.random() * patterns.length)]();
}