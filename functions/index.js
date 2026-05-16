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
      image: product.imageUrl || "",
    },
    data: {
      url: `/product/${event.params.productId}`,
      type: "new_product"
    }
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
    data: {
      url: `/orders/${event.params.orderId}`,
      type: "new_order"
    }
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
