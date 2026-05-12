import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Printer, 
  ArrowLeft, 
  Image as ImageIcon,
  ShoppingCart,
  Download,
  WhatsappLogo
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';

interface Product {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  availableQuantity: number;
  category: string;
  imageUrl: string;
  status: 'active' | 'inactive';
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();
  const catalogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const qProducts = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubProducts = onSnapshot(qProducts, (snap) => {
      const prods = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(prods.filter(p => p.status === 'active'));
      setLoading(false);
    });
    return () => unsubProducts();
  }, []);

  const productsPerPage = 6;
  const pages = [];
  for (let i = 0; i < products.length; i += productsPerPage) {
    pages.push(products.slice(i, i + productsPerPage));
  }

  const handleDownloadPDF = async () => {
    if (!catalogRef.current) return;
    setGenerating(true);

    const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    const styleBackups = styleElements.map(el => ({
      el, parent: el.parentNode, next: el.nextSibling
    }));
    styleElements.forEach(el => el.remove());

    try {
      const opt = {
        margin: 0,
        filename: `CATALOGO_ATACADO_KRICIA.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, width: 1122, windowWidth: 1122 },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const, compress: true },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      await new Promise(r => setTimeout(r, 800));
      await html2pdf().from(catalogRef.current).set(opt).save();
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar o catálogo.');
    } finally {
      styleBackups.forEach(({ el, parent, next }) => { parent?.insertBefore(el, next); });
      setGenerating(false);
    }
  };

  const getImageUrl = (url: string) => {
    if (!url) return '';
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=400&h=400&fit=cover&output=jpg`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mb-4" />
        <p className="text-slate-600 font-medium">Sincronizando Catálogo...</p>
      </div>
    );
  }

  const globalFont = "'Inter', system-ui, -apple-system, sans-serif";

  return (
    <div className="min-h-screen bg-slate-100 pb-20" style={{ fontFamily: globalFont }}>
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin/products')} className="p-2 hover:bg-slate-100 rounded-full">
              <ArrowLeft size={20} weight="bold" />
            </button>
            <h1 className="text-lg font-black text-slate-900 uppercase">Atacado Saldo da Kricia</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={() => window.print()} className="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-xs font-bold uppercase border border-slate-200">
              <Printer size={18} className="inline mr-2" /> Imprimir
            </button>
            <button onClick={handleDownloadPDF} disabled={generating} className="px-6 py-2 bg-pink-600 text-white rounded-lg text-xs font-bold uppercase shadow-lg disabled:opacity-50">
              {generating ? 'GERANDO...' : <><Download size={18} className="inline mr-2" /> Baixar PDF</>}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto p-12 flex flex-col items-center gap-12 print:p-0">
        <div ref={catalogRef} style={{ width: '1122px', backgroundColor: 'transparent' }}>
          
          {/* COVER PAGE */}
          <section style={{
            width: '1122px', height: '791px', backgroundColor: '#0f172a', color: 'white',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            position: 'relative', overflow: 'hidden', pageBreakAfter: 'always', fontFamily: globalFont
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />
            <div style={{ backgroundColor: '#ec4899', padding: '6px 20px', borderRadius: '100px', fontSize: '14px', fontWeight: '900', letterSpacing: '4px', marginBottom: '30px', textTransform: 'uppercase' }}>Catálogo Oficial de Saldo</div>
            <h1 style={{ fontSize: '80px', fontWeight: '900', letterSpacing: '-4px', margin: 0, textTransform: 'uppercase', textAlign: 'center', lineHeight: 0.9 }}>
              ATACADO SALDO DA<br /><span style={{ color: '#ec4899' }}>KRICIA</span>
            </h1>
            <div style={{ width: '160px', height: '4px', backgroundColor: 'white', margin: '40px 0' }} />
            <p style={{ fontSize: '24px', fontWeight: '400', color: '#94a3b8', letterSpacing: '8px', textTransform: 'uppercase' }}>Gestão de Inventário</p>
            <div style={{ marginTop: '60px', textAlign: 'center' }}>
               <p style={{ fontSize: '18px', fontWeight: '700' }}>{format(new Date(), "dd/MM/yyyy")} — {format(new Date(), "HH:mm")}</p>
            </div>
          </section>

          {/* PRODUCT PAGES */}
          {pages.map((pageProducts, pageIdx) => (
            <section key={pageIdx} style={{
              width: '1122px', height: '791px', backgroundColor: 'white', padding: '30px 40px', position: 'relative',
              pageBreakAfter: pageIdx === pages.length - 1 ? 'auto' : 'always', 
              display: 'flex', flexDirection: 'column', boxSizing: 'border-box', fontFamily: globalFont
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid #0f172a', paddingBottom: '12px', marginBottom: '20px' }}>
                <div>
                   <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: 0, textTransform: 'uppercase' }}>Saldo de Estoque</h2>
                   <p style={{ fontSize: '11px', color: '#ec4899', fontWeight: '800', marginTop: '2px' }}>PÁGINA {pageIdx + 1} DE {pages.length}</p>
                </div>
                <p style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>ATACADO SALDO DA KRICIA</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(3, 1fr)', gap: '15px', flex: 1, marginBottom: '40px' }}>
                {pageProducts.map((product) => (
                  <div key={product.id} style={{
                    border: '1px solid #e2e8f0', borderRadius: '16px', padding: '12px 15px', display: 'flex', gap: '20px',
                    backgroundColor: '#ffffff', pageBreakInside: 'avoid', boxSizing: 'border-box', height: '180px'
                  }}>
                    <div style={{ width: '130px', height: '130px', borderRadius: '12px', backgroundColor: '#f8fafc', overflow: 'hidden', flexShrink: 0, border: '1px solid #f1f5f9' }}>
                      {product.imageUrl ? (
                        <img src={getImageUrl(product.imageUrl)} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><ImageIcon size={32} /></div>
                      )}
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                          <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', margin: 0, textTransform: 'uppercase', maxWidth: '190px', lineHeight: '1.2' }}>{product.name}</h3>
                          <p style={{ fontSize: '18px', fontWeight: '900', color: '#ec4899', margin: 0 }}>R$ {(product.unitPrice || 0).toFixed(2)}</p>
                        </div>
                        <p style={{ fontSize: '10px', color: '#475569', lineHeight: 1.3, margin: 0, whiteSpace: 'pre-wrap', maxHeight: '45px', overflow: 'hidden' }}>
                          {product.description || 'Descrição disponível no portal.'}
                        </p>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px' }}>
                        <div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '13px', fontWeight: '900', color: (product.availableQuantity || 0) > 0 ? '#059669' : '#dc2626' }}>{product.availableQuantity || 0} un.</span>
                              <span style={{ fontSize: '8px', fontWeight: '900', color: 'white', backgroundColor: (product.availableQuantity || 0) > 0 ? '#059669' : '#dc2626', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                {(product.availableQuantity || 0) > 0 ? 'Disponível' : 'Esgotado'}
                              </span>
                           </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <a href={`https://wa.me/5521980214244?text=${encodeURIComponent(`Olá! Quero o item: *${product.name}*`)}`} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', backgroundColor: '#25D366', color: 'white', borderRadius: '10px', fontSize: '10px', fontWeight: '900', textDecoration: 'none', textTransform: 'uppercase' }}>WhatsApp</a>
                          <a href="/" style={{ padding: '6px 12px', backgroundColor: '#0f172a', color: 'white', borderRadius: '8px', fontSize: '10px', fontWeight: '900', textDecoration: 'none', textTransform: 'uppercase' }}>Site</a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 'auto', marginBottom: '30px', paddingTop: '15px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>
                <span>Atacado Saldo da Kricia — (21) 98021-4244</span>
                <span>Documento Oficial de Saldo e Inventário</span>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
