const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Trigger: Sempre que um novo produto é criado no Firestore (V2).
 */
exports.onProductCreated = onDocumentCreated("products/{productId}", async (event) => {
  // No v2, o dado está em event.data
  const product = event.data.data();
  const productId = event.params.productId;
  
  if (!product) return null;

  const payload = {
    notification: {
      title: "🛍️ Novo produto disponível!",
      body: `${product.name} acaba de chegar! Confira agora as novidades.`,
      image: product.imageUrl || "",
    },
    data: {
      url: `/product/${productId}`,
    }
  };

  try {
    const tokensSnapshot = await admin.firestore()
      .collection("users_push_tokens")
      .get();

    if (tokensSnapshot.empty) {
      console.log("Nenhum token encontrado.");
      return null;
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.id);
    console.log(`Enviando para ${tokens.length} dispositivos...`);

    const response = await admin.messaging().sendEachForMulticast({
      tokens: tokens,
      notification: payload.notification,
      data: payload.data,
    });

    console.log(`${response.successCount} mensagens enviadas com sucesso.`);

    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error.code;
          if (error === "messaging/registration-token-not-registered" || 
              error === "messaging/invalid-registration-token") {
            failedTokens.push(tokensSnapshot.docs[idx].ref.delete());
          }
        }
      });
      await Promise.all(failedTokens);
    }

    return null;
  } catch (error) {
    console.error("Erro ao enviar notificações:", error);
    return null;
  }
});
