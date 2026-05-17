import { toPng } from 'html-to-image';
import { Order } from '../types';

/**
 * Generates a PNG image of the order receipt.
 * @param elementId The ID of the element to capture (must be in the DOM)
 * @param fileName Optional filename for download
 */
export const captureReceiptImage = async (elementId: string, fileName?: string): Promise<string | null> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found.`);
    return null;
  }

  try {
    // Wait a bit for images to load if any
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 2, // High resolution
      backgroundColor: '#f9fafb', // Match gray-50
      imagePlaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN88B8AAugB+t/e3q8AAAAASUVORK5CYII=', // Gray fallback for CORS/broken images
      cacheBust: true,
    });

    if (fileName) {
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = dataUrl;
      link.click();
    }

    return dataUrl;
  } catch (err) {
    console.error('Error generating receipt image:', err);
    return null;
  }
};

/**
 * Shares the generated image via the native share API if available.
 */
export const shareReceiptImage = async (dataUrl: string, orderId: string) => {
  if (!navigator.share) {
    // Fallback: download the image
    const link = document.createElement('a');
    link.download = `recibo_pedido_${orderId.slice(-6)}.png`;
    link.href = dataUrl;
    link.click();
    return;
  }

  try {
    // Convert dataUrl to File object for sharing
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], `recibo_pedido_${orderId.slice(-6)}.png`, { type: 'image/png' });

    await navigator.share({
      files: [file],
      title: `Recibo Pedido #${orderId.slice(-6).toUpperCase()}`,
      text: `Segue o recibo do pedido #${orderId.slice(-6).toUpperCase()} realizado no Saldo da Kricia.`,
    });
  } catch (err) {
    console.error('Error sharing receipt:', err);
    // Fallback to download
    const link = document.createElement('a');
    link.download = `recibo_pedido_${orderId.slice(-6)}.png`;
    link.href = dataUrl;
    link.click();
  }
};

/**
 * WhatsApp fallback link generator (only text, cannot attach image directly via URL)
 */
export const getWhatsAppShareLink = (orderId: string, clientPhone?: string) => {
  const phone = clientPhone ? clientPhone.replace(/\D/g, '') : '';
  const text = encodeURIComponent(`Olá! Segue o comprovante do seu pedido #${orderId.slice(-6).toUpperCase()}.`);
  return `https://wa.me/${phone ? '55' + phone : ''}?text=${text}`;
};
