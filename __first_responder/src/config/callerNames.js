// Database of caller names for incident reports
export const CALLER_NAMES = {
  // Common Canadian names
  firstNames: {
    male: [
      'James', 'Michael', 'Robert', 'David', 'William',
      'John', 'Christopher', 'Matthew', 'Daniel', 'Kevin',
      'Brian', 'Jason', 'Jeff', 'Ryan', 'Gary',
      'Nicholas', 'Eric', 'Stephen', 'Andrew', 'Paul',
      'Joshua', 'Kenneth', 'Steven', 'Edward', 'Joseph',
      'Liam', 'Noah', 'Lucas', 'Oliver', 'Ethan',
      'Jean-Pierre', 'François', 'Marc', 'André', 'Philippe'
    ],
    female: [
      'Mary', 'Jennifer', 'Linda', 'Patricia', 'Susan',
      'Jessica', 'Sarah', 'Karen', 'Nancy', 'Betty',
      'Dorothy', 'Lisa', 'Ashley', 'Kimberly', 'Emily',
      'Michelle', 'Amanda', 'Melissa', 'Deborah', 'Stephanie',
      'Rebecca', 'Laura', 'Helen', 'Sharon', 'Cynthia',
      'Emma', 'Olivia', 'Sophia', 'Charlotte', 'Amelia',
      'Marie-Claire', 'Isabelle', 'Céline', 'Sophie', 'Françoise'
    ]
  },
  
  lastNames: [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones',
    'Miller', 'Davis', 'Wilson', 'Moore', 'Taylor',
    'Anderson', 'Thomas', 'Jackson', 'White', 'Harris',
    'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson',
    'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker',
    'MacDonald', 'Campbell', 'MacLeod', 'MacKenzie', 'Fraser',
    'Tremblay', 'Gagnon', 'Roy', 'Côté', 'Bouchard',
    'Gauthier', 'Morin', 'Lavoie', 'Fortin', 'Gagné',
    'Singh', 'Patel', 'Kim', 'Chen', 'Liu',
    'Nguyen', 'Ali', 'Ahmed', 'Hassan', 'Kumar'
  ]
};

// Function to generate a random caller name
export const generateCallerName = () => {
  const isMale = Math.random() < 0.5;
  const firstNames = isMale ? CALLER_NAMES.firstNames.male : CALLER_NAMES.firstNames.female;
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = CALLER_NAMES.lastNames[Math.floor(Math.random() * CALLER_NAMES.lastNames.length)];
  
  return {
    full: `${firstName} ${lastName}`,
    first: firstName,
    last: lastName,
    gender: isMale ? 'male' : 'female'
  };
};

// Anonymous caller chance (10%)
export const isAnonymousCaller = () => Math.random() < 0.1;