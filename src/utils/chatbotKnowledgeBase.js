// ─────────────────────────────────────────────────────────────────────────────
// CHATBOT KNOWLEDGE BASE - 30+ Years Industry Experience
// Comprehensive Q&A system for ONE NET CSC Management Platform
// ─────────────────────────────────────────────────────────────────────────────

export const KNOWLEDGE_BASE = [
  // ════════════════════════════════════════════════════════════════════════════
  // ENTRIES SECTION
  // ════════════════════════════════════════════════════════════════════════════
  {
    category: 'entries',
    questions: [
      'how do i add a new entry',
      'how to create service entry',
      'how do i create new entry',
      'how to add entry',
      'new service entry',
      'add entry',
      'what is entry',
    ],
    answer: `**Creating a Service Entry:**\n\n1. Go to **Dashboard** from the sidebar\n2. Click **New Entry** button\n3. Fill in the following:\n   • **Customer Name** - Full name of customer\n   • **Father's Name** - Parent/guardian name\n   • **Mobile Number** - 10-digit phone number\n   • **Service** - Select from your services list\n   • **Date of Service** - When service was provided\n   • **Cost Amount** - How much to charge\n   • **Custom Fields** - Any service-specific details\n4. Click **Save Entry**\n\nThe entry will appear in your Entries list and can be edited, deleted, or marked as paid anytime.`,
  },
  {
    category: 'entries',
    questions: [
      'how do i edit an entry',
      'how to change entry details',
      'edit entry',
      'modify entry',
      'update entry',
      'can i edit entry after creation',
    ],
    answer: `**Editing an Existing Entry:**\n\n1. Go to **All Entries** page\n2. Find the entry you want to edit\n3. Click the **Edit (pencil) icon** on the row\n4. Update any details you need to change\n5. Click **Save Changes**\n\n✅ You can edit entries anytime - even after marking as paid. Contact support if you need to undo a payment mark.`,
  },
  {
    category: 'entries',
    questions: [
      'how do i delete an entry',
      'how to remove entry',
      'delete entry',
      'remove entry',
      'can i delete entries',
    ],
    answer: `**Deleting an Entry:**\n\n1. Go to **All Entries** page\n2. Find the entry to delete\n3. Click the **Delete (trash) icon**\n4. Confirm the deletion in the popup\n\n⚠️ **Warning:** Deleted entries cannot be recovered. Make sure you really want to delete it!`,
  },
  {
    category: 'entries',
    questions: [
      'how do i search entries',
      'how to find entry',
      'search entry',
      'find entry',
      'search by name',
      'search by phone',
    ],
    answer: `**Searching Entries:**\n\n1. Go to **All Entries** page\n2. Use the **Search box** at the top\n3. Type to search by:\n   • **Customer name**\n   • **Phone number**\n   • **Service type**\n   • **Remarks/notes**\n4. Results update instantly as you type\n\n💡 **Tip:** Search is fast and case-insensitive. Just start typing the customer name!`,
  },
  {
    category: 'entries',
    questions: [
      'how do i filter entries',
      'how to use filters',
      'filter entries',
      'filter by date',
      'filter by service',
      'filter by status',
    ],
    answer: `**Filtering Entries:**\n\n1. Go to **All Entries** page\n2. Use the **Filter dropdowns** above the list:\n   • **Date Range** - Select start and end dates\n   • **Service** - Filter by service type\n   • **Work Status** - Pending / Completed\n   • **Payment Status** - Paid / Unpaid\n3. Filters apply instantly\n4. Click **Clear Filters** to reset\n\n💡 **Combine filters** for precise results (e.g., pending payments from last month).`,
  },
  {
    category: 'entries',
    questions: [
      'how do i mark work completed',
      'mark entry completed',
      'change work status',
      'mark as done',
      'complete work',
    ],
    answer: `**Marking Work as Completed:**\n\n1. Go to **All Entries** page\n2. Find the entry\n3. Click on the **Work Status badge** (shows "Pending" or "Completed")\n4. Select **Completed**\n5. Status updates immediately\n\n📌 **Note:** Marking work completed doesn't affect payment - they're separate actions.`,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PAYMENT SECTION
  // ════════════════════════════════════════════════════════════════════════════
  {
    category: 'payments',
    questions: [
      'how do i mark payment as paid',
      'mark entry paid',
      'how to collect payment',
      'mark as paid',
      'payment received',
    ],
    answer: `**Marking Payment as Paid:**\n\n1. Go to **Pending Payments** from sidebar\n2. Find the unpaid entry\n3. Click **Mark Paid** button\n4. Confirm the action\n5. Entry moves to paid section\n\n✅ The amount is immediately updated in your profile stats.`,
  },
  {
    category: 'payments',
    questions: [
      'how do i mark partial payment',
      'partial payment',
      'customer paid half',
      'paid some amount',
      'payment in installments',
    ],
    answer: `**Recording Partial Payment:**\n\n1. Go to **Pending Payments** page\n2. Find the entry\n3. Click **Partial** button\n4. Enter the **Amount Received** (e.g., 500 out of 1000)\n5. Click **Record Payment**\n6. Remaining due amount is updated automatically\n\n📝 You can record partial payments multiple times until fully paid.`,
  },
  {
    category: 'payments',
    questions: [
      'how do i send whatsapp reminder',
      'whatsapp payment reminder',
      'send reminder',
      'payment notification',
      'remind customer to pay',
    ],
    answer: `**Sending WhatsApp Payment Reminder:**\n\n1. Go to **Pending Payments** page\n2. Find the unpaid entry\n3. Click the **WhatsApp icon** button\n4. Message is sent instantly to customer with:\n   • Amount due\n   • Your business name\n   • UPI payment QR code (if you set UPI in Profile)\n5. Customer receives message on WhatsApp\n\n💡 **Tip:** Set your UPI ID in Profile for automated payment QR codes in messages.`,
  },
  {
    category: 'payments',
    questions: [
      'how do i see pending payments',
      'view unpaid entries',
      'pending dues',
      'outstanding amount',
      'how much do customers owe',
    ],
    answer: `**View Pending Payments:**\n\n1. Go to **Pending Payments** from sidebar\n2. See all unpaid entries with:\n   • Customer name\n   • Amount due\n   • How many days pending\n   • Service provided\n3. Sorted by amount (highest first)\n4. Total pending dues shown at top\n\n📊 You can also see pending dues in your **Dashboard** widget.`,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // INVOICES SECTION
  // ════════════════════════════════════════════════════════════════════════════
  {
    category: 'invoices',
    questions: [
      'how do i print invoice',
      'how to generate invoice',
      'print bill',
      'invoice',
      'bill',
      'receipt',
    ],
    answer: `**Printing Invoices/Bills:**\n\n1. Go to **Invoices** from sidebar\n2. **Check the boxes** next to entries you want to include\n3. Click **Print Invoice** button\n4. Select **Payment Mode** (Cash / UPI / Check / Other)\n5. Click **Generate** - opens print layout\n6. Click **Print** or select "Save as PDF"\n\n💡 Multiple entries = combined invoice. Bill number auto-increments.`,
  },
  {
    category: 'invoices',
    questions: [
      'how do i select entries for invoice',
      'select multiple entries',
      'add entries to invoice',
      'invoice not showing entry',
    ],
    answer: `**Selecting Entries for Invoice:**\n\n1. Go to **Invoices** page\n2. Use the **search/filter** to find entries\n3. Click the **checkbox** on the left of each entry you want\n4. Selected entries highlight in blue\n5. Click **Print Invoice**\n\n✅ Select entries from different days - they all appear on one invoice.`,
  },
  {
    category: 'invoices',
    questions: [
      'what is bill number',
      'bill number increment',
      'how does bill numbering work',
    ],
    answer: `**Bill Numbering:**\n\n• Bill numbers **auto-increment** automatically\n• First bill: #1, Second: #2, etc.\n• Cannot change or reset bill numbers\n• **Useful for tracking** - each invoice has unique number\n\n📌 Keep a record of printed invoices for accounting.`,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // CUSTOMERS SECTION
  // ════════════════════════════════════════════════════════════════════════════
  {
    category: 'customers',
    questions: [
      'how do i search customers',
      'customer search',
      'find customer',
      'search by phone',
      'search by name',
    ],
    answer: `**Searching Customers:**\n\n1. Go to **Customer Search** from sidebar\n2. Type customer **name or phone number**\n3. Results appear instantly showing:\n   • All visits/entries from this customer\n   • Total services provided\n   • Total amount paid\n   • Outstanding dues\n4. Click customer name to see full history\n\n💡 Search is fast - works across all your entries!`,
  },
  {
    category: 'customers',
    questions: [
      'how do i see customer history',
      'view customer profile',
      'customer details',
      'customer visits',
      'see all services for customer',
    ],
    answer: `**Viewing Customer History:**\n\n1. Go to **Customer Search**\n2. Find and click customer name\n3. See complete profile:\n   • All visits/services provided\n   • Dates of services\n   • Amounts paid vs pending\n   • Payment history\n   • Total lifetime value\n4. From here, send WhatsApp or view any entry\n\n📊 Great for understanding customer relationship and history.`,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // SERVICES SECTION
  // ════════════════════════════════════════════════════════════════════════════
  {
    category: 'services',
    questions: [
      'how do i add service',
      'how to create custom service',
      'add new service',
      'create service',
      'service management',
    ],
    answer: `**Adding Custom Services:**\n\n1. Go to **Services** from sidebar\n2. Click **Add New Service** button\n3. Enter service details:\n   • **Service Name** - e.g., "Aadhaar Enrollment"\n   • **Description** - What this service is\n   • **Base Price** - Default cost\n4. Click **Save Service**\n5. Service appears in dropdown when creating entries\n\n✅ Services are immediately available for new entries!`,
  },
  {
    category: 'services',
    questions: [
      'how do i add custom fields',
      'custom fields',
      'add fields to service',
      'service fields',
      'service customization',
    ],
    answer: `**Adding Custom Fields to Service:**\n\n1. Go to **Services** page\n2. Click **Edit** on a service\n3. Click **Add Custom Field**\n4. Choose field type:\n   • **Text** - Name, address, etc.\n   • **Number** - Quantity, ID, etc.\n   • **Date** - Dates\n   • **Dropdown** - Select from options\n5. Give field a name\n6. Click **Add**\n7. Save service\n\n💡 Custom fields appear when creating entries for that service!`,
  },
  {
    category: 'services',
    questions: [
      'how do i edit service',
      'modify service',
      'update service',
      'change service details',
    ],
    answer: `**Editing a Service:**\n\n1. Go to **Services** page\n2. Find the service\n3. Click **Edit** button\n4. Update name, description, or price\n5. Add/remove custom fields as needed\n6. Click **Save**\n\n✅ Changes apply to new entries. Old entries keep original details.`,
  },
  {
    category: 'services',
    questions: [
      'how do i toggle service status',
      'enable service',
      'disable service',
      'turn off service',
      'inactive service',
    ],
    answer: `**Toggling Service On/Off:**\n\n1. Go to **Services** page\n2. Find the service\n3. Click the **toggle switch** (or status button)\n4. Service turns **Green (Active)** or **Gray (Inactive)**\n\n✅ Active services show in entry form dropdown\n❌ Inactive services don't show - useful for seasonal services`,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PROFILE SECTION
  // ════════════════════════════════════════════════════════════════════════════
  {
    category: 'profile',
    questions: [
      'how do i update profile',
      'how to set profile',
      'edit profile',
      'profile settings',
      'set business name',
    ],
    answer: `**Updating Your Profile:**\n\n1. Go to **Profile** from sidebar\n2. Edit these details:\n   • **Business Name** - Your CSC center name\n   • **Email** - Contact email\n   • **Phone** - Your phone number\n   • **Address** - Business location\n   • **UPI ID** - For payment QR codes (important!)\n   • **Bank Details** - For reference\n3. Click **Save Profile**\n\n📌 **UPI ID is important** - enables payment QR in WhatsApp reminders!`,
  },
  {
    category: 'profile',
    questions: [
      'what is upi id',
      'where to set upi',
      'how to add upi',
      'upi payment qr',
      'upi id purpose',
    ],
    answer: `**UPI ID Setup:**\n\n**What is it?** Your unique payment identifier (e.g., yourname@okhdfcbank)\n\n**Why set it?**\n- WhatsApp payment reminders include your UPI QR code\n- Customers can pay instantly via UPI\n- Increases payment conversion\n\n**How to set:**\n1. Go to **Profile**\n2. Paste your UPI ID (ask your bank if unsure)\n3. Save\n\n✅ Once set, QR codes auto-generate in all WhatsApp messages!`,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION & BILLING SECTION
  // ════════════════════════════════════════════════════════════════════════════
  {
    category: 'subscription',
    questions: [
      'what is my current plan',
      'subscription plan',
      'what plan am i on',
      'my plan',
      'which plan',
    ],
    answer: `**Checking Your Plan:**\n\n1. Go to **Profile** page\n2. See your **Current Plan** section\n3. Shows:\n   • Plan name (Trial / Basic / Premium)\n   • Entries limit per month\n   • Days remaining before expiry\n   • Entries used this month\n\n📊 Also visible in Dashboard widget at top.`,
  },
  {
    category: 'subscription',
    questions: [
      'how do i renew subscription',
      'how to upgrade plan',
      'subscription expiring',
      'how to extend subscription',
      'renew plan',
    ],
    answer: `**Renewing Your Subscription:**\n\n1. When expiry is near, you'll see **Renew Now** button\n2. Contact support via:\n   • **WhatsApp:** See link in app\n   • **Email:** ourons7@gmail.com\n3. Tell them:\n   • Your registered phone/email\n   • Which plan you want (Trial → Basic → Premium)\n4. Admin provides payment details (UPI/Bank)\n5. Send payment proof\n6. Instant activation!\n\n💳 **Payment:** UPI recommended - shows confirmation instantly.`,
  },
  {
    category: 'subscription',
    questions: [
      'what are the plans',
      'plan comparison',
      'plans available',
      'trial vs basic vs premium',
      'plan limits',
    ],
    answer: `**Available Plans:**\n\n**📦 Trial Plan** (FREE)\n- ✅ 50 entries/month\n- 7 days validity\n- Basic features\n- Great for testing\n\n**🎯 Basic Plan**\n- ✅ 200 entries/month\n- 30 days validity\n- All core features\n- WhatsApp reminders\n- Invoice printing\n\n**⭐ Premium Plan**\n- ✅ Unlimited entries/month\n- 30 days validity (auto-renew option)\n- All features including admin access\n- Priority support\n\n💡 All plans include custom services, customer search, and reports!`,
  },
  {
    category: 'subscription',
    questions: [
      'how do i know my entries limit',
      'entries per month',
      'used entries',
      'remaining entries',
      'entry limit exceeded',
    ],
    answer: `**Understanding Entry Limits:**\n\n1. Each plan has monthly entry limit:\n   • **Trial:** 50 entries\n   • **Basic:** 200 entries\n   • **Premium:** Unlimited\n\n2. See your usage in **Dashboard**:\n   • Current entries used\n   • Days remaining\n   • Limits reset on renewal date\n\n3. If you hit limit:\n   • ⛔ Cannot create new entries\n   • 💡 Upgrade to higher plan\n   • Already created entries remain accessible\n\n📌 Limit is **per calendar month**, not rolling 30 days.`,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // DASHBOARD & REPORTS SECTION
  // ════════════════════════════════════════════════════════════════════════════
  {
    category: 'dashboard',
    questions: [
      'what is dashboard',
      'dashboard overview',
      'dashboard stats',
      'home page',
    ],
    answer: `**Dashboard Overview:**\n\nYour **Dashboard** shows at-a-glance stats:\n\n📊 **Key Widgets:**\n- **Total Entries** - All services you've created\n- **This Month** - Entries created this calendar month\n- **Pending Dues** - Total unpaid amount\n- **Payment Status** - How much collected vs pending\n- **Recent Entries** - Last 10 entries\n\n🔗 **Quick Links:**\n- New Entry\n- View All Entries\n- Pending Payments\n- Customer Search\n\n💡 Everything you need in one view!`,
  },
  {
    category: 'dashboard',
    questions: [
      'how do i use reports',
      'reports section',
      'export data',
      'analytics',
      'business reports',
    ],
    answer: `**Using Reports & Analytics:**\n\n1. Go to **Reports** from sidebar\n2. View detailed analytics:\n   • **Revenue Generated** - Total earned this month\n   • **Services Breakdown** - Which services are popular\n   • **Customer Stats** - Top customers\n   • **Payment Trends** - When payments come in\n   • **Pending Analysis** - Overdue payments\n\n3. **Export Options:**\n   • Download as CSV\n   • Print reports\n   • Date range selection\n\n📈 Use reports to understand business patterns!`,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // COMMON QUESTIONS & TROUBLESHOOTING
  // ════════════════════════════════════════════════════════════════════════════
  {
    category: 'help',
    questions: [
      'how do i contact support',
      'support contact',
      'help support',
      'contact us',
      'need help',
    ],
    answer: `**Contacting Support:**\n\n**WhatsApp:**\n- Fast response\n- Best for urgent issues\n- Link in app footer\n\n**Email:**\n- ourons7@gmail.com\n- Detailed explanations\n- For billing issues\n\n**Response Time:**\n- WhatsApp: Usually within 2 hours\n- Email: Within 24 hours\n\n💡 Have screenshots ready when reporting issues!`,
  },
  {
    category: 'help',
    questions: [
      'forgot password',
      'reset password',
      'cannot login',
      'locked account',
    ],
    answer: `**Resetting Your Password:**\n\n1. Go to **Forgot Password** on login page\n2. Enter your **email address**\n3. Click **Send Reset Link**\n4. Check your email (including spam folder)\n5. Click the reset link\n6. Enter new **password**\n7. Click **Reset**\n8. Login with new password\n\n⏱️ Link expires in 24 hours. Request a new one if needed.`,
  },
  {
    category: 'help',
    questions: [
      'how do i logout',
      'sign out',
      'logout',
      'exit account',
    ],
    answer: `**Logging Out:**\n\n1. Click on your **profile icon** (top right)\n2. Select **Logout** from menu\n3. You're logged out\n4. Click **Login** to sign back in\n\n✅ Your data is always safe and accessible.`,
  },
  {
    category: 'help',
    questions: [
      'is my data safe',
      'data security',
      'privacy',
      'data backup',
      'data encryption',
    ],
    answer: `**Data Security & Safety:**\n\n🔒 Your data is protected:\n- **Encrypted** in transit and at rest\n- **Backed up** automatically every day\n- **Private** - only you can access your data\n- Uses **enterprise-grade** security (Supabase)\n- No sharing with third parties\n\n✅ We treat your business data with utmost care!\n\nFor detailed security info, contact: ourons7@gmail.com`,
  },
  {
    category: 'help',
    questions: [
      'what devices can i use',
      'mobile app',
      'desktop access',
      'tablet support',
      'browser compatibility',
    ],
    answer: `**Device Compatibility:**\n\n✅ **Works on:**\n- Desktop/Laptop (Chrome, Firefox, Safari, Edge)\n- Tablets (iPad, Android tablets)\n- Mobile phones (iPhone, Android)\n- Any modern web browser\n\n💡 **Tip:** Mobile-optimized for on-the-go usage. No app download needed - works in browser!`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// STRING SIMILARITY MATCHING ALGORITHM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate similarity between two strings (0 to 1)
 * Uses Levenshtein distance algorithm with strict matching
 */
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // For very short queries, require high similarity or exact word match
  if (s1.length < 4) {
    // Check if all words in shorter string appear in longer
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    
    const match = words1.every(w1 => 
      words2.some(w2 => w2.includes(w1) && w1.length > 1)
    );
    
    if (!match) return 0;
  }

  // Exact match
  if (s1 === s2) return 1;

  // One contains the other (but both must be meaningful length)
  if (s1.length > 3 && s2.length > 3) {
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  }

  // Levenshtein distance
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate edit distance between two strings
 */
function getEditDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// FIND BEST MATCHING ANSWER
// ─────────────────────────────────────────────────────────────────────────────

export function findAnswer(userQuery) {
  if (!userQuery || userQuery.trim().length === 0) {
    return {
      answer: `I'm here to help! Try asking questions like:\n\n• "How do I add a new entry?"\n• "How to mark payment as paid?"\n• "How do I print invoice?"\n• "What is my current plan?"\n• "How do I contact support?"`,
      matched: false,
      confidence: 0,
    };
  }

  // Handle short greetings
  const query = userQuery.trim().toLowerCase();
  if (['hi', 'hello', 'hey', 'hii', 'helloo', 'howdy'].includes(query)) {
    return {
      answer: `👋 Hey there! I'm your ONE NET Assistant. I can help you with:\n\n✅ Creating & managing entries\n✅ Payment tracking & reminders\n✅ Printing invoices\n✅ Customer search & history\n✅ Custom services setup\n✅ Profile & subscription info\n✅ General support & troubleshooting\n\nJust ask me anything about using ONE NET! 😊`,
      matched: true,
      confidence: 100,
    };
  }

  let bestMatch = null;
  let bestConfidence = 0;

  // Find best matching answer
  for (const item of KNOWLEDGE_BASE) {
    for (const question of item.questions) {
      const similarity = calculateSimilarity(userQuery, question);

      if (similarity > bestConfidence) {
        bestConfidence = similarity;
        bestMatch = item;
      }
    }
  }

  // Higher threshold for matching (75% similarity)
  const threshold = 0.75;

  if (bestMatch && bestConfidence >= threshold) {
    return {
      answer: bestMatch.answer,
      matched: true,
      confidence: Math.round(bestConfidence * 100),
      category: bestMatch.category,
    };
  }

  // No good match found - suggest related questions
  return {
    answer: `I didn't quite understand that. Here are topics I can help with:\n\n**Service Entries** - Adding, editing, deleting entries\n**Payments** - Marking paid, sending reminders\n**Invoices** - Printing bills and receipts\n**Services** - Managing custom services & fields\n**Profile** - Setting up business details\n**Subscriptions** - Plans, renewal, limits\n**Customers** - Search and history\n**Support** - Contact and troubleshooting\n\nTry asking specific questions about any of these!`,
    matched: false,
    confidence: 0,
  };
}

export default KNOWLEDGE_BASE;
