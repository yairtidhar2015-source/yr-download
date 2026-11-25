import type { Dictionary } from "./he";
const en: Dictionary = {
  common: { appName: "NOVA STORE", login: "Log in", register: "Create account", logout: "Log out", dashboard: "Dashboard", loading: "Loading…", save: "Save", cancel: "Cancel", email: "Email", password: "Password", fullName: "Full name", backHome: "Back to home", language: "Language", menu: "Menu" },
  nav: { features: "Features", how: "How it works", pricing: "Pricing", faq: "FAQ" },
  hero: { badge: "A new commerce platform", title: "Your store is live,", titleAccent: "in minutes.", subtitle: "NOVA STORE lets you launch online stores, design a professional storefront, manage products, orders and customers — and later run a dropshipping business — all in one place.", cta: "Create your store", secondary: "I have an account", trust: "No credit card · Multiple stores per account · Hebrew, English, Arabic & Spanish" },
  features: { title: "Everything you need to sell online", subtitle: "Professional tools, simple interface.", items: [
    { title: "Multiple stores", desc: "Run several brands from one account, each with its own address and design." },
    { title: "Visual store editor", desc: "Colors, fonts, banners and sections — with preview before publishing." },
    { title: "Product management", desc: "Variants, inventory, categories, multiple images and bulk actions." },
    { title: "Orders & customers", desc: "Status tracking, purchase history and protected customer data." },
    { title: "Dropshipping ready", desc: "Architecture for external suppliers, inventory sync and tracking numbers." },
    { title: "Built-in security", desc: "Row-level permissions, server-side authorization and protected secrets." },
  ] },
  how: { title: "How it works", steps: [
    { title: "Sign up", desc: "Register with email and verify your address." },
    { title: "Create a store", desc: "Pick a name, address, currency and design." },
    { title: "Start selling", desc: "Add products and share your store link." },
  ] },
  pricing: { title: "Simple pricing", subtitle: "Start free. Upgrade as you grow.", popular: "Most popular", devNote: "Paid plans are not active yet — all accounts currently run in development mode with no billing.", plans: [
    { name: "Starter", price: "$0", period: "/mo", desc: "To get started", features: ["1 store", "Unlimited products", "Mobile-ready storefront"], cta: "Start free" },
    { name: "Growth", price: "$22", period: "/mo", desc: "For growing businesses", features: ["Up to 3 stores", "Custom domain (soon)", "Advanced analytics", "Supplier connections"], cta: "Choose Growth" },
    { name: "Scale", price: "$69", period: "/mo", desc: "For teams and brands", features: ["Unlimited stores", "Staff accounts & roles", "Priority support"], cta: "Choose Scale" },
  ] },
  faq: { title: "Frequently asked questions", items: [
    { q: "Do I need to code?", a: "No. Settings, design and product management all happen in a visual interface." },
    { q: "Can I manage multiple stores?", a: "Yes. Each account can hold several stores, fully isolated from each other." },
    { q: "How do I get paid?", a: "Your store connects to providers like Stripe or PayPal using your own account with them. We never store card details." },
    { q: "Is there an AliExpress or CJdropshipping integration?", a: "The architecture is ready for it. A live connection requires an account and API keys with the supplier." },
  ] },
  footer: { tagline: "Commerce platform for independent businesses.", product: "Product", company: "Company", legal: "Legal", rights: "All rights reserved.", privacy: "Privacy", terms: "Terms", contact: "Contact", about: "About" },
  auth: { loginTitle: "Welcome back", loginSubtitle: "Log in to your NOVA STORE account", registerTitle: "Create your account", registerSubtitle: "Start building your store", forgot: "Forgot password?", forgotTitle: "Reset password", forgotSubtitle: "We'll email you a reset link", sendLink: "Send link", resetTitle: "New password", resetSubtitle: "Choose a new password for your account", newPassword: "New password", confirmPassword: "Confirm password", updatePassword: "Update password", noAccount: "Don't have an account?", haveAccount: "Already have an account?", checkEmailTitle: "Check your inbox", checkEmailBody: "We sent a verification link to your email. Click it to activate your account.", resetSent: "If that address is registered, a reset link is on its way.", passwordUpdated: "Password updated successfully.", acceptTerms: "By signing up you agree to the Terms and Privacy Policy." },
  errors: { invalidEmail: "Invalid email address", passwordShort: "Password must be at least 8 characters", passwordMismatch: "Passwords do not match", nameRequired: "Please enter your name", invalidCredentials: "Incorrect email or password", emailNotConfirmed: "Please verify your email before logging in", generic: "Something went wrong. Please try again.", rateLimited: "Too many attempts. Try again in a few minutes.", notConfigured: "Supabase is not configured yet. Add the environment variables to .env.local", linkInvalid: "This link is invalid or has expired." },
  dash: { welcome: "Hello", overview: "Overview", stores: "Stores", products: "Products", orders: "Orders", customers: "Customers", analytics: "Analytics", settings: "Settings", profile: "Profile", soon: "Soon", emptyStoresTitle: "You don't have any stores yet", emptyStoresBody: "Store creation arrives in the next development phase. Your account is ready.", accountReady: "Your account is active and verified.", noData: "No data yet — figures will appear here once real orders come in." },
  profile: { title: "My profile", subtitle: "Your account details", saved: "Profile saved", memberSince: "Member since", emailVerified: "Email verified", emailUnverified: "Email not verified", security: "Security", changePassword: "Change password" },
};
export default en;
