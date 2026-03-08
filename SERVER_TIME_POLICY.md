# 🔒 Server Time Enforcement Policy

**IMPORTANT**: This application runs on **Supabase server time ONLY**. Local device time is completely blocked for security and consistency.

## Why Server Time Only?

1. **Security**: Prevents users from manipulating local clocks to bypass billing/trial limits
2. **Consistency**: All users see the same time regardless of timezone
3. **Audit Trail**: Server timestamps cannot be falsified
4. **Data Integrity**: Invoices, reports, and logs use immutable server timestamps

## User Requirements

Users **must** have:
- ✅ Correct system date/time (synced with NTP)
- ✅ Working internet connection to Supabase
- ❌ They CANNOT use local timezones - server timezone is UTC

### If System Clock Is Wrong

The app will:
1. Fail to connect (SSL certificate validation fails)
2. Show error message: "System Clock Check Failed"
3. Provide instructions to fix system time
4. **Automatically retry** with exponential backoff (1s, 2s, 4s, 8s, 16s...)

Users have ~2 minutes to fix their clock. Once fixed, the next retry will succeed.

## Developer Guide

### ✅ DO: Use Server Time Functions

```javascript
// Always use these functions:
import { 
  getServerNow,          // → number (milliseconds)
  getServerDateObject,   // → Date object
  getServerDate,         // → 'YYYY-MM-DD' string
  getServerTimestamp     // → ISO 8601 string
} from './hooks/useServerTime';

// Examples:
const nowMs = getServerNow();
const dateStr = getServerDate();
const isoTime = getServerTimestamp();
const dateObj = getServerDateObject();
```

### ❌ DON'T: Use Local Time

```javascript
// FORBIDDEN - these will throw errors:
Date.now()              // ❌ Blocked
new Date()              // ❌ Blocked  
new Date().getTime()    // ❌ Blocked
moment()                // ❌ Blocked
dayjs()                 // ❌ Blocked
```

### Helper Functions

Use these convenient wrappers in `utils/serverTimeEnforcement.js`:

```javascript
import { dbTimestamp, dbDate, currentTime, formatServerTime } from './utils/serverTimeEnforcement';

// Database operations
const entry = {
  created_at: dbTimestamp(),  // ISO string for database
  entry_date: dbDate(),       // 'YYYY-MM-DD' for date queries
};

// Display formatting
const display = formatServerTime(entry.created_at, 'MMM dd, yyyy');

// Simple current time check
const now = currentTime();  // Same as getServerNow()
```

### In Components

```javascript
// ✅ Correct way:
import { getServerDateObject } from '../hooks/useServerTime';

function useClock() {
  const [time, setTime] = useState(getServerDateObject());
  useEffect(() => {
    const id = setInterval(() => setTime(getServerDateObject()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ✅ In useQuery:
const { format } = require('date-fns');
const { getServerDate } = require('../hooks/useServerTime');

const today = getServerDate();  // 'YYYY-MM-DD'
const dateFilter = { from: today, to: today };

const { data: entries } = useQuery({
  queryKey: ['entries', dateFilter],
  queryFn: async () => {
    const { data } = await supabase
      .from('service_entries').select('*')
      .gte('entry_date', dateFilter.from)
      .lte('entry_date', dateFilter.to);
    return data || [];
  }
});
```

### Database Insertions

```javascript
// ✅ Always use getServerTimestamp() for created_at:
const { getServerTimestamp } = require('../hooks/useServerTime');

const newEntry = {
  service: 'Website',
  amount: 5000,
  created_at: getServerTimestamp(),  // ← Server time, not local
};

await supabase.from('service_entries').insert([newEntry]);
```

## Architecture

```
App.jsx
  └─ activateServerTimeEnforcement()  ← Blocks Date.now()
  └─ useServerTime hook  ← Initializes on mount
      ├─ Calls Supabase RPC get_server_time
      ├─ Calculates offset: serverTime - clientTime  
      ├─ Retries with exponential backoff if fails
      └─ Exports: getServerNow, getServerDate, etc.
```

## Files Using Server Time

- ✅ `src/layouts/UserLayout.jsx` - useClock hook
- ✅ `src/layouts/AdminLayout.jsx` - useClock hook
- ✅ `src/pages/user/Invoice.jsx` - Date filtering
- ✅ `src/pages/admin/AdminSettings.jsx` - Audit logging
- ✅ All Supabase mutations use getServerTimestamp()

## Debugging

If you see error: **"Server time not initialized"**

1. Check that `useServerTime()` hook was called at app root (`App.jsx`)
2. Verify Supabase RPC function `get_server_time` exists in database
3. Check browser console for SSL/network errors
4. Ensure user's system clock is correct

## Testing Server Time

```javascript
// In browser console:
import { getServerNow, getServerDateObject } from 'src/hooks/useServerTime';

console.log('Server time now:', getServerNow());
console.log('Server Date object:', getServerDateObject());
console.log('Formatted:', getServerDateObject().toISOString());
```

---

**Summary**: 🔒 **NO LOCAL TIME EVER** - Server time enforcement is active and will catch any violations.
