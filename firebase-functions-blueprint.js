const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Trigger: Sempre que um novo produto é criado no Firestore.
 * Envia uma notificação push para todos os tokens registrados.
 */
exports.onProductCreated = functions.firestore
  .document('products/{productId}')
  .onCreate(async (snapshot, context) => {
    const product = snapshot.data();
    
    // Configuração da notificação
    const payload = {
      notification: {
        title: '🛍️ Novo produto disponível!',
        body: `${product.name} acaba de chegar! Confira agora as novidades.`,
        image: product.imageUrl || '',
        icon: '/icon.svg',
      },
      data: {
        url: `/product/${context.params.productId}`,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // Compatibilidade
      }
    };

    try {
      // 1. Buscar todos os tokens ativos
      const tokensSnapshot = await admin.firestore()
        .collection('users_push_tokens')
        .get();

      if (tokensSnapshot.empty) {
        console.log('Nenhum token encontrado.');
        return null;
      }

      const tokens = tokensSnapshot.docs.map(doc => doc.id);
      console.log(`Enviando para ${tokens.length} dispositivos...`);

      // 2. Enviar via multicast
      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        notification: payload.notification,
        data: payload.data,
      });

      console.log(`${response.successCount} mensagens enviadas com sucesso.`);

      // 3. Limpeza opcional: remover tokens que falharam permanentemente
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error.code;
            if (error === 'messaging/registration-token-not-registered' || 
                error === 'messaging/invalid-registration-token') {
              failedTokens.push(tokensSnapshot.docs[idx].ref.delete());
            }
          }
        });
        await Promise.all(failedTokens);
        console.log(`${failedTokens.length} tokens inválidos removidos.`);
      }

      return null;
    } catch (error) {
      console.error('Erro ao enviar notificações:', error);
      return null;
    }
  });
