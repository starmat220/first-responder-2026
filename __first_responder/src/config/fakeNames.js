// List of 100 fake names for emergency callers
export const FAKE_NAMES = [
  // A
  "Alex Thompson", "Amanda Williams", "Andrew Martinez", "Ashley Johnson", "Aaron Davis",
  "Alice Cooper", "Anthony Brown", "Amy Chen", "Adam Miller", "Angela Smith",
  
  // B
  "Brian Wilson", "Barbara Taylor", "Benjamin Lee", "Brittany Anderson", "Brandon Harris",
  "Brenda White", "Bruce Campbell", "Beth Robinson", "Blake Turner", "Bonnie Garcia",
  
  // C
  "Christopher Evans", "Christina Lopez", "Charles Martin", "Catherine King", "Carl Wright",
  "Carol Mitchell", "Connor Young", "Cindy Hall", "Craig Baker", "Claire Nelson",
  
  // D
  "David Rodriguez", "Diana Moore", "Daniel Clark", "Donna Lewis", "Derek Walker",
  "Deborah Green", "Douglas Allen", "Denise Scott", "Dylan Adams", "Dorothy Hill",
  
  // E
  "Edward Thomas", "Emily Jackson", "Eric Martinez", "Elizabeth Turner", "Ethan Phillips",
  "Emma Roberts", "Eugene Campbell", "Eva Peterson", "Earl Gray", "Ellen Stewart",
  
  // F
  "Frank Morris", "Frances Rivera", "Frederick Cook", "Faith Murphy", "Felix Bailey",
  
  // G
  "George Rivera", "Grace Cooper", "Gary Reed", "Gloria Ward", "Grant Foster",
  
  // H
  "Henry Collins", "Helen Edwards", "Harold Murphy", "Hannah Gonzalez", "Howard Ross",
  
  // J
  "James Bennett", "Jennifer Wood", "John Peterson", "Jessica Hayes", "Jason Myers",
  "Julia James", "Joseph Powell", "Janet Long", "Jack Hughes", "Joan Price",
  
  // K
  "Kevin Butler", "Karen Washington", "Kyle Sanders", "Kimberly Perry", "Keith Jenkins",
  
  // L
  "Lawrence Coleman", "Lisa Henderson", "Luke Patterson", "Laura Bryant", "Leonard Russell",
  
  // M
  "Michael Griffin", "Maria Diaz", "Matthew Simmons", "Margaret Foster", "Mark Torres",
  "Michelle Watson", "Marcus Brooks", "Melissa Kelly", "Martin Price", "Mary Reed",
  
  // N
  "Nicholas Barnes", "Nancy Ross", "Nathan Powell", "Nicole Morgan", "Norman Cox",
  
  // P
  "Paul Richardson", "Patricia Wood", "Peter Bailey", "Pamela Bell", "Philip Murphy",
  
  // R
  "Robert Howard", "Rachel Ward", "Ryan Cooper", "Rebecca Gray", "Raymond James",
  "Ruth Phillips", "Richard Evans", "Rose Alexander", "Ronald Russell", "Rita Hayes",
  
  // S
  "Steven Ramirez", "Sarah Watson", "Samuel Kim", "Sandra Long", "Scott Peterson",
  "Susan Butler", "Shane Coleman", "Stephanie Jenkins", "Sean Henderson", "Sharon Bryant",
  
  // T
  "Thomas Powell", "Teresa Morgan", "Timothy Cox", "Tiffany Bell", "Tyler Griffin",
  
  // V
  "Victor Simmons", "Victoria Alexander", "Vincent Kelly", "Vanessa Torres", "Vernon Barnes",
  
  // W
  "William Richardson", "Wendy Howard", "Walter Ramirez", "Wanda Kim", "Wayne Sanders"
];

// Function to get a random fake name
export const getRandomName = () => {
  return FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
};

// Function to get a name with additional info
export const getCallerInfo = () => {
  const name = getRandomName();
  const nameParts = name.split(' ');
  
  return {
    full: name,
    first: nameParts[0],
    last: nameParts[1],
    phone: `(506) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`
  };
};