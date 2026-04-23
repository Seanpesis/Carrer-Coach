import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const PLANS = {
  free: {
    name: "Free",
    resumeLimit: 1,
    applicationLimit: 3,
    messageLimit: 20,
  },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    resumeLimit: Infinity,
    applicationLimit: Infinity,
    messageLimit: 500,
  },
  team: {
    name: "Team",
    priceId: process.env.STRIPE_TEAM_PRICE_ID,
    resumeLimit: Infinity,
    applicationLimit: Infinity,
    messageLimit: Infinity,
    seats: 5,
  },
} as const;
