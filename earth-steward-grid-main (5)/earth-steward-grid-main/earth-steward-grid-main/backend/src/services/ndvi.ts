import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_KEY.startsWith('sk-or') ? 'https://openrouter.ai/api/v1' : undefined
    })
  : null;

export interface NDVIResult {
  ndvi_score: number;
  greenery_increase_percent: number;
}

export interface CreditsCalculation {
  credits_to_add: number;
  calculation_rationale: string;
}

// Mock NDVI data when satellite API is not configured
function mockNDVIData(landId: string, currentScore: number): NDVIResult {
  const increase = Math.random() * 0.05; // 0 to 5% NDVI increase each week
  return {
    ndvi_score: Math.min(1, currentScore + increase),
    greenery_increase_percent: increase * 100,
  };
}

export async function getNDVIScore(
  landId: string,
  polygonCoordinates: any,
  currentNDVI: number
): Promise<NDVIResult> {
  if (!process.env.SATELLITE_API_KEY) {
    return mockNDVIData(landId, currentNDVI);
  }
  // Real satellite API call would go here
  const response = await fetch(
    `https://api.satellite-provider.com/ndvi?key=${process.env.SATELLITE_API_KEY}&polygon=${JSON.stringify(polygonCoordinates)}`
  );
  const data = await response.json() as any;
  return {
    ndvi_score: data.ndvi,
    greenery_increase_percent: ((data.ndvi - currentNDVI) / currentNDVI) * 100,
  };
}

export async function calculateCreditsFromNDVI(
  areaHectares: number,
  ndviBefore: number,
  ndviAfter: number,
  landType: string
): Promise<CreditsCalculation> {
  if (!openai) {
    // Fallback calculation when OpenAI is not configured
    const ndviIncrease = ndviAfter - ndviBefore;
    const baseCreditsPerHectare = landType === 'forest' ? 50 : landType === 'wetland' ? 70 : 30;
    const credits_to_add = Math.max(0, Math.floor(areaHectares * baseCreditsPerHectare * ndviIncrease * 10));
    return {
      credits_to_add,
      calculation_rationale: `Calculated using base rate of ${baseCreditsPerHectare} credits/ha for ${landType} land, NDVI increase of ${(ndviIncrease * 100).toFixed(2)}%`,
    };
  }

  const prompt = `Land area: ${areaHectares} hectares, land type: ${landType}, NDVI before: ${ndviBefore.toFixed(4)}, NDVI after: ${ndviAfter.toFixed(4)}.
Using IPCC Tier 2 methodology and Indian carbon market standards, calculate the carbon credits generated from the NDVI increase.
Respond with JSON only: { "credits_to_add": <integer>, "calculation_rationale": "<string explanation>" }`;

  try {
    const AI_MODEL = process.env.OPENAI_API_KEY?.startsWith('sk-or') ? 'openai/gpt-4o-mini' : 'gpt-4o';
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return {
      credits_to_add: Math.max(0, parseInt(result.credits_to_add) || 0),
      calculation_rationale: result.calculation_rationale || 'Calculated by AI',
    };
  } catch (err: any) {
    console.error('OpenAI/OpenRouter NDVI Calculation Error:', err.message || err);
    // Fallback to manual calc if AI goes down
    const ndviIncrease = ndviAfter - ndviBefore;
    const baseCreditsPerHectare = landType === 'forest' ? 50 : landType === 'wetland' ? 70 : 30;
    const fallbackCredits = Math.max(0, Math.floor(areaHectares * baseCreditsPerHectare * ndviIncrease * 10));
    return {
      credits_to_add: fallbackCredits,
      calculation_rationale: `Fallback Calculation: base rate ${baseCreditsPerHectare} credits/ha for ${landType}, NDVI increase ${(ndviIncrease * 100).toFixed(2)}%`,
    };
  }
}

