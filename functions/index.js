const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Trigger: Novo Produto
 */
exports.onProductCreated = onDocumentCreated("products/{productId}", async (event) => {
  const product = event.data.data();
  if (!product) return null;

  const payload = {
    notification: {
      title: "🛍️ Novo produto disponível!",
      body: `${product.name} acaba de chegar! Confira agora as novidades.`,
      imageUrl: product.imageUrl || "",
    },
    webpush: {
      headers: {
        Urgency: "high",
      },
      notification: {
        title: "🛍️ Novo produto disponível!",
        body: `${product.name} acaba de chegar! Confira agora as novidades.`,
        icon: "https://atacado-express-boutique.web.app/icon.svg", // URL Absoluta é melhor para iOS
        image: product.imageUrl || "",
        badge: "https://atacado-express-boutique.web.app/icon.svg",
      },
      fcmOptions: {
        link: `https://atacado-express-boutique.web.app/product/${event.params.productId}`,
      },
    },
    data: {
      url: `/product/${event.params.productId}`,
      type: "new_product",
    },
  };

  return sendPushToAll(payload);
});

/**
 * Trigger: Novo Pedido
 */
exports.onOrderCreated = onDocumentCreated("orders/{orderId}", async (event) => {
  const order = event.data.data();
  if (!order) return null;

  const payload = {
    notification: {
      title: "💰 Nova Venda Realizada!",
      body: `Pedido #${event.params.orderId.substring(0, 5)} de R$ ${order.totalValue}`,
    },
    webpush: {
      headers: {
        Urgency: "high",
      },
      notification: {
        title: "💰 Nova Venda Realizada!",
        body: `Pedido #${event.params.orderId.substring(0, 5)} de R$ ${order.totalValue}`,
        icon: "https://atacado-express-boutique.web.app/icon.svg",
        badge: "https://atacado-express-boutique.web.app/icon.svg",
      },
      fcmOptions: {
        link: `https://atacado-express-boutique.web.app/orders/${event.params.orderId}`,
      },
    },
    data: {
      url: `/orders/${event.params.orderId}`,
      type: "new_order",
    },
  };

  return sendPushToAll(payload);
});

async function sendPushToAll(payload) {
  try {
    const tokensSnapshot = await admin.firestore().collection("users_push_tokens").get();
    if (tokensSnapshot.empty) return null;

    const tokens = tokensSnapshot.docs.map(doc => doc.id);
    const response = await admin.messaging().sendEachForMulticast({
      tokens: tokens,
      notification: payload.notification,
      data: payload.data,
    });

    console.log(`FCM: ${response.successCount} enviados, ${response.failureCount} falhas.`);
    return null;
  } catch (error) {
    console.error("Erro FCM:", error);
    return null;
  }
}
