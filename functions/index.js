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
  console.log(`[TRIGGER] Função onProductCreated disparada para o produto: ${event.params.productId}`);
  const product = event.data.data();
  if (!product) {
    console.error("[ERROR] Nenhum dado de produto encontrado no evento.");
    return null;
  }
  console.log(`[INFO] Processando push para: ${product.name}`);

  const payload = {
    notification: {
      title: "Novo Produto! 🆕",
      body: `${product.name} - ${product.category}\nPreço: R$ ${product.unitPrice}`,
    },
    webpush: {
      headers: {
        Urgency: "high",
      },
      notification: {
        title: "Novo Produto! 🆕",
        body: `${product.name} - ${product.category}\nPreço: R$ ${product.unitPrice}`,
        icon: "https://atacadoexpress.vercel.app/pwa-192x192.png",
        badge: "https://atacadoexpress.vercel.app/pwa-192x192.png",
        click_action: `https://atacado-express-boutique.web.app/product/${event.params.productId}`,
      },
    },
    data: {
      productId: event.params.productId,
      type: "NEW_PRODUCT",
    },
  };

  // Adiciona imagem apenas se existir e for válida
  const img = product.imageUrls?.length ? product.imageUrls[0] : product.imageUrl;
  if (img && img.startsWith('http')) {
    payload.notification.imageUrl = img;
    payload.webpush.notification.image = img;
  }

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
        console.error(`[FCM ERROR] Falha no token ${token.substring(0, 15)}...:`, err.code, err.message);
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
