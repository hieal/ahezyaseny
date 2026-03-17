const BASE_ID = 'appLazNcMoUhS5on1';

const TABLE_CONFIGS = {
  candidates: ['משודכים/ות'],
  blacklist: ['רשימה שחורה'],
  admins: ['מנהלים'],
};

const FIELD_MAPPING: Record<string, string> = {
  'שם': 'full_name',
  'שם מלא': 'full_name',
  'name': 'full_name',
  'טלפון': 'phone',
  'מייל': 'email',
  'סטטוס': 'status',
};

const mapFields = (record: any) => {
  console.log('Record fields found:', Object.keys(record.fields));
  const mapped: any = {};
  
  // Handle name fallback logic
  const nameField = Object.keys(record.fields).find(f => ['name', 'שם', 'שם מלא'].includes(f));
  if (nameField) {
    mapped['full_name'] = record.fields[nameField];
  } else {
    const values = Object.values(record.fields);
    if (values.length > 0) {
      mapped['full_name'] = values[0];
    }
  }

  Object.keys(record.fields).forEach((field) => {
    if (['name', 'שם', 'שם מלא'].includes(field)) return; // Already handled
    const internalName = FIELD_MAPPING[field] || field;
    mapped[internalName] = record.fields[field];
  });
  return mapped;
};

const findTable = async (token: string, baseId: string, allowedNames: string[]) => {
  console.log(`Searching for table in ${allowedNames.join(', ')}`);
  try {
    const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable Meta API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const tables = data.tables || [];
    const tableNames = tables.map((t: any) => t.name);
    
    console.log('%c TABLES FOUND IN BASE: ', 'background: #222; color: #bada55', tableNames.join(', '));

    // Try to find exact match first
    let foundTable = tables.find((t: any) => allowedNames.includes(t.name));

    // Special logic for blacklist as requested
    if (!foundTable && allowedNames.includes('רשימה שחורה')) {
      console.log('Blacklist table not found by exact name, searching for alternatives...');
      foundTable = tables.find((t: any) => 
        t.name.toLowerCase().includes('black') || 
        t.name.includes('שחורה') || 
        t.name.includes('חסומים')
      );
      if (foundTable) {
        console.log(`Automatically matched blacklist to table: ${foundTable.name}`);
      }
    }

    // Fallback for candidates
    if (!foundTable && allowedNames.includes('משודכים/ות')) {
      foundTable = tables.find((t: any) => 
        t.name.includes('משודכים') || 
        t.name.includes('מועמדים') || 
        t.name.toLowerCase().includes('candidate')
      );
    }

    // Fallback for admins
    if (!foundTable && allowedNames.includes('מנהלים')) {
      foundTable = tables.find((t: any) => 
        t.name.includes('מנהלים') || 
        t.name.toLowerCase().includes('admin')
      );
    }

    if (foundTable) {
      console.log(`Found table: ${foundTable.name} (${foundTable.id})`);
      return foundTable.id;
    }

    // If still not found, return the first allowed name as a guess or throw
    console.warn(`Could not find a matching table for ${allowedNames.join(', ')}`);
    return allowedNames[0]; 
  } catch (err) {
    console.error('Error fetching Airtable metadata:', err);
    return allowedNames[0];
  }
};

export const syncCandidatesFromAirtable = async (token: string) => {
  console.log('%c CONNECTION ATTEMPTED ', 'background: #222; color: #bada55');
  console.log('Starting Candidates sync...');
  try {
    const tableId = await findTable(token, BASE_ID, TABLE_CONFIGS.candidates);
    console.log('Found table ID:', tableId);
    
    const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${tableId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const records = data.records || [];
    console.log('RAW AIRTABLE DATA:', records);
    return records.map(mapFields);
  } catch (err: any) {
    console.error('Error in Candidates sync:', err, 'Status:', err?.status || err?.response?.status || 'N/A');
    return [];
  }
};

export const syncBlacklistFromAirtable = async (token: string) => {
  console.log('%c CONNECTION ATTEMPTED ', 'background: #222; color: #bada55');
  console.log('Starting Blacklist sync...');
  try {
    const tableId = await findTable(token, BASE_ID, TABLE_CONFIGS.blacklist);
    console.log('Found table ID:', tableId);
    
    const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${tableId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const records = data.records || [];
    console.log('RAW AIRTABLE DATA:', records);
    return records.map(mapFields);
  } catch (err: any) {
    console.error('Error in Blacklist sync:', err, 'Status:', err?.status || err?.response?.status || 'N/A');
    return [];
  }
};

export const syncAdminsFromAirtable = async (token: string) => {
  console.log('%c CONNECTION ATTEMPTED ', 'background: #222; color: #bada55');
  console.log('Starting Admins sync...');
  try {
    const tableId = await findTable(token, BASE_ID, TABLE_CONFIGS.admins);
    console.log('Found table ID:', tableId);
    
    const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${tableId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const records = data.records || [];
    console.log('RAW AIRTABLE DATA:', records);
    return records.map(mapFields);
  } catch (err: any) {
    console.error('Error in Admins sync:', err, 'Status:', err?.status || err?.response?.status || 'N/A');
    return [];
  }
};
