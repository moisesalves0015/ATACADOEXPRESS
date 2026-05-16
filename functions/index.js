const { onDocumentCreated, onRequest } = require("firebase-functions/v2/firestore");
const { onRequest: onRequestV2 } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * DEBUG: Disparo Manual via HTTP
 * Permite testar um token específico e ver o erro em tempo real.
 */
exports.debugSendPush = onRequestV2({ cors: true }, async (req, res) => {
  const { token, title, body, platform } = req.body;

  if (!token) {
    return res.status(400).send({ error: "Token é obrigatório" });
  }

  const payload = {
    notification: {
      title: title || "🚨 Teste de Debug",
      body: body || "Se você está vendo isso, o canal de comunicação está aberto.",
    },
    webpush: {
      headers: { Urgency: "high" },
      notification: {
        title: title || "🚨 Teste de Debug",
        body: body || "Se você está vendo isso, o canal de comunicação está aberto.",
        icon: "https://atacado-express-boutique.web.app/icon.svg",
        badge: "https://atacado-express-boutique.web.app/icon.svg",
      },
      fcmOptions: {
        link: "https://atacado-express-boutique.web.app/admin/push-diagnostics",
      },
    },
    token: token
  };

  try {
    const response = await admin.messaging().send(payload);
    console.log("Debug FCM Sucesso:", response);
    return res.send({ success: true, response });
  } catch (error) {
    console.error("Debug FCM Erro:", error);
    return res.status(500).send({ 
      success: false, 
      error: error.code, 
      message: error.message,
      stack: error.stack 
    });
  }
});

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
    if (tokensSnapshot.empty) {
      console.log("Nenhum token encontrado no banco.");
      return null;
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.id);
    console.log(`Iniciando envio para ${tokens.length} dispositivos...`);

    const results = await Promise.all(tokens.map(async (token) => {
      try {
        const message = {
          token: token,
          notification: payload.notification,
          data: payload.data,
          webpush: payload.webpush,
        };
        const res = await admin.messaging().send(message);
        return { success: true, token: token.substring(0, 10), res };
      } catch (err) {
        return { success: false, token: token.substring(0, 10), error: err.code };
      }
    }));

    const successes = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success).length;
    console.log(`Resultado Final: ${successes} sucessos, ${failures} falhas.`);
    
    return null;
  } catch (error) {
    console.error("Erro crítico no sendPushToAll:", error);
    return null;
  }
}
