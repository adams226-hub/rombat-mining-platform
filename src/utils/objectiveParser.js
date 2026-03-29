export const DIMENSIONS_LIST = [
  'Minerai', 'Forage', '0/4', '0/5', '0/6', '5/15', '8/15', '15/25', '4/6', '10/14', '6/10', '0/31,5'
];

export const parseDimensionObjective = (inputStr) => {
  if (!inputStr || typeof inputStr !== 'string') return null;

  const str = inputStr.trim();
  const lowerStr = str.toLowerCase();

  // Common units
  const units = ['tonne', 'tonnes', 't', 'm3', 'm³', 'kg'];
  let unit = 'tonne';
  let cleanStr = lowerStr;

  // Extract unit
  for (const u of units) {
    if (lowerStr.includes(u)) {
      unit = u === 'tonnes' ? 'tonne' : u.replace('³', '3');
      cleanStr = str.replace(new RegExp(u, 'i'), '').trim();
      break;
    }
  }

  // Split potential dimension and value
  const parts = cleanStr.split(/\s+/);
  let valueStr = '';
  let dimensionCandidate = '';

  // Find number (value)
  for (let i = 0; i < parts.length; i++) {
    const num = parseFloat(parts[i]);
    if (!isNaN(num)) {
      valueStr = parts[i];
      // Remaining parts might be dimension
      dimensionCandidate = parts.slice(0, i).join(' ').trim() || parts.slice(i + 1).join(' ').trim();
      break;
    }
  }

  if (!valueStr) {
    // No number found, try parsing first part as value
    const num = parseFloat(parts[0]);
    if (!isNaN(num)) {
      valueStr = parts[0];
      dimensionCandidate = parts.slice(1).join(' ').trim();
    }
  }

  const value = parseFloat(valueStr) || 0;

  // Match dimension
  if (dimensionCandidate) {
    const normalizedDim = dimensionCandidate.trim().replace(/[^\w\/-]/g, '').toLowerCase();
    const matchedDim = DIMENSIONS_LIST.find(dim => 
      dim.toLowerCase().replace(/[^\w\/-]/g, '') === normalizedDim
    );
    if (matchedDim) {
      return { dimension: matchedDim, value, unit };
    }
  }

  // Fallback to total objective
  return parseObjective(inputStr);
};

export const parseObjective = (inputStr) => {
  if (!inputStr || typeof inputStr !== 'string') return { value: 0, unit: 'tonne' };

  // Trim and normalize
  const str = inputStr.trim().toLowerCase();

  // Common units
  const units = ['tonne', 'tonnes', 't', 'm3', 'm³', 'kg'];
  let unit = 'tonne'; // default
  let valueStr = str;

  // Extract unit
  for (const u of units) {
    if (str.includes(u)) {
      unit = u === 'tonnes' ? 'tonne' : u.replace('³', '3');
      valueStr = str.replace(new RegExp(u, 'i'), '').trim();
      break;
    }
  }

  // Parse number
  const value = parseFloat(valueStr) || 0;

  return { value, unit };
};

export const formatObjective = ({ value, unit = 'tonne' }) => {
  const u = unit === 'tonne' ? 't' : unit;
  return `${value.toLocaleString()} ${u}`;
};

export const calculateProgress = (actual, objective) => {
  if (!objective?.value || objective.value === 0) return 0;
  return Math.min((actual / objective.value) * 100, 100);
};

export const calculateStock = (productionData, exitData) => {
  const stockByDimension = {};
  
  // Initialiser toutes les dimensions à 0
  DIMENSIONS_LIST.forEach(dim => {
    stockByDimension[dim] = { entries: 0, exits: 0, available: 0 };
  });
  
  // Agréger les entrées (production)
  productionData.forEach(entry => {
    entry.dimensions.forEach(dim => {
      if (stockByDimension[dim.dimension]) {
        stockByDimension[dim.dimension].entries += dim.quantity;
      }
    });
  });
  
  // Agréger les sorties
  exitData.forEach(exit => {
    exit.dimensions.forEach(dim => {
      if (stockByDimension[dim.dimension]) {
        stockByDimension[dim.dimension].exits += dim.quantity;
      }
    });
  });
  
  // Calculer stock disponible
  DIMENSIONS_LIST.forEach(dim => {
    const stock = stockByDimension[dim];
    stock.available = Math.max(0, stock.entries - stock.exits);
  });
  
  return DIMENSIONS_LIST.map(dim => ({ dimension: dim, ...stockByDimension[dim] }));
};