export async function getChatbotResponse(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  liveCreditsAvailable: number
): Promise<string> {
  const lastMsg = messages[messages.length - 1]?.content?.toLowerCase().trim() || '';

  // ── Rule-based knowledge base with weighted phrases ──────────────────────────
  // Each phrase has a weight: multi-word phrases = 3, single words = 1
  // The rule with the highest total score wins (best-match, not first-match)
  interface Rule {
    phrases: Array<{ text: string; weight: number }>;
    // Optional: if any of these words exist in msg, SKIP this rule (avoid false matches)
    excludeIf?: string[];
    answer: string;
  }

  const rules: Rule[] = [
    {
      phrases: [
        { text: 'track', weight: 3 },
        { text: 'tracking', weight: 3 },
        { text: 'track request', weight: 5 },
        { text: 'track my', weight: 4 },
        { text: 'request status', weight: 5 },
        { text: 'follow up', weight: 4 },
        { text: 'check request', weight: 5 },
        { text: 'check status', weight: 5 },
        { text: 'pending', weight: 2 },
        { text: 'under review', weight: 4 },
        { text: 'approved', weight: 2 },
        { text: 'rejected', weight: 2 },
      ],
      answer: `You can track all your purchase requests under the **"Transactions"** tab in your company dashboard.\n\nEach request shows its current status:\n• **Pending** – submitted, awaiting officer review\n• **Under Review** – officer is examining your request\n• **Approved** – payment link will be sent to you\n• **Rejected** – reason will be shown; you can resubmit\n\nYou also receive **email notifications** at every status change.`
    },
    {
      phrases: [
        { text: 'how to purchase', weight: 5 },
        { text: 'how to buy', weight: 5 },
        { text: 'how do i buy', weight: 5 },
        { text: 'how do i purchase', weight: 5 },
        { text: 'steps to buy', weight: 5 },
        { text: 'steps to purchase', weight: 5 },
        { text: 'from marketplace', weight: 5 },
        { text: 'buy credits', weight: 4 },
        { text: 'purchase credits', weight: 4 },
        { text: 'acquire credits', weight: 4 },
        { text: 'get credits', weight: 4 },
        { text: 'purchase', weight: 1 },
        { text: 'buy', weight: 1 },
      ],
      excludeIf: ['track', 'status', 'document', 'price', 'cost', 'pay', 'payment', 'certificate'],
      answer: `To purchase carbon credits:\n1. Go to **Marketplace** in your company dashboard.\n2. Browse verified land parcels by state, land type, or price.\n3. Click **"Request Purchase"** on any listing.\n4. Fill in quantity and upload your authorization letter (PDF).\n5. A government officer reviews & approves your request.\n6. Upon approval, complete payment via Razorpay.\n7. You receive an official PDF certificate + blockchain NFT.`
    },
    {
      phrases: [
        { text: 'price', weight: 2 },
        { text: 'cost', weight: 2 },
        { text: 'pricing', weight: 3 },
        { text: 'how much', weight: 3 },
        { text: 'per credit', weight: 4 },
        { text: 'credit cost', weight: 4 },
        { text: 'rate per', weight: 4 },
        { text: 'price per', weight: 4 },
        { text: 'what is the price', weight: 5 },
        { text: 'current price', weight: 5 },
      ],
      excludeIf: ['pay', 'payment', 'razorpay', 'invoice'],
      answer: `Carbon credit prices on this platform range from **₹500 to ₹1,100 per credit**, depending on:\n• **Land type** – Forest, Wetland, Agricultural, Grassland\n• **NDVI score** – satellite-verified carbon sequestration quality\n• **State** – location of the land parcel\n\nFinal pricing is confirmed after a government officer reviews your purchase request.`
    },
    {
      phrases: [
        { text: 'document', weight: 3 },
        { text: 'documents', weight: 3 },
        { text: 'required document', weight: 5 },
        { text: 'what documents', weight: 5 },
        { text: 'what do i need', weight: 5 },
        { text: 'paperwork', weight: 4 },
        { text: 'authorization letter', weight: 5 },
        { text: 'upload', weight: 2 },
        { text: 'cin', weight: 3 },
        { text: 'submit', weight: 2 },
      ],
      answer: `Required documents for a purchase request:\n• **CIN (Company Identification Number)** – mandatory for registration\n• **Board Resolution / Authorization Letter** (PDF) – authorizing the purchase\n• **Intended Use Declaration** – stating the purpose of the offset\n\nBulk purchases over **1,000 credits** may require additional compliance documents. All documents must be in PDF format and clearly legible.`
    },
    {
      phrases: [
        { text: 'certificate valid', weight: 5 },
        { text: 'how long is', weight: 4 },
        { text: 'certificate last', weight: 5 },
        { text: 'expire', weight: 3 },
        { text: 'expiry', weight: 3 },
        { text: 'expiration', weight: 3 },
        { text: 'validity', weight: 3 },
        { text: 'valid for', weight: 4 },
        { text: 'renew', weight: 3 },
        { text: 'duration', weight: 2 },
      ],
      excludeIf: ['certificate tab', 'download', 'nft', 'blockchain'],
      answer: `Carbon credit certificates are valid for the **duration selected at purchase**:\n• 1 year\n• 3 years\n• 5 years\n• 10 years\n\nCertificates can be **renewed up to 30 days before expiry**, subject to credit availability. Expired certificates are automatically flagged in the system and shown in your Certificates tab.`
    },
    {
      phrases: [
        { text: 'certificate', weight: 2 },
        { text: 'nft', weight: 3 },
        { text: 'blockchain', weight: 3 },
        { text: 'download pdf', weight: 5 },
        { text: 'get certificate', weight: 5 },
        { text: 'my certificate', weight: 5 },
        { text: 'view certificate', weight: 5 },
        { text: 'proof of', weight: 4 },
        { text: 'on-chain', weight: 4 },
        { text: 'immutable', weight: 4 },
        { text: 'qr code', weight: 4 },
      ],
      excludeIf: ['valid', 'expire', 'how long', 'renew'],
      answer: `Upon approval and payment, you receive:\n• A **downloadable PDF certificate** with a QR code and government seal\n• An **NFT certificate** minted on the Ethereum Sepolia blockchain for immutable proof\n• An **on-chain ledger entry** to prevent double-counting\n\nYou can view and download all your certificates from the **"Certificates"** tab in your dashboard.`
    },
    {
      phrases: [
        { text: 'payment', weight: 3 },
        { text: 'pay', weight: 2 },
        { text: 'razorpay', weight: 4 },
        { text: 'upi', weight: 4 },
        { text: 'invoice', weight: 4 },
        { text: 'how to pay', weight: 5 },
        { text: 'net banking', weight: 4 },
        { text: 'debit card', weight: 4 },
        { text: 'credit card', weight: 4 },
      ],
      answer: `Payment is processed through **Razorpay** — India's leading payment gateway.\n\nAfter your request is approved, you'll receive a payment link. Accepted methods:\n• UPI (GPay, PhonePe, Paytm)\n• Net Banking\n• Debit / Credit Card\n• Digital Wallet\n\nCredits are activated **immediately after successful payment**.`
    },
    {
      phrases: [
        { text: 'retire', weight: 3 },
        { text: 'retirement', weight: 3 },
        { text: 'how to retire', weight: 5 },
        { text: 'offset my', weight: 5 },
        { text: 'use my credits', weight: 5 },
        { text: 'carbon offset', weight: 4 },
        { text: 'retire credits', weight: 5 },
      ],
      answer: `To retire credits (permanently offset your emissions):\n1. Go to your **Dashboard** → click **"Retire Credits"**\n2. Enter the number of credits to retire\n3. Credits are permanently deducted and an **immutable blockchain retirement record** is created\n4. You receive a **retirement certificate** as official proof of offset\n\nRetired credits **cannot be restored** — this action is irreversible.`
    },
    {
      phrases: [
        { text: 'transfer', weight: 3 },
        { text: 'sell credits', weight: 5 },
        { text: 'resell', weight: 4 },
        { text: 'transfer credit', weight: 5 },
        { text: 'can i sell', weight: 5 },
        { text: 'can i transfer', weight: 5 },
        { text: 'give credits to', weight: 5 },
      ],
      answer: `Carbon credits on this platform are currently **non-transferable**.\n\nThey are issued exclusively to the purchasing company and **cannot be resold, transferred, or shared** with any other entity.\n\nCredits can only be:\n• **Held** – until expiry date\n• **Retired** – used to officially offset your carbon footprint`
    },
    {
      phrases: [
        { text: 'how many credits', weight: 5 },
        { text: 'total credits', weight: 4 },
        { text: 'credits available', weight: 5 },
        { text: 'national credits', weight: 5 },
        { text: 'available nationally', weight: 5 },
        { text: 'how many available', weight: 5 },
        { text: 'stock', weight: 2 },
      ],
      answer: `There are currently **${liveCreditsAvailable.toLocaleString()} carbon credits** available nationally across all verified land parcels.\n\nThis figure updates in real time as:\n• Companies purchase credits\n• Government officers add new verified land parcels\n• Credits expire or are retired`
    },
    {
      phrases: [
        { text: 'register', weight: 3 },
        { text: 'signup', weight: 3 },
        { text: 'sign up', weight: 3 },
        { text: 'create account', weight: 5 },
        { text: 'new company', weight: 4 },
        { text: 'how to register', weight: 5 },
        { text: 'how to join', weight: 5 },
        { text: 'onboard', weight: 3 },
      ],
      answer: `To register your company:\n1. Click **"Login as Company"** on the homepage\n2. Click **"Register here"** on the login page\n3. Fill in your company name, CIN, and contact details\n4. Submit for government verification (typically 1–2 business days)\n5. Once verified, log in and access the full marketplace\n\nYour **CIN (Company Identification Number)** is mandatory for registration.`
    },
    {
      phrases: [
        { text: 'forest', weight: 3 },
        { text: 'wetland', weight: 3 },
        { text: 'agricultural', weight: 3 },
        { text: 'grassland', weight: 3 },
        { text: 'land type', weight: 4 },
        { text: 'type of land', weight: 4 },
        { text: 'land parcel', weight: 4 },
        { text: 'ndvi', weight: 4 },
      ],
      answer: `The platform lists four types of verified land parcels:\n\n• 🌳 **Forest** – Highest carbon sequestration; dense tree cover with quarterly NDVI scoring\n• 🌾 **Agricultural** – Sustainable farming & agroforestry projects\n• 🌿 **Wetland** – Rich biodiversity, high CO₂ & methane absorption\n• 🌱 **Grassland** – Carbon sink restoration and conservation\n\nAll parcels are verified using **NDVI satellite imagery** and **IPCC Tier 2 methodology**.`
    },
    {
      phrases: [
        { text: 'contact', weight: 3 },
        { text: 'helpline', weight: 4 },
        { text: 'phone number', weight: 4 },
        { text: 'email address', weight: 4 },
        { text: 'support', weight: 2 },
        { text: 'reach you', weight: 4 },
        { text: 'talk to officer', weight: 5 },
        { text: 'speak to', weight: 4 },
        { text: 'contact authority', weight: 5 },
      ],
      answer: `**Carbon Credit Authority — Contact Details:**\n\n📞 **Helpline:** 1800-123-4567 (Mon–Fri, 9AM–6PM IST)\n📧 **Email:** carbon.credits@gov.in\n🏛️ **Office:** Ministry of Environment, Forest and Climate Change, New Delhi\n\nFor urgent matters, email with your company CIN and request ID for faster resolution.`
    },
    {
      phrases: [
        { text: 'hello', weight: 3 },
        { text: 'hi', weight: 2 },
        { text: 'hey', weight: 2 },
        { text: 'namaste', weight: 3 },
        { text: 'good morning', weight: 3 },
        { text: 'good afternoon', weight: 3 },
        { text: 'good evening', weight: 3 },
        { text: 'how are you', weight: 3 },
        { text: 'what can you do', weight: 4 },
        { text: 'what can you help', weight: 4 },
      ],
      answer: `Hello! 👋 I'm the **Carbon Credit Helpdesk Assistant**.\n\nI can help you with:\n• 💰 **Pricing** – cost per carbon credit\n• 🛒 **How to purchase** credits from the marketplace\n• 📄 **Documents** required for a purchase request\n• 📜 **Certificate validity** and renewal\n• 📊 **Tracking** your purchase requests\n• ♻️ **Retiring** credits to offset emissions\n• 💳 **Payment** process\n\nWhat would you like to know?`
    },
  ];

  // ── Best-match scoring ───────────────────────────────────────────────────────
  let bestScore = 0;
  let bestAnswer = '';

  for (const rule of rules) {
    // If message contains an exclusion word, skip this rule
    if (rule.excludeIf?.some(ex => lastMsg.includes(ex))) continue;

    // Sum weights of all matched phrases
    let score = 0;
    for (const phrase of rule.phrases) {
      if (lastMsg.includes(phrase.text)) {
        score += phrase.weight;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestAnswer = rule.answer;
    }
  }

  if (bestScore > 0) return bestAnswer;

  // Default fallback
  return `I'm not sure I understand your question. Could you rephrase it?\n\nYou can ask me about:\n• **Pricing** – cost per carbon credit\n• **How to purchase** credits from the marketplace\n• **Documents** required for a purchase request\n• **Certificate validity** and renewal\n• **Tracking** your purchase requests\n• **Payment** options\n• **Retiring** credits to offset emissions\n\nOr contact us directly at **carbon.credits@gov.in** / **1800-123-4567**.`;
}




