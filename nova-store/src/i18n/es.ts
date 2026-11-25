import type { Dictionary } from "./he";
const es: Dictionary = {
  common: { appName: "NOVA STORE", login: "Iniciar sesión", register: "Crear cuenta", logout: "Cerrar sesión", dashboard: "Panel", loading: "Cargando…", save: "Guardar", cancel: "Cancelar", email: "Correo electrónico", password: "Contraseña", fullName: "Nombre completo", backHome: "Volver al inicio", language: "Idioma", menu: "Menú" },
  nav: { features: "Funciones", how: "Cómo funciona", pricing: "Precios", faq: "Preguntas" },
  hero: { badge: "Una nueva plataforma de comercio", title: "Tu tienda en línea,", titleAccent: "en minutos.", subtitle: "NOVA STORE te permite lanzar tiendas online, diseñar un escaparate profesional, gestionar productos, pedidos y clientes — y más adelante operar un negocio de dropshipping — todo en un solo lugar.", cta: "Crea tu tienda", secondary: "Ya tengo cuenta", trust: "Sin tarjeta de crédito · Varias tiendas por cuenta · Hebreo, inglés, árabe y español" },
  features: { title: "Todo lo que necesitas para vender online", subtitle: "Herramientas profesionales, interfaz simple.", items: [
    { title: "Varias tiendas", desc: "Gestiona varias marcas desde una cuenta, cada una con su dirección y diseño." },
    { title: "Editor visual", desc: "Colores, fuentes, banners y secciones — con vista previa antes de publicar." },
    { title: "Gestión de productos", desc: "Variantes, inventario, categorías, varias imágenes y acciones masivas." },
    { title: "Pedidos y clientes", desc: "Seguimiento de estados, historial de compras y datos protegidos." },
    { title: "Listo para dropshipping", desc: "Arquitectura para proveedores externos, sincronización de stock y seguimiento." },
    { title: "Seguridad integrada", desc: "Permisos por fila, autorización en servidor y secretos protegidos." },
  ] },
  how: { title: "Cómo funciona", steps: [
    { title: "Regístrate", desc: "Crea tu cuenta con correo y verifica tu dirección." },
    { title: "Crea una tienda", desc: "Elige nombre, dirección, moneda y diseño." },
    { title: "Empieza a vender", desc: "Añade productos y comparte el enlace de tu tienda." },
  ] },
  pricing: { title: "Precios simples", subtitle: "Empieza gratis. Mejora cuando crezcas.", popular: "Más popular", devNote: "Los planes de pago aún no están activos — todas las cuentas funcionan en modo desarrollo sin cobros.", plans: [
    { name: "Starter", price: "$0", period: "/mes", desc: "Para empezar", features: ["1 tienda", "Productos ilimitados", "Escaparate adaptado a móvil"], cta: "Empezar gratis" },
    { name: "Growth", price: "$22", period: "/mes", desc: "Para negocios en crecimiento", features: ["Hasta 3 tiendas", "Dominio propio (pronto)", "Analítica avanzada", "Conexión con proveedores"], cta: "Elegir Growth" },
    { name: "Scale", price: "$69", period: "/mes", desc: "Para equipos y marcas", features: ["Tiendas ilimitadas", "Cuentas de empleados y roles", "Soporte prioritario"], cta: "Elegir Scale" },
  ] },
  faq: { title: "Preguntas frecuentes", items: [
    { q: "¿Necesito saber programar?", a: "No. La configuración, el diseño y los productos se gestionan desde una interfaz visual." },
    { q: "¿Puedo gestionar varias tiendas?", a: "Sí. Cada cuenta puede tener varias tiendas, totalmente aisladas entre sí." },
    { q: "¿Cómo recibo los pagos?", a: "Tu tienda se conecta a proveedores como Stripe o PayPal con tu propia cuenta. Nunca guardamos datos de tarjetas." },
    { q: "¿Hay integración con AliExpress o CJdropshipping?", a: "La arquitectura está preparada. Una conexión real requiere cuenta y claves API del proveedor." },
  ] },
  footer: { tagline: "Plataforma de comercio para negocios independientes.", product: "Producto", company: "Empresa", legal: "Legal", rights: "Todos los derechos reservados.", privacy: "Privacidad", terms: "Términos", contact: "Contacto", about: "Acerca de" },
  auth: { loginTitle: "Bienvenido de nuevo", loginSubtitle: "Inicia sesión en tu cuenta de NOVA STORE", registerTitle: "Crea tu cuenta", registerSubtitle: "Empieza a construir tu tienda", forgot: "¿Olvidaste tu contraseña?", forgotTitle: "Restablecer contraseña", forgotSubtitle: "Te enviaremos un enlace para restablecerla", sendLink: "Enviar enlace", resetTitle: "Nueva contraseña", resetSubtitle: "Elige una nueva contraseña para tu cuenta", newPassword: "Nueva contraseña", confirmPassword: "Confirmar contraseña", updatePassword: "Actualizar contraseña", noAccount: "¿No tienes cuenta?", haveAccount: "¿Ya tienes cuenta?", checkEmailTitle: "Revisa tu correo", checkEmailBody: "Te enviamos un enlace de verificación. Haz clic en él para activar tu cuenta.", resetSent: "Si esa dirección está registrada, recibirás un enlace.", passwordUpdated: "Contraseña actualizada correctamente.", acceptTerms: "Al registrarte aceptas los Términos y la Política de privacidad." },
  errors: { invalidEmail: "Correo no válido", passwordShort: "La contraseña debe tener al menos 8 caracteres", passwordMismatch: "Las contraseñas no coinciden", nameRequired: "Introduce tu nombre", invalidCredentials: "Correo o contraseña incorrectos", emailNotConfirmed: "Verifica tu correo antes de iniciar sesión", generic: "Algo salió mal. Inténtalo de nuevo.", rateLimited: "Demasiados intentos. Inténtalo en unos minutos.", notConfigured: "Supabase aún no está configurado. Añade las variables de entorno a .env.local", linkInvalid: "El enlace no es válido o ha caducado." },
  dash: { welcome: "Hola", overview: "Resumen", stores: "Tiendas", products: "Productos", orders: "Pedidos", customers: "Clientes", analytics: "Analítica", settings: "Ajustes", profile: "Perfil", soon: "Pronto", emptyStoresTitle: "Aún no tienes tiendas", emptyStoresBody: "La creación de tiendas llega en la próxima fase de desarrollo. Tu cuenta está lista.", accountReady: "Tu cuenta está activa y verificada.", noData: "Aún no hay datos — las cifras aparecerán cuando lleguen pedidos reales." },
  profile: { title: "Mi perfil", subtitle: "Datos de tu cuenta", saved: "Perfil guardado", memberSince: "Miembro desde", emailVerified: "Correo verificado", emailUnverified: "Correo no verificado", security: "Seguridad", changePassword: "Cambiar contraseña" },
};
export default es;
